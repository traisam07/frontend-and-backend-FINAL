/**
 * CORS allow-list.
 *
 * The Vite dev server (`http://localhost:5173`) and the Vite preview server
 * (`http://localhost:4173`) are the two origins the PulseMind frontend is actually served from in
 * development, and neither was listed here. Their absence is what made the first real request from
 * `pnpm dev` fail the CORS preflight — registered as **G-49** in `docs/spec/open-questions.md`, and
 * fixed by the two entries below.
 *
 * `127.0.0.1` is a DIFFERENT origin from `localhost` as far as the browser is concerned, so both
 * spellings are listed rather than assuming a developer types one of them.
 *
 * Extra origins can be supplied at deploy time through `CORS_ORIGINS` (comma-separated) without
 * editing this file.
 */

const allowedOrigins = [
    'http://localhost:5173', // Vite dev server — the PulseMind frontend (G-49)
    'http://127.0.0.1:5173',
    'http://localhost:4173', // Vite preview server
    'http://127.0.0.1:4173',
    'http://127.0.0.1:5500',
    'http://localhost:3500',
    'http://localhost:3000'
];

const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

module.exports = [...new Set([...allowedOrigins, ...extra])];
