# PulseMind handoff conformance index

One row per stated requirement in `docs/Handoff.pdf` that the code does **not** follow as written,
and where the reasoning for it lives. Everything not listed here follows the handoff as written, as
of 2026-08-25.

**This file states no reasoning of its own, deliberately.** It is an index, not a record: every row
points at the file that owns the fact, so this file cannot contradict its sources (`docs/LESSONS.md`
L-075, L-079). If a row here disagrees with the file it points at, the file wins and the row is a
bug. One row is marked as owned here, and it is the exception that proves the rule.

**For the full walk with `file:line` evidence, run the `handoff-conformance-checker` agent.** It reads
the code rather than remembering it, so it is current in a way this file cannot be.

---

## Overridden - a handoff requirement deliberately reversed or dropped

| Handoff | What changed | Where the reasoning lives |
|---|---|---|
| §3, §7 | Clicking a patient card opens Patient Detail instead of selecting | `spec/screens.md` §8 RULE ONE, §7, §9 item 4; `spec/open-questions.md` **D-22** |
| §3 | Selected-patient panel removed: 60-minute history, latest score, primary driver, `Open patient detail` | `spec/screens.md` §3.2 OV-5; **D-22** |
| §3 | Overview summary removed: pending-review count and connected-source count | `spec/screens.md` §3.2 OV-2 |
| §3 | `All` filter expressed as toggling the active filter off rather than its own control | `spec/screens.md` §3.2 OV-3 |
| §6 | `Selected item`, patient half: no selection exists on Patient Overview | `spec/ui-states.md` S-16, S-17 (both retired); **D-22** |
| §9 | Checklist item 2's `selection` clause not implemented | **D-22** |

## No data - the handoff asks for it and the schema has no field; the screen renders an explicit unknown

| Handoff | Missing input | Where the reasoning lives |
|---|---|---|
| §1 | The HTML prototype named as the visual reference was never delivered; the visual system is `[HARNESS]` | `CLAUDE.md` §2 |
| §3, §4 | Device and data-source entity, for OV-6 and the drawer's connected-devices region | `spec/open-questions.md` **G-05**; `spec/ui-states.md` S-36 |
| §4 | Parameter `description` in the PD-10 table | **G-02** |
| §4 | Assessment-refresh field; the reading time is shown and labelled as such | **G-22** |
| §9 | Checklist item 9's agreed data contract: two schemas exist and differ | **G-48**; `spec/data-contract.md` §4.5 |

## Unsourced - implemented with numbers §8 said must not be invented

| Handoff | What was invented | Where the reasoning lives |
|---|---|---|
| §8 | `RISK_SCORE_DOMAIN`, `RISK_THRESHOLDS` (40 / 65 / 85), `CHART_RANGE` | `CHANGELOG.md`, "Data-contract overrides"; **G-12**, **G-55** |

## Stale - shipped behaviour and in-app documentation disagree

| Handoff | What disagrees | Where the reasoning lives |
|---|---|---|
| §3, §7 | `front-end/src/routes/guide/+page.svelte` still describes selecting a card and pressing `Open patient detail`, reversed by **D-22** | **Owned here.** Recorded nowhere else. Fix the route or raise it as a register row, then delete this line. |

---

## Adding a row

A row belongs here only when the code diverges from a requirement the handoff STATES. A `[HARNESS]`
invention filling a gap the handoff left open is not a divergence: that is `spec/open-questions.md`.
Write the pointer, never the explanation. If you find yourself explaining, the explanation belongs
in the file the row points at.
