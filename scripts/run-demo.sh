#!/usr/bin/env bash
# PulseMind — bring the whole stack up locally and expose it through two Cloudflare Quick Tunnels.
#
# LIVES IN THE REPO ON PURPOSE. It was written in a session scratchpad, which is wiped between
# sessions; CLAUDE.md section 4.1 now requires this script to be re-run after every update, and a
# standing rule cannot point at a path that disappears.
#
#   ./scripts/run-demo.sh          bring everything up and print the URLs
#   ./scripts/run-demo.sh down     stop the tunnels and both servers
#
# THE HOSTNAME CHANGES ON EVERY RESTART. A Quick Tunnel is allocated a random
# `<random>.trycloudflare.com`, so every restart hands out a NEW public URL — old links die, and any
# passkey registered against the previous hostname stops working, because WebAuthn binds a
# credential to the registrable domain (`PULSEMIND_RP_ID` below). Password and TOTP sign-in are
# unaffected. Announce the new URL after every restart; never repeat the previous one from memory.
#
#   backend   :3600  ->  https://<random>.trycloudflare.com   (the assessment service)
#   frontend  :5173  ->  https://<random>.trycloudflare.com   (the UI)
#
# The order matters. `cloudflared` allocates its hostname immediately, before the local port is
# listening, so BOTH tunnels are started first and their URLs are read back. Only then can the
# backend be started with the frontend's public origin in `CORS_ORIGINS`, `PULSEMIND_RP_ID` and
# `PULSEMIND_WEBAUTHN_ORIGINS`. Starting the servers first would leave a chicken-and-egg: the
# backend cannot be configured without the frontend's hostname.
#
# The frontend is NOT pointed at the backend's public URL. `PUBLIC_PULSEMIND_API_BASE=/api` puts the
# service under the app's own origin through the Vite proxy (`PULSEMIND_PROXY_TARGET`), because two
# tunnels are two registrable domains and that makes the session cookie THIRD-PARTY — Safari drops
# it, sign-in returns 200, and the next request is anonymous (**G-52**, `docs/LESSONS.md` L-071).
#
# `pnpm dev` rather than `pnpm preview`: `$env/dynamic/public` is read at request time by the dev
# server, and a `vite preview` of this SPA build resolves it to empty (verified, not assumed), which
# would silently put the board back on fixtures while claiming to be live.

set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG="$ROOT/scripts/.demo-logs"
mkdir -p "$LOG"

say() { printf '\n\033[1m== %s\033[0m\n' "$*"; }

cleanup() {
  say "stopping"
  for p in "$LOG"/*.pid; do [ -f "$p" ] && kill "$(cat "$p")" 2>/dev/null; done
}

case "${1:-up}" in
  down)
    cleanup
    pkill -f "cloudflared tunnel" 2>/dev/null
    pkill -f "pulsemind-backend" 2>/dev/null
    exit 0
    ;;
esac

# ---------------------------------------------------------------------------------------------
# 1. Tunnels first — they hand back a hostname before anything is listening behind them.
# ---------------------------------------------------------------------------------------------
say "starting tunnels"
: > "$LOG/tunnel-front.log"
: > "$LOG/tunnel-back.log"

cloudflared tunnel --url http://localhost:5173 --no-autoupdate > "$LOG/tunnel-front.log" 2>&1 &
echo $! > "$LOG/tunnel-front.pid"
cloudflared tunnel --url http://localhost:3600 --no-autoupdate > "$LOG/tunnel-back.log" 2>&1 &
echo $! > "$LOG/tunnel-back.pid"

read_url() {
  local file="$1" i url
  for i in $(seq 1 90); do
    url=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$file" 2>/dev/null | head -1)
    [ -n "$url" ] && { echo "$url"; return 0; }
    sleep 1
  done
  return 1
}

URL_FRONT=$(read_url "$LOG/tunnel-front.log") || { echo "frontend tunnel failed"; tail -20 "$LOG/tunnel-front.log"; exit 1; }
URL_BACK=$(read_url "$LOG/tunnel-back.log")  || { echo "backend tunnel failed";  tail -20 "$LOG/tunnel-back.log";  exit 1; }

echo "  frontend -> $URL_FRONT"
echo "  backend  -> $URL_BACK"

# ---------------------------------------------------------------------------------------------
# 2. Backend, with the frontend's PUBLIC origin allowed. Without this the browser's preflight from
#    the tunnelled UI is refused — the same class of failure G-49 recorded for localhost:5173.
# ---------------------------------------------------------------------------------------------
# :3600, not :3500. The test suite starts its OWN backend on 3500 and expects it to be fresh —
# the sign-in throttle is in-process, so a long-lived demo sharing that port accumulates
# failed-attempt counters and eventually locks out the tests that assert the failure paths.
say "starting backend (:3600, in-process MongoDB, seeded, /auth live)"
cd "$ROOT/back-end"

# WebAuthn is bound to the FRONTEND's domain, not this service's. `RP_ID` is the registrable domain
# of the page the user is on — a host, never a URL and never a port — and getting it wrong fails in
# the browser before any request arrives here, with an error nothing on the server can explain.
RP_HOST="${URL_FRONT#https://}"

# The two tunnels are DIFFERENT registrable domains, so the session cookie is cross-site and needs
# `SameSite=None; Secure`. A browser configured to block third-party cookies will still refuse it
# — that limitation is G-52, and it is the reason a same-domain deployment is the recommendation.
PORT=3600 PULSEMIND_MEMORY_DB=1 PULSEMIND_SEED_ON_BOOT=1 CORS_ORIGINS="$URL_FRONT" \
  PULSEMIND_RP_ID="$RP_HOST" \
  PULSEMIND_RP_NAME="PulseMind" \
  PULSEMIND_WEBAUTHN_ORIGINS="$URL_FRONT" \
  PULSEMIND_SESSION_SECRET="${PULSEMIND_SESSION_SECRET:-demo-session-secret-$(date +%s)-not-for-production}" \
  PULSEMIND_PENDING_SECRET="${PULSEMIND_PENDING_SECRET:-demo-pending-secret-$(date +%s)-not-for-production}" \
  node server.js > "$LOG/backend.log" 2>&1 &
echo $! > "$LOG/backend.pid"

for i in $(seq 1 120); do
  if curl_out=$(node -e "fetch('http://localhost:3600/health').then(r=>r.json()).then(j=>{if(j.database==='connected'){console.log('ok');process.exit(0)}process.exit(1)}).catch(()=>process.exit(1))" 2>/dev/null); then
    break
  fi
  sleep 1
done
echo "  backend health: $(node -e "fetch('http://localhost:3600/health').then(r=>r.json()).then(j=>console.log(JSON.stringify(j))).catch(e=>console.log('unreachable'))" 2>/dev/null)"

# ---------------------------------------------------------------------------------------------
# 3. Frontend, pointed at the backend's PUBLIC url, so a browser anywhere can reach it.
# ---------------------------------------------------------------------------------------------
say "starting frontend (:5173, live source)"
cd "$ROOT/front-end"
# Sign-in is ENFORCED here, unlike the default (D-16). This is a public URL: a login screen that
# guarded nothing would be worse than no login screen, because it would imply protection.
# `/api`, NOT the backend's own hostname. Two tunnels are two registrable domains, which makes the
# session cookie third-party — Safari refuses it by default, so sign-in returned 200 and the app was
# anonymous on the next request (G-52). The Vite proxy puts the service under this app's own origin,
# so the cookie is first-party and there is no CORS preflight at all.
PULSEMIND_PROXY_TARGET=http://localhost:3600 \
  PUBLIC_PULSEMIND_DATA_SOURCE=http PUBLIC_PULSEMIND_API_BASE=/api \
  PUBLIC_PULSEMIND_REQUIRE_AUTH=true \
  pnpm dev --port 5173 --host 0.0.0.0 > "$LOG/frontend.log" 2>&1 &
echo $! > "$LOG/frontend.pid"

for i in $(seq 1 90); do
  node -e "fetch('http://localhost:5173/patients').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null && break
  sleep 1
done

say "up"
cat <<EOF
  UI            $URL_FRONT/patients
  API           $URL_FRONT/api/patient/all   (same origin, through the app's proxy)
  API direct    $URL_BACK/patient/all
  health        $URL_BACK/health

  local UI      http://localhost:5173/patients
  local API     http://localhost:3600/patient/all

  logs          $LOG
  stop          ./scripts/run-demo.sh down

  SIGN IN       clinician  ·  password only
                oncall     ·  password + 6-digit code  (run: npm run demo:code, in back-end/)
                viewer     ·  password only, read-only account
                password   PulseMind-demo-2026

  Passkeys can be registered from Account & security once signed in; they bind to
  $URL_FRONT and stop working when the tunnel hostname changes.

  NOTE: sign-in is ENFORCED on this URL, and the credentials above are PUBLISHED. It serves a
  synthetic 30-patient sample unit and is a demonstration, never a route to real patients.
  /patient/** on the API remains unauthenticated (G-46) — the gate is on the UI.
EOF

echo "$URL_FRONT" > "$LOG/url-front.txt"
echo "$URL_BACK" > "$LOG/url-back.txt"
