/**
 * PulseMind — the colour engine.
 *
 * Every contrast ratio and every colour-vision-deficiency figure in this project is COMPUTED by this
 * file. Nothing in the token stack is estimated, and nothing is eyeballed: the design-system skill
 * requires a measured ledger, and open questions **D-01** (risk-band colour values) and **D-02**
 * (redundant encoding channels) are answered with numbers or not at all.
 *
 * It is a library. `palette.mjs` searches with it and `build-tokens.mjs` emits with it.
 *
 * PIPELINE, in the order the skill specifies:
 *   oklch -> OKLab -> linear sRGB -> gamut-map by chroma reduction -> 8-bit sRGB
 *        -> WCAG relative luminance -> (L1 + 0.05) / (L2 + 0.05)
 *
 * CVD SIMULATION uses the Machado, Oliveira & Fernandes (2009) matrices at severity 1.0, applied in
 * LINEAR RGB. They are chosen over the older Viénot/Brettel pair because they are defined for all
 * three dichromacies on one basis, which is what lets a single ΔE floor apply across protanopia,
 * deuteranopia and tritanopia rather than only the red-green pair the previous palette was tested
 * against.
 *
 * SEPARATION is CIEDE2000 in CIELAB under D65. ΔE2000 rather than ΔE76 because the older formula
 * badly overstates differences in the blue region, which is exactly where a risk ramp's "Low" end
 * tends to sit.
 */

/* ------------------------------------------------------------------------------------------------
 * oklch -> sRGB
 * ---------------------------------------------------------------------------------------------- */

/** oklch (L 0..1, C, H degrees) -> linear-light sRGB, possibly out of gamut. */
export function oklchToLinearRgb(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const inGamut = ([r, g, b]) =>
  r >= -1e-6 && r <= 1 + 1e-6 && g >= -1e-6 && g <= 1 + 1e-6 && b >= -1e-6 && b <= 1 + 1e-6;

/**
 * Gamut-map by reducing chroma, holding L and H. This is what a browser does with an out-of-gamut
 * `oklch()`, so the hex below is what actually paints — which is the whole point of measuring the
 * mapped value rather than the authored one.
 */
export function gamutMap(L, C, H) {
  if (inGamut(oklchToLinearRgb(L, C, H))) return { L, C, H, clipped: false };
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToLinearRgb(L, mid, H))) lo = mid;
    else hi = mid;
  }
  return { L, C: lo, H, clipped: true };
}

const encode = (x) => {
  const c = Math.min(1, Math.max(0, x));
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
};
const decode = (x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));

/** oklch -> `{ hex, rgb (0..255), linear }`, gamut-mapped exactly as a browser would. */
export function oklchToSrgb(L, C, H) {
  const mapped = gamutMap(L, C, H);
  const lin = oklchToLinearRgb(mapped.L, mapped.C, mapped.H);
  const enc = lin.map(encode);
  const rgb = enc.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255));
  const hex = `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
  // Re-derive linear from the QUANTISED 8-bit value: that is the colour on screen.
  const linear = rgb.map((v) => decode(v / 255));
  return { hex, rgb, linear, clipped: mapped.clipped };
}

/**
 * Accepts `#rrggbb` and returns the same shape as `oklchToSrgb`.
 *
 * Exists because a BRAND colour arrives as a hex and must ship as that exact hex — round-tripping it
 * through oklch and back would move it by a unit or two, which is not a colour someone chose. The
 * ledger still measures it like every other value.
 */
export function parseHex(text) {
  const m = /^#?([0-9a-f]{6})$/i.exec(text.trim());
  if (!m) throw new Error(`not a 6-digit hex colour: ${text}`);
  const rgb = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  return {
    hex: `#${m[1].toLowerCase()}`,
    rgb,
    linear: rgb.map((v) => decode(v / 255)),
    clipped: false,
  };
}

/** Accepts `oklch(L C H)` / `oklch(L C H / A)` and returns the same shape. Alpha is ignored. */
export function parseOklch(text) {
  const m = /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(text);
  if (!m) throw new Error(`not an oklch() value: ${text}`);
  return oklchToSrgb(Number(m[1]), Number(m[2]), Number(m[3]));
}

/* ------------------------------------------------------------------------------------------------
 * WCAG contrast
 * ---------------------------------------------------------------------------------------------- */

export function relativeLuminance(linear) {
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/** (L1 + 0.05) / (L2 + 0.05), rounded to two decimals the way a ledger row is written. */
export function contrast(a, b) {
  const la = relativeLuminance(a.linear);
  const lb = relativeLuminance(b.linear);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/**
 * Composite a colour with alpha over an opaque backdrop, in LINEAR light, so a scrim or a
 * translucent surface can be measured against what is actually behind it rather than guessed at.
 */
export function over(fg, alpha, bg) {
  const linear = fg.linear.map((v, i) => v * alpha + bg.linear[i] * (1 - alpha));
  const rgb = linear.map((v) => Math.round(Math.min(1, Math.max(0, encode(v))) * 255));
  return { hex: `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`, rgb, linear };
}

/* ------------------------------------------------------------------------------------------------
 * Colour-vision deficiency
 * ---------------------------------------------------------------------------------------------- */

/** Machado, Oliveira & Fernandes (2009), severity 1.0, applied to LINEAR RGB. */
const CVD = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export const CVD_KINDS = Object.keys(CVD);

export function simulateCvd(colour, kind) {
  const m = CVD[kind];
  if (!m) throw new Error(`unknown CVD kind: ${kind}`);
  const linear = m.map((row) =>
    Math.min(
      1,
      Math.max(
        0,
        row[0] * colour.linear[0] + row[1] * colour.linear[1] + row[2] * colour.linear[2],
      ),
    ),
  );
  const rgb = linear.map((v) => Math.round(Math.min(1, Math.max(0, encode(v))) * 255));
  return { hex: `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`, rgb, linear };
}

/* ------------------------------------------------------------------------------------------------
 * CIELAB + CIEDE2000
 * ---------------------------------------------------------------------------------------------- */

const WHITE_D65 = [0.95047, 1.0, 1.08883];

export function toLab(colour) {
  const [r, g, b] = colour.linear;
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
  const fx = f(x / WHITE_D65[0]);
  const fy = f(y / WHITE_D65[1]);
  const fz = f(z / WHITE_D65[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** CIEDE2000 between two colours. Convenience wrapper over `deltaE2000FromLab`. */
export function deltaE2000(c1, c2) {
  return deltaE2000FromLab(toLab(c1), toLab(c2));
}

/**
 * CIEDE2000 between two CIELAB triples. The standard formulation; kL = kC = kH = 1.
 *
 * Split out from `deltaE2000` so a search can cache Lab once per candidate: the palette solver runs
 * this millions of times, and re-deriving Lab from oklch inside the loop is what made the first
 * version of the search fail to terminate.
 */
export function deltaE2000FromLab([L1, a1, b1], [L2, a2, b2]) {
  const avgLp = (L1 + L2) / 2;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const avgC = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const avgCp = (C1p + C2p) / 2;

  const hp = (a, b) => {
    if (a === 0 && b === 0) return 0;
    const h = (Math.atan2(b, a) * 180) / Math.PI;
    return h >= 0 ? h : h + 360;
  };
  const h1p = hp(a1p, b1);
  const h2p = hp(a2p, b2);

  let avgHp;
  if (C1p * C2p === 0) avgHp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) avgHp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) avgHp = (h1p + h2p + 360) / 2;
  else avgHp = (h1p + h2p - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(((avgHp - 30) * Math.PI) / 180) +
    0.24 * Math.cos((2 * avgHp * Math.PI) / 180) +
    0.32 * Math.cos(((3 * avgHp + 6) * Math.PI) / 180) -
    0.2 * Math.cos(((4 * avgHp - 63) * Math.PI) / 180);

  let deltahp;
  if (C1p * C2p === 0) deltahp = 0;
  else if (Math.abs(h2p - h1p) <= 180) deltahp = h2p - h1p;
  else if (h2p <= h1p) deltahp = h2p - h1p + 360;
  else deltahp = h2p - h1p - 360;

  const deltaLp = L2 - L1;
  const deltaCp = C2p - C1p;
  const deltaHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((deltahp * Math.PI) / 360);

  const SL = 1 + (0.015 * Math.pow(avgLp - 50, 2)) / Math.sqrt(20 + Math.pow(avgLp - 50, 2));
  const SC = 1 + 0.045 * avgCp;
  const SH = 1 + 0.015 * avgCp * T;

  const deltaTheta = 30 * Math.exp(-Math.pow((avgHp - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
  const RT = -RC * Math.sin((2 * deltaTheta * Math.PI) / 180);

  return Math.sqrt(
    Math.pow(deltaLp / SL, 2) +
      Math.pow(deltaCp / SC, 2) +
      Math.pow(deltaHp / SH, 2) +
      RT * (deltaCp / SC) * (deltaHp / SH),
  );
}

/**
 * The worst pairwise CIEDE2000 across a set, under normal vision AND all three dichromacies.
 *
 * This is the number D-02 turns on. The previous ramp scored 2.3 under protanopia against a floor of
 * 15 — which is to say two adjacent risk BANDS were, to a protanope, the same colour. Reporting the
 * minimum over all four vision models rather than normal vision alone is the whole point: a ramp
 * that separates well for trichromats and collapses for dichromats is the failure being measured.
 */
export function separationReport(entries) {
  const models = ['normal', ...CVD_KINDS];
  const report = {};
  for (const model of models) {
    const rendered = entries.map(([name, colour]) => [
      name,
      model === 'normal' ? colour : simulateCvd(colour, model),
    ]);
    const pairs = [];
    for (let i = 0; i < rendered.length; i += 1) {
      for (let j = i + 1; j < rendered.length; j += 1) {
        pairs.push({
          pair: `${rendered[i][0]} vs ${rendered[j][0]}`,
          deltaE: Math.round(deltaE2000(rendered[i][1], rendered[j][1]) * 10) / 10,
        });
      }
    }
    pairs.sort((a, b) => a.deltaE - b.deltaE);
    report[model] = { min: pairs[0].deltaE, worst: pairs[0].pair, pairs };
  }
  report.overallMin = Math.min(...models.map((m) => report[m].min));
  return report;
}
