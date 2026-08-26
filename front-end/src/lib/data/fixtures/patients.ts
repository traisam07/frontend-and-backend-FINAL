// src/lib/data/fixtures/patients.ts
//
// GENERATED — do not edit by hand. Run `node scripts/build-fixtures.mjs` from `front-end/`.
// Source of truth: `back-end/seed/patients.json`, produced by `back-end/seed/generate.js`.
// The backend seeds MongoDB from those same bytes, so the fixture board and the live board are the
// same unit rather than two sets that happen to look alike.
//
// 30 patients / 96 readings, WIRE-SHAPED: snake_case keys spelled exactly as
// `docs/patientSchema.js` spells them — `underlying_condition` SINGULAR, `catch`, `last_measured` —
// and every instant an ISO-8601 string, never a `Date`.
//
// The set reaches every state `docs/spec/ui-states.md` says data can produce
// (`docs/spec/data-contract.md` section 4.4 rule 3): a null review status (S-09), a null risk level
// (S-05) and its S-38 unavailable run-length, a null risk score (S-35), a null `sufficient_data`
// (S-10's null branch) and an `insufficient` one, zero readings (U-11 / U-22), colliding
// `charttime`s (U-12), a null `charttime` (F-1 step 2), a `carried_forward` parameter with no
// `last_measured` (G-18), a `population_reference` parameter (S-14, and PM-7's panel), an
// unrecognised `source` string (S-15), a sufficient reading whose `explanation` is null (S-37), an
// empty `top_contributors` list, a first-place contribution tie (F-4), a run that reaches the oldest
// delivered reading (S-38's `≥ N` form), no comorbidities (S-26), a 26-minute gap inside the
// 60-minute window (F-2), and a patient with one plotted point (F-2's insufficient-history literal).
//
// It adds NO field the schema does not define (rule 2): there is no `unit`, no `description` and no
// `model_use` anywhere below. Those are G-01, G-02 and G-04, and they stay open.

/**
 * Typed `readonly unknown[]` on purpose. `readonly WirePatient[]` would assert by declaration the
 * conformance `parsePatientList` exists to prove at runtime, so a drifted fixture would fail
 * silently at render time instead of loudly at the boundary. `getFixturePatientSource` is the only
 * importer.
 */
export const WIRE_PATIENT_FIXTURES: readonly unknown[] = [
  {
    patient_id: 'PT-1001',
    age: 85,
    gender: 'M',
    weight: '88',
    height: '181',
    race: 'Hispanic or Latino',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Community-acquired pneumonia',
        catch: true,
      },
      {
        name: 'COPD',
        catch: true,
      },
      {
        name: 'Obstructive sleep apnoea',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:24:00.000Z',
        imputed_share: 0.254,
        documentation_share: 0.533,
        sufficient_data: 'sufficient',
        risk_score: 70.1,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Driving pressure',
            contribution: 0.628,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.504,
          },
          {
            name: 'SpO2',
            contribution: 0.428,
          },
          {
            name: 'FiO2',
            contribution: 0.299,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:08:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 437,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.39,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:09:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:18:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.6,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Driving pressure. Respiratory rate also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.248,
        documentation_share: 0.767,
        sufficient_data: 'sufficient',
        risk_score: 69.5,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'PEEP',
            contribution: 0.61,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.538,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.381,
          },
          {
            name: 'FiO2',
            contribution: 0.295,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 19,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 439,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.4,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.3,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'PEEP carries the largest contribution in this reading, followed by Plateau pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:32:00.000Z',
        imputed_share: 0.019,
        documentation_share: 0.844,
        sufficient_data: 'sufficient',
        risk_score: 85.1,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'PEEP',
            contribution: 0.643,
          },
          {
            name: 'FiO2',
            contribution: 0.504,
          },
          {
            name: 'Tidal volume',
            contribution: 0.397,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.273,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 419,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.39,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:23:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.4,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by PEEP. FiO2 also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:36:00.000Z',
        imputed_share: 0.213,
        documentation_share: 0.805,
        sufficient_data: 'sufficient',
        risk_score: 90.4,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.617,
          },
          {
            name: 'Driving pressure',
            contribution: 0.51,
          },
          {
            name: 'PEEP',
            contribution: 0.389,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.304,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 429,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.38,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:23:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.6,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is SpO2; Driving pressure follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.071,
        documentation_share: 0.657,
        sufficient_data: 'sufficient',
        risk_score: 87.7,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'Driving pressure',
            contribution: 0.626,
          },
          {
            name: 'PEEP',
            contribution: 0.532,
          },
          {
            name: 'FiO2',
            contribution: 0.428,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.272,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 19,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 449,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.44,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.1,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is Driving pressure; PEEP follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-1002',
    age: 46,
    gender: 'F',
    weight: '88',
    height: '179',
    race: 'White',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Post-operative — thoracic',
        catch: true,
      },
      {
        name: 'Hypertension',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:22:00.000Z',
        imputed_share: 0.332,
        documentation_share: 0.909,
        sufficient_data: 'sufficient',
        risk_score: 54.3,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Minute ventilation',
            contribution: 0.634,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.491,
          },
          {
            name: 'Driving pressure',
            contribution: 0.386,
          },
          {
            name: 'SpO2',
            contribution: 0.316,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 431,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.44,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 27,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.1,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:04:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Minute ventilation. Plateau pressure also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.092,
        documentation_share: 0.536,
        sufficient_data: 'sufficient',
        risk_score: 71.4,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.6,
          },
          {
            name: 'PEEP',
            contribution: 0.525,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.43,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.307,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 454,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'FiO2',
            value: 0.53,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:19:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.1,
            source: 'carried_forward',
            last_measured: '2026-08-16T13:59:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by SpO2. PEEP also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.358,
        documentation_share: 0.879,
        sufficient_data: 'sufficient',
        risk_score: 68.7,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Driving pressure',
            contribution: 0.611,
          },
          {
            name: 'Tidal volume',
            contribution: 0.503,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.375,
          },
          {
            name: 'SpO2',
            contribution: 0.309,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 410,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:17:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:08:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.5,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.1,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is Driving pressure; Tidal volume follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.358,
        documentation_share: 0.63,
        sufficient_data: 'sufficient',
        risk_score: 74.5,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.631,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.505,
          },
          {
            name: 'PEEP',
            contribution: 0.374,
          },
          {
            name: 'Driving pressure',
            contribution: 0.316,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 438,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:15:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.35,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:15:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.3,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Respiratory rate. Plateau pressure also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-1003',
    age: 78,
    gender: 'M',
    weight: '99',
    height: '176',
    race: 'Hispanic or Latino',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Interstitial lung disease',
        catch: true,
      },
      {
        name: 'Type 2 diabetes mellitus',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:26:00.000Z',
        imputed_share: 0.034,
        documentation_share: 0.639,
        sufficient_data: 'sufficient',
        risk_score: 51.4,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Driving pressure',
            contribution: 0.647,
          },
          {
            name: 'PEEP',
            contribution: 0.492,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.418,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.317,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 411,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.45,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.8,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:15:00.000Z',
          },
        ],
        explanation:
          'Driving pressure carries the largest contribution in this reading, followed by PEEP. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:33:00.000Z',
        imputed_share: 0.288,
        documentation_share: 0.563,
        sufficient_data: 'sufficient',
        risk_score: 51.6,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.625,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.522,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.382,
          },
          {
            name: 'FiO2',
            contribution: 0.31,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 395,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.48,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.1,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by SpO2. Respiratory rate also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.132,
        documentation_share: 0.542,
        sufficient_data: 'sufficient',
        risk_score: 53.4,
        risk_level: 'Medium',
        review_at: '2026-08-16T14:37:00.000Z',
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.616,
          },
          {
            name: 'FiO2',
            contribution: 0.497,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.397,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.266,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 452,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.38,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:14:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.7,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Respiratory rate, which has moved across the readings in this window. FiO2 contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-1004',
    age: 70,
    gender: 'Unknown',
    weight: '86',
    height: '153',
    race: 'White',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Obstructive sleep apnoea',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:16:00.000Z',
        imputed_share: 0.391,
        documentation_share: 0.532,
        sufficient_data: 'sufficient',
        risk_score: 29.7,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.595,
          },
          {
            name: 'SpO2',
            contribution: 0.484,
          },
          {
            name: 'Driving pressure',
            contribution: 0.374,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.311,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 426,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.47,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:08:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by FiO2, which has moved across the readings in this window. SpO2 contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:24:00.000Z',
        imputed_share: 0.187,
        documentation_share: 0.902,
        sufficient_data: 'sufficient',
        risk_score: 25.2,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'Driving pressure',
            contribution: 0.616,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.486,
          },
          {
            name: 'FiO2',
            contribution: 0.409,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.301,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 19,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:02:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 405,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.5,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'SpO2',
            value: 96,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Plateau pressure',
            value: 27,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.4,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Driving pressure, which has moved across the readings in this window. Plateau pressure contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:32:00.000Z',
        imputed_share: 0.327,
        documentation_share: 0.745,
        sufficient_data: 'sufficient',
        risk_score: 25.5,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.617,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.516,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.396,
          },
          {
            name: 'Tidal volume',
            contribution: 0.281,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 417,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:19:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.4,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Minute ventilation',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
        ],
        explanation:
          'SpO2 carries the largest contribution in this reading, followed by Plateau pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.15,
        documentation_share: 0.559,
        sufficient_data: 'sufficient',
        risk_score: 29.6,
        risk_level: 'Low',
        review_at: '2026-08-16T14:29:00.000Z',
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.591,
          },
          {
            name: 'PEEP',
            contribution: 0.527,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.371,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.285,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 450,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.54,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.3,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Tidal volume, which has moved across the readings in this window. PEEP contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-1005',
    age: 75,
    gender: 'Unknown',
    weight: '68',
    height: '171',
    race: 'Other',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Community-acquired pneumonia',
        catch: false,
      },
      {
        name: 'Atrial fibrillation',
        catch: false,
      },
      {
        name: 'Congestive heart failure',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:30:00.000Z',
        imputed_share: 0.09,
        documentation_share: 0.934,
        sufficient_data: 'sufficient',
        risk_score: 72.7,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Driving pressure',
            contribution: 0.639,
          },
          {
            name: 'FiO2',
            contribution: 0.499,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.402,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.262,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:19:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 412,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.47,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.5,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Driving pressure, which has moved across the readings in this window. FiO2 contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:35:00.000Z',
        imputed_share: 0.252,
        documentation_share: 0.761,
        sufficient_data: 'sufficient',
        risk_score: 55.1,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.647,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.519,
          },
          {
            name: 'FiO2',
            contribution: 0.383,
          },
          {
            name: 'Tidal volume',
            contribution: 0.264,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 426,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.46,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'SpO2',
            value: 96,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 27,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:18:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.3,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Plateau pressure. Minute ventilation also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.306,
        documentation_share: 0.583,
        sufficient_data: 'sufficient',
        risk_score: 53.2,
        risk_level: 'Medium',
        review_at: '2026-08-16T14:21:00.000Z',
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.629,
          },
          {
            name: 'Tidal volume',
            contribution: 0.487,
          },
          {
            name: 'Driving pressure',
            contribution: 0.414,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.288,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 426,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.43,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.3,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by SpO2, which has moved across the readings in this window. Tidal volume contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-1006',
    age: 47,
    gender: 'Unknown',
    weight: '96',
    height: '181',
    race: 'Other',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Interstitial lung disease',
        catch: true,
      },
      {
        name: 'Congestive heart failure',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:25:00.000Z',
        imputed_share: 0.144,
        documentation_share: 0.633,
        sufficient_data: 'sufficient',
        risk_score: 91.2,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.604,
          },
          {
            name: 'SpO2',
            contribution: 0.525,
          },
          {
            name: 'PEEP',
            contribution: 0.421,
          },
          {
            name: 'FiO2',
            contribution: 0.302,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 24,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:19:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 438,
            source: 'measured',
            last_measured: '2026-08-16T14:25:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:25:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.38,
            source: 'measured',
            last_measured: '2026-08-16T14:25:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'carried_forward',
            last_measured: '2026-08-16T13:59:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'measured',
            last_measured: '2026-08-16T14:25:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.8,
            source: 'carried_forward',
            last_measured: '2026-08-16T13:56:00.000Z',
          },
        ],
        explanation:
          'Respiratory rate carries the largest contribution in this reading, followed by SpO2. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:30:00.000Z',
        imputed_share: 0.073,
        documentation_share: 0.537,
        sufficient_data: 'sufficient',
        risk_score: 85.8,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'Minute ventilation',
            contribution: 0.643,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.532,
          },
          {
            name: 'Tidal volume',
            contribution: 0.42,
          },
          {
            name: 'Driving pressure',
            contribution: 0.301,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 458,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.36,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.1,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Minute ventilation. Respiratory rate also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:35:00.000Z',
        imputed_share: 0.073,
        documentation_share: 0.698,
        sufficient_data: 'sufficient',
        risk_score: 72.2,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.598,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.537,
          },
          {
            name: 'PEEP',
            contribution: 0.412,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.304,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 453,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.54,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:09:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.8,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
        ],
        explanation:
          'SpO2 carries the largest contribution in this reading, followed by Respiratory rate. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.297,
        documentation_share: 0.742,
        sufficient_data: 'sufficient',
        risk_score: 74.4,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.594,
          },
          {
            name: 'FiO2',
            contribution: 0.539,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.385,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.294,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 456,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'FiO2',
            value: 0.46,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.1,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Tidal volume. FiO2 also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-1007',
    age: 69,
    gender: 'F',
    weight: '93',
    height: '176',
    race: 'White',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Chronic kidney disease stage 3',
        catch: true,
      },
      {
        name: 'Interstitial lung disease',
        catch: true,
      },
      {
        name: 'Obstructive sleep apnoea',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:22:00.000Z',
        imputed_share: 0.329,
        documentation_share: 0.815,
        sufficient_data: 'sufficient',
        risk_score: 30,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.611,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.482,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.429,
          },
          {
            name: 'Tidal volume',
            contribution: 0.298,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 420,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.53,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:08:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.7,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
        ],
        explanation:
          'SpO2 carries the largest contribution in this reading, followed by Plateau pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:31:00.000Z',
        imputed_share: 0.27,
        documentation_share: 0.69,
        sufficient_data: 'sufficient',
        risk_score: 27.2,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.624,
          },
          {
            name: 'Tidal volume',
            contribution: 0.493,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.394,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.284,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:07:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 396,
            source: 'measured',
            last_measured: '2026-08-16T14:31:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:08:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.55,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:08:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:31:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:31:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:31:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.7,
            source: 'measured',
            last_measured: '2026-08-16T14:31:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Plateau pressure. Tidal volume also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.249,
        documentation_share: 0.836,
        sufficient_data: 'sufficient',
        risk_score: 53.1,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.626,
          },
          {
            name: 'FiO2',
            contribution: 0.487,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.411,
          },
          {
            name: 'Driving pressure',
            contribution: 0.283,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 446,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.35,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.6,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Respiratory rate, which has moved across the readings in this window. FiO2 contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-1008',
    age: 46,
    gender: 'F',
    weight: '67',
    height: '185',
    race: 'Other',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Congestive heart failure',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:16:00.000Z',
        imputed_share: 0.027,
        documentation_share: 0.659,
        sufficient_data: 'sufficient',
        risk_score: 51.6,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.64,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.504,
          },
          {
            name: 'SpO2',
            contribution: 0.389,
          },
          {
            name: 'FiO2',
            contribution: 0.3,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 437,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.41,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 27,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.1,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:02:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is Plateau pressure; Respiratory rate follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:22:00.000Z',
        imputed_share: 0.036,
        documentation_share: 0.895,
        sufficient_data: 'sufficient',
        risk_score: 26.4,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.632,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.536,
          },
          {
            name: 'Driving pressure',
            contribution: 0.421,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.267,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 402,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.45,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:03:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.6,
            source: 'carried_forward',
            last_measured: '2026-08-16T13:59:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is FiO2; Respiratory rate follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.195,
        documentation_share: 0.649,
        sufficient_data: 'sufficient',
        risk_score: 28.4,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.629,
          },
          {
            name: 'Driving pressure',
            contribution: 0.516,
          },
          {
            name: 'Tidal volume',
            contribution: 0.372,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.316,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 430,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:05:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:21:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.5,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:14:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:03:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.3,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'FiO2 carries the largest contribution in this reading, followed by Driving pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.244,
        documentation_share: 0.538,
        sufficient_data: 'sufficient',
        risk_score: 25.2,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.612,
          },
          {
            name: 'SpO2',
            contribution: 0.521,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.429,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.319,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:08:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 437,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.36,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:12:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.7,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is Plateau pressure; SpO2 follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.033,
        documentation_share: 0.565,
        sufficient_data: 'sufficient',
        risk_score: 27.9,
        risk_level: 'Low',
        review_at: '2026-08-16T14:13:00.000Z',
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.63,
          },
          {
            name: 'FiO2',
            contribution: 0.5,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.417,
          },
          {
            name: 'PEEP',
            contribution: 0.267,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 399,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.55,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.3,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is Plateau pressure; FiO2 follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-1009',
    age: 57,
    gender: 'F',
    weight: '88',
    height: '157',
    race: 'Asian',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Community-acquired pneumonia',
        catch: false,
      },
      {
        name: 'Obesity (BMI 34)',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.056,
        documentation_share: 0.701,
        sufficient_data: 'sufficient',
        risk_score: 72.3,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.647,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.529,
          },
          {
            name: 'FiO2',
            contribution: 0.427,
          },
          {
            name: 'SpO2',
            contribution: 0.292,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 413,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.55,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:12:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:03:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.7,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Tidal volume, which has moved across the readings in this window. Minute ventilation contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.062,
        documentation_share: 0.721,
        sufficient_data: 'sufficient',
        risk_score: 68.3,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.596,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.486,
          },
          {
            name: 'FiO2',
            contribution: 0.425,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.288,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 417,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.38,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 96,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:13:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.7,
            source: 'population_reference',
            last_measured: null,
          },
        ],
        explanation:
          'Plateau pressure carries the largest contribution in this reading, followed by Respiratory rate. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-1010',
    age: 82,
    gender: 'M',
    weight: '83',
    height: '157',
    race: 'Asian',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Interstitial lung disease',
        catch: true,
      },
      {
        name: 'Post-operative — thoracic',
        catch: false,
      },
      {
        name: 'Immunosuppressed — transplant recipient',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:22:00.000Z',
        imputed_share: 0.395,
        documentation_share: 0.729,
        sufficient_data: 'sufficient',
        risk_score: 90.7,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.599,
          },
          {
            name: 'Driving pressure',
            contribution: 0.52,
          },
          {
            name: 'SpO2',
            contribution: 0.41,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.264,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 444,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.5,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.4,
            source: 'carried_forward',
            last_measured: '2026-08-16T13:53:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Tidal volume, which has moved across the readings in this window. Driving pressure contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.009,
        documentation_share: 0.573,
        sufficient_data: 'sufficient',
        risk_score: 72.2,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Driving pressure',
            contribution: 0.624,
          },
          {
            name: 'Tidal volume',
            contribution: 0.534,
          },
          {
            name: 'SpO2',
            contribution: 0.39,
          },
          {
            name: 'PEEP',
            contribution: 0.265,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 464,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.42,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.6,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:14:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Driving pressure. Tidal volume also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.371,
        documentation_share: 0.617,
        sufficient_data: 'sufficient',
        risk_score: 52.8,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.634,
          },
          {
            name: 'Driving pressure',
            contribution: 0.505,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.411,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.273,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 459,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.48,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.7,
            source: 'population_reference',
            last_measured: null,
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is SpO2; Driving pressure follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.229,
        documentation_share: 0.67,
        sufficient_data: 'sufficient',
        risk_score: 51.6,
        risk_level: 'Medium',
        review_at: '2026-08-16T14:38:00.000Z',
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.602,
          },
          {
            name: 'Driving pressure',
            contribution: 0.513,
          },
          {
            name: 'Tidal volume',
            contribution: 0.388,
          },
          {
            name: 'SpO2',
            contribution: 0.301,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 448,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.46,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.1,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'FiO2 carries the largest contribution in this reading, followed by Driving pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2001',
    age: 76,
    gender: 'F',
    weight: '70',
    height: '175',
    race: 'Black or African American',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Obstructive sleep apnoea',
        catch: false,
      },
      {
        name: 'Congestive heart failure',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:26:00.000Z',
        imputed_share: 0.343,
        documentation_share: 0.96,
        sufficient_data: 'insufficient',
        risk_score: 69.7,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.597,
          },
          {
            name: 'Tidal volume',
            contribution: 0.537,
          },
          {
            name: 'SpO2',
            contribution: 0.378,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.28,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 431,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:17:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.38,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:05:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 21,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.8,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
        ],
        explanation: null,
        citations: null,
      },
      {
        charttime: '2026-08-16T14:33:00.000Z',
        imputed_share: 0.228,
        documentation_share: 0.78,
        sufficient_data: 'insufficient',
        risk_score: 68,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.649,
          },
          {
            name: 'Tidal volume',
            contribution: 0.513,
          },
          {
            name: 'Driving pressure',
            contribution: 0.415,
          },
          {
            name: 'PEEP',
            contribution: 0.275,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Tidal volume',
            value: 410,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.5,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:05:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.8,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
        ],
        explanation: null,
        citations: null,
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.007,
        documentation_share: 0.699,
        sufficient_data: 'insufficient',
        risk_score: 72.6,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Minute ventilation',
            contribution: 0.603,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.483,
          },
          {
            name: 'Driving pressure',
            contribution: 0.409,
          },
          {
            name: 'FiO2',
            contribution: 0.268,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 414,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.47,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 27,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.5,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation: null,
        citations: null,
      },
    ],
  },
  {
    patient_id: 'PT-2002',
    age: 62,
    gender: 'F',
    weight: '86',
    height: '187',
    race: 'White',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Obstructive sleep apnoea',
        catch: false,
      },
      {
        name: 'Community-acquired pneumonia',
        catch: true,
      },
      {
        name: 'Obesity (BMI 34)',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:24:00.000Z',
        imputed_share: 0.259,
        documentation_share: 0.813,
        sufficient_data: 'sufficient',
        risk_score: 25.7,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.648,
          },
          {
            name: 'SpO2',
            contribution: 0.52,
          },
          {
            name: 'Tidal volume',
            contribution: 0.429,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.281,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 19,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 460,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.39,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:07:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:04:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.5,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Plateau pressure, which has moved across the readings in this window. SpO2 contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:32:00.000Z',
        imputed_share: 0.176,
        documentation_share: 0.704,
        sufficient_data: 'sufficient',
        risk_score: 30,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'Driving pressure',
            contribution: 0.647,
          },
          {
            name: 'SpO2',
            contribution: 0.487,
          },
          {
            name: 'Tidal volume',
            contribution: 0.408,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.271,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 407,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.42,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.2,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:10:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is Driving pressure; SpO2 follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.373,
        documentation_share: 0.523,
        sufficient_data: 'sufficient',
        risk_score: 51.2,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.636,
          },
          {
            name: 'Driving pressure',
            contribution: 0.501,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.419,
          },
          {
            name: 'PEEP',
            contribution: 0.319,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Tidal volume',
            value: 425,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.36,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Minute ventilation',
            value: 8.3,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Tidal volume, which has moved across the readings in this window. Driving pressure contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2003',
    age: 81,
    gender: 'F',
    weight: '71',
    height: '155',
    race: 'Unknown',
    warning_status: {
      status: null,
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Immunosuppressed — transplant recipient',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:30:00.000Z',
        imputed_share: 0.284,
        documentation_share: 0.764,
        sufficient_data: 'sufficient',
        risk_score: 72.1,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.638,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.496,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.389,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.281,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 19,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 438,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:23:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.49,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:01:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.1,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
        ],
        explanation:
          'Tidal volume carries the largest contribution in this reading, followed by Plateau pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:35:00.000Z',
        imputed_share: 0.025,
        documentation_share: 0.938,
        sufficient_data: 'sufficient',
        risk_score: 84.6,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.597,
          },
          {
            name: 'Driving pressure',
            contribution: 0.536,
          },
          {
            name: 'SpO2',
            contribution: 0.399,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.296,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 439,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.48,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.5,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:13:00.000Z',
          },
        ],
        explanation:
          'FiO2 carries the largest contribution in this reading, followed by Driving pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.144,
        documentation_share: 0.865,
        sufficient_data: 'sufficient',
        risk_score: 86.6,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.619,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.49,
          },
          {
            name: 'SpO2',
            contribution: 0.379,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.304,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 409,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.45,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.4,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'FiO2 carries the largest contribution in this reading, followed by Plateau pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2004',
    age: 75,
    gender: 'M',
    weight: '65',
    height: '174',
    race: 'Other',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Community-acquired pneumonia',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.274,
        documentation_share: 0.573,
        sufficient_data: 'sufficient',
        risk_score: 48.5,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'PEEP',
            contribution: 0.621,
          },
          {
            name: 'Driving pressure',
            contribution: 0.516,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.399,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.281,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 441,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:03:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.38,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is PEEP; Driving pressure follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.197,
        documentation_share: 0.701,
        sufficient_data: 'sufficient',
        risk_score: 50,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.631,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.486,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.394,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.303,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 433,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.41,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.8,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Tidal volume, which has moved across the readings in this window. Respiratory rate contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.345,
        documentation_share: 0.593,
        sufficient_data: 'sufficient',
        risk_score: 51.4,
        risk_level: null,
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.636,
          },
          {
            name: 'FiO2',
            contribution: 0.481,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.429,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.295,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 417,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:13:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.4,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:21:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.5,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is Respiratory rate; FiO2 follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2005',
    age: 60,
    gender: 'M',
    weight: '97',
    height: '167',
    race: 'Black or African American',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'COPD',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.12,
        documentation_share: 0.592,
        sufficient_data: 'sufficient',
        risk_score: 52.6,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'PEEP',
            contribution: 0.625,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.498,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.424,
          },
          {
            name: 'Driving pressure',
            contribution: 0.318,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 437,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.41,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'carried_forward',
            last_measured: '2026-08-16T13:59:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.4,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'PEEP carries the largest contribution in this reading, followed by Plateau pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.304,
        documentation_share: 0.609,
        sufficient_data: 'sufficient',
        risk_score: 74,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.62,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.481,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.416,
          },
          {
            name: 'SpO2',
            contribution: 0.279,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:11:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 406,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'FiO2',
            value: 0.53,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'SpO2',
            value: 96,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.9,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Respiratory rate. Minute ventilation also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.156,
        documentation_share: 0.712,
        sufficient_data: 'sufficient',
        risk_score: null,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'PEEP',
            contribution: 0.591,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.536,
          },
          {
            name: 'Driving pressure',
            contribution: 0.389,
          },
          {
            name: 'FiO2',
            contribution: 0.27,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 424,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.45,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by PEEP. Plateau pressure also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2006',
    age: 59,
    gender: 'Unknown',
    weight: '76',
    height: '154',
    race: 'Other',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Chronic kidney disease stage 3',
        catch: true,
      },
      {
        name: 'Community-acquired pneumonia',
        catch: false,
      },
      {
        name: 'Interstitial lung disease',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:30:00.000Z',
        imputed_share: 0.216,
        documentation_share: 0.565,
        sufficient_data: 'sufficient',
        risk_score: 74.1,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.625,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.493,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.406,
          },
          {
            name: 'Driving pressure',
            contribution: 0.29,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 410,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.4,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Minute ventilation',
            value: 9.7,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
        ],
        explanation:
          'FiO2 carries the largest contribution in this reading, followed by Respiratory rate. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:35:00.000Z',
        imputed_share: 0.159,
        documentation_share: 0.527,
        sufficient_data: 'sufficient',
        risk_score: 73.6,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.61,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.509,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.396,
          },
          {
            name: 'SpO2',
            contribution: 0.318,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 462,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.53,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.7,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:20:00.000Z',
          },
        ],
        explanation:
          'Plateau pressure carries the largest contribution in this reading, followed by Respiratory rate. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.418,
        documentation_share: 0.638,
        sufficient_data: null,
        risk_score: 85.6,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.632,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.531,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.424,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.291,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 424,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.54,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Tidal volume. Respiratory rate also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2007',
    age: 66,
    gender: 'F',
    weight: '75',
    height: '177',
    race: 'Hispanic or Latino',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Obstructive sleep apnoea',
        catch: true,
      },
      {
        name: 'Type 2 diabetes mellitus',
        catch: false,
      },
    ],
    readings: [],
  },
  {
    patient_id: 'PT-2008',
    age: 69,
    gender: 'M',
    weight: '60',
    height: '171',
    race: 'Black or African American',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Immunosuppressed — transplant recipient',
        catch: false,
      },
      {
        name: 'Hypertension',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.199,
        documentation_share: 0.815,
        sufficient_data: 'sufficient',
        risk_score: 55.5,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.631,
          },
          {
            name: 'FiO2',
            contribution: 0.491,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.371,
          },
          {
            name: 'PEEP',
            contribution: 0.302,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 442,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.47,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:10:00.000Z',
          },
          {
            name: 'SpO2',
            value: 96,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.7,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Tidal volume, which has moved across the readings in this window. FiO2 contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.263,
        documentation_share: 0.611,
        sufficient_data: 'sufficient',
        risk_score: 68,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.604,
          },
          {
            name: 'Driving pressure',
            contribution: 0.526,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.428,
          },
          {
            name: 'Tidal volume',
            contribution: 0.287,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 400,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:12:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.49,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.5,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
        ],
        explanation:
          'FiO2 carries the largest contribution in this reading, followed by Driving pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.377,
        documentation_share: 0.573,
        sufficient_data: 'sufficient',
        risk_score: 68.3,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.633,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.532,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.393,
          },
          {
            name: 'PEEP',
            contribution: 0.289,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 430,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.49,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:23:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.7,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'Tidal volume carries the largest contribution in this reading, followed by Minute ventilation. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.377,
        documentation_share: 0.573,
        sufficient_data: 'sufficient',
        risk_score: 72.5,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.633,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.532,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.393,
          },
          {
            name: 'PEEP',
            contribution: 0.289,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 430,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.49,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:23:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.7,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'Tidal volume carries the largest contribution in this reading, followed by Minute ventilation. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2009',
    age: 61,
    gender: 'F',
    weight: '78',
    height: '182',
    race: 'Unknown',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Community-acquired pneumonia',
        catch: true,
      },
      {
        name: 'Obstructive sleep apnoea',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.271,
        documentation_share: 0.727,
        sufficient_data: 'sufficient',
        risk_score: 55.2,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.608,
          },
          {
            name: 'PEEP',
            contribution: 0.534,
          },
          {
            name: 'SpO2',
            contribution: 0.38,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.286,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 403,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:04:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.41,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.1,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'Plateau pressure carries the largest contribution in this reading, followed by PEEP. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.047,
        documentation_share: 0.677,
        sufficient_data: 'sufficient',
        risk_score: 53.3,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.635,
          },
          {
            name: 'Tidal volume',
            contribution: 0.511,
          },
          {
            name: 'SpO2',
            contribution: 0.372,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.263,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 397,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.42,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.3,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Respiratory rate. Tidal volume also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.184,
        documentation_share: 0.773,
        sufficient_data: 'sufficient',
        risk_score: 73.2,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Minute ventilation',
            contribution: 0.599,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.49,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.394,
          },
          {
            name: 'Driving pressure',
            contribution: 0.29,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:31:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 437,
            source: 'carried_forward',
            last_measured: null,
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.4,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.5,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'Minute ventilation carries the largest contribution in this reading, followed by Plateau pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2010',
    age: 65,
    gender: 'F',
    weight: '97',
    height: '164',
    race: 'White',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Congestive heart failure',
        catch: true,
      },
      {
        name: 'Community-acquired pneumonia',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:26:00.000Z',
        imputed_share: 0.233,
        documentation_share: 0.68,
        sufficient_data: 'sufficient',
        risk_score: 26.6,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'PEEP',
            contribution: 0.616,
          },
          {
            name: 'Driving pressure',
            contribution: 0.532,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.409,
          },
          {
            name: 'FiO2',
            contribution: 0.303,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 457,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'FiO2',
            value: 0.39,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'carried_forward',
            last_measured: '2026-08-16T13:58:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.4,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:05:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by PEEP. Driving pressure also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:33:00.000Z',
        imputed_share: 0.106,
        documentation_share: 0.647,
        sufficient_data: 'sufficient',
        risk_score: 55.1,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Minute ventilation',
            contribution: 0.627,
          },
          {
            name: 'Tidal volume',
            contribution: 0.526,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.387,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.312,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 447,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'FiO2',
            value: 0.53,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.3,
            source: 'measured',
            last_measured: '2026-08-16T14:33:00.000Z',
          },
        ],
        explanation:
          'Minute ventilation carries the largest contribution in this reading, followed by Tidal volume. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.144,
        documentation_share: 0.544,
        sufficient_data: 'sufficient',
        risk_score: 54.1,
        risk_level: 'Medium',
        review_at: '2026-08-16T14:34:00.000Z',
        top_contributors: [
          {
            name: 'Minute ventilation',
            contribution: 0.616,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.517,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.404,
          },
          {
            name: 'SpO2',
            contribution: 0.273,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 19,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 454,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'FiO2',
            value: 0.52,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.3,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Minute ventilation, which has moved across the readings in this window. Plateau pressure contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2011',
    age: 72,
    gender: 'Unknown',
    weight: '68',
    height: '178',
    race: 'Asian',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Congestive heart failure',
        catch: true,
      },
      {
        name: 'Immunosuppressed — transplant recipient',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.379,
        documentation_share: 0.632,
        sufficient_data: 'sufficient',
        risk_score: 68.6,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.636,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.487,
          },
          {
            name: 'Driving pressure',
            contribution: 0.394,
          },
          {
            name: 'FiO2',
            contribution: 0.314,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 453,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.42,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.3,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'Respiratory rate carries the largest contribution in this reading, followed by Plateau pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.324,
        documentation_share: 0.557,
        sufficient_data: 'sufficient',
        risk_score: 71.2,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.592,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.48,
          },
          {
            name: 'PEEP',
            contribution: 0.377,
          },
          {
            name: 'Driving pressure',
            contribution: 0.308,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 398,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:15:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.41,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:20:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.7,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by SpO2, which has moved across the readings in this window. Respiratory rate contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.187,
        documentation_share: 0.69,
        sufficient_data: 'sufficient',
        risk_score: 70,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.614,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.52,
          },
          {
            name: 'Tidal volume',
            contribution: 0.371,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.283,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 454,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.52,
            source: 'device_estimate',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: null,
            last_measured: '2026-08-16T14:26:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.3,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'FiO2 carries the largest contribution in this reading, followed by Minute ventilation. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2012',
    age: 48,
    gender: 'Unknown',
    weight: '90',
    height: '161',
    race: 'Black or African American',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Atrial fibrillation',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.194,
        documentation_share: 0.957,
        sufficient_data: 'sufficient',
        risk_score: 52.7,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.615,
          },
          {
            name: 'SpO2',
            contribution: 0.52,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.426,
          },
          {
            name: 'PEEP',
            contribution: 0.28,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 19,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 408,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:13:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.53,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.5,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:11:00.000Z',
          },
        ],
        explanation: null,
        citations: null,
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.179,
        documentation_share: 0.943,
        sufficient_data: 'sufficient',
        risk_score: 51.7,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.649,
          },
          {
            name: 'PEEP',
            contribution: 0.528,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.413,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.266,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 19,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:13:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 461,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.52,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.9,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
        ],
        explanation: null,
        citations: null,
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.14,
        documentation_share: 0.791,
        sufficient_data: 'sufficient',
        risk_score: 48.7,
        risk_level: 'Medium',
        review_at: '2026-08-16T14:26:00.000Z',
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.607,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.538,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.377,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.307,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 425,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'FiO2',
            value: 0.39,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation: null,
        citations: null,
      },
    ],
  },
  {
    patient_id: 'PT-2013',
    age: 53,
    gender: 'M',
    weight: '67',
    height: '160',
    race: 'Hispanic or Latino',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'COPD',
        catch: true,
      },
      {
        name: 'Type 2 diabetes mellitus',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:24:00.000Z',
        imputed_share: 0.298,
        documentation_share: 0.579,
        sufficient_data: 'sufficient',
        risk_score: 30.4,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 452,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.44,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.4,
            source: 'population_reference',
            last_measured: null,
          },
        ],
        explanation: null,
        citations: null,
      },
      {
        charttime: '2026-08-16T14:32:00.000Z',
        imputed_share: 0.035,
        documentation_share: 0.547,
        sufficient_data: 'sufficient',
        risk_score: 31.2,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 455,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.48,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:22:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.4,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
        ],
        explanation: null,
        citations: null,
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.25,
        documentation_share: 0.713,
        sufficient_data: 'sufficient',
        risk_score: 51.6,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Tidal volume',
            value: 434,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.43,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 15,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.2,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation: null,
        citations: null,
      },
    ],
  },
  {
    patient_id: 'PT-2014',
    age: 81,
    gender: 'M',
    weight: '103',
    height: '157',
    race: 'Black or African American',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Type 2 diabetes mellitus',
        catch: false,
      },
      {
        name: 'Obstructive sleep apnoea',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:20:00.000Z',
        imputed_share: 0.053,
        documentation_share: 0.89,
        sufficient_data: 'sufficient',
        risk_score: 84.7,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.593,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.52,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.42,
          },
          {
            name: 'Tidal volume',
            contribution: 0.279,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:20:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 415,
            source: 'measured',
            last_measured: '2026-08-16T14:20:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:20:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.4,
            source: 'measured',
            last_measured: '2026-08-16T14:20:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:20:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:20:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:20:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.7,
            source: 'measured',
            last_measured: '2026-08-16T14:20:00.000Z',
          },
        ],
        explanation:
          'SpO2 carries the largest contribution in this reading, followed by Minute ventilation. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:24:00.000Z',
        imputed_share: 0.021,
        documentation_share: 0.9,
        sufficient_data: 'sufficient',
        risk_score: 91.3,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.599,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.524,
          },
          {
            name: 'Tidal volume',
            contribution: 0.419,
          },
          {
            name: 'PEEP',
            contribution: 0.303,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 19,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 462,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.53,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.5,
            source: 'measured',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
        ],
        explanation:
          'SpO2 carries the largest contribution in this reading, followed by Plateau pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.235,
        documentation_share: 0.851,
        sufficient_data: 'sufficient',
        risk_score: 89.7,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.616,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.48,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.429,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.304,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 443,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.45,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:14:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 27,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.5,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Tidal volume, which has moved across the readings in this window. Respiratory rate contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:32:00.000Z',
        imputed_share: 0.272,
        documentation_share: 0.672,
        sufficient_data: 'sufficient',
        risk_score: 87.8,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.594,
          },
          {
            name: 'PEEP',
            contribution: 0.535,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.41,
          },
          {
            name: 'SpO2',
            contribution: 0.3,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 429,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.38,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.1,
            source: 'measured',
            last_measured: '2026-08-16T14:32:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is Plateau pressure; PEEP follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:36:00.000Z',
        imputed_share: 0.066,
        documentation_share: 0.796,
        sufficient_data: 'sufficient',
        risk_score: 90.6,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'Plateau pressure',
            contribution: 0.606,
          },
          {
            name: 'SpO2',
            contribution: 0.512,
          },
          {
            name: 'FiO2',
            contribution: 0.427,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.306,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 458,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.36,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.8,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is Plateau pressure; SpO2 follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.231,
        documentation_share: 0.973,
        sufficient_data: 'sufficient',
        risk_score: 87.7,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'PEEP',
            contribution: 0.647,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.488,
          },
          {
            name: 'SpO2',
            contribution: 0.409,
          },
          {
            name: 'Tidal volume',
            contribution: 0.309,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 441,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:19:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.36,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:19:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.8,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by PEEP, which has moved across the readings in this window. Plateau pressure contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2015',
    age: 79,
    gender: 'M',
    weight: null,
    height: null,
    race: 'Asian',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [],
    readings: [
      {
        charttime: '2026-08-16T14:30:00.000Z',
        imputed_share: 0.246,
        documentation_share: 0.689,
        sufficient_data: 'sufficient',
        risk_score: 25.3,
        risk_level: 'Low',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.615,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.505,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.379,
          },
          {
            name: 'Driving pressure',
            contribution: 0.27,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 447,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.43,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'SpO2',
            value: 96,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.4,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by FiO2, which has moved across the readings in this window. Plateau pressure contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.281,
        documentation_share: 0.973,
        sufficient_data: 'sufficient',
        risk_score: 28.5,
        risk_level: 'Low',
        review_at: '2026-08-16T14:09:00.000Z',
        top_contributors: [
          {
            name: 'PEEP',
            contribution: 0.642,
          },
          {
            name: 'SpO2',
            contribution: 0.533,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.388,
          },
          {
            name: 'Tidal volume',
            contribution: 0.28,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Tidal volume',
            value: 404,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'FiO2',
            value: 0.42,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 12,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by PEEP, which has moved across the readings in this window. SpO2 contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2016',
    age: 77,
    gender: 'M',
    weight: '82',
    height: '170',
    race: 'White',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'COPD',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: null,
        imputed_share: 0.16,
        documentation_share: 0.793,
        sufficient_data: 'sufficient',
        risk_score: 48.7,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.593,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.497,
          },
          {
            name: 'FiO2',
            contribution: 0.398,
          },
          {
            name: 'Tidal volume',
            contribution: 0.288,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 408,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:09:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.36,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:01:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Respiratory rate, which has moved across the readings in this window. Plateau pressure contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.413,
        documentation_share: 0.577,
        sufficient_data: 'sufficient',
        risk_score: 69,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.595,
          },
          {
            name: 'Tidal volume',
            contribution: 0.539,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.419,
          },
          {
            name: 'FiO2',
            contribution: 0.275,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 398,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:14:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.5,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:21:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.3,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by SpO2. Tidal volume also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.398,
        documentation_share: 0.782,
        sufficient_data: 'sufficient',
        risk_score: 68.4,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.606,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.48,
          },
          {
            name: 'SpO2',
            contribution: 0.39,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.315,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 463,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:24:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.49,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:23:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:14:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.4,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Tidal volume, which has moved across the readings in this window. Respiratory rate contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2017',
    age: 57,
    gender: 'M',
    weight: '87',
    height: '188',
    race: 'Asian',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Obstructive sleep apnoea',
        catch: false,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:02:00.000Z',
        imputed_share: 0.103,
        documentation_share: 0.701,
        sufficient_data: 'sufficient',
        risk_score: 69.4,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Respiratory rate',
            contribution: 0.634,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.493,
          },
          {
            name: 'SpO2',
            contribution: 0.377,
          },
          {
            name: 'Driving pressure',
            contribution: 0.302,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:02:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 447,
            source: 'measured',
            last_measured: '2026-08-16T14:02:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:02:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.53,
            source: 'measured',
            last_measured: '2026-08-16T14:02:00.000Z',
          },
          {
            name: 'SpO2',
            value: 96,
            source: 'measured',
            last_measured: '2026-08-16T14:02:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:02:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:02:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.6,
            source: 'measured',
            last_measured: '2026-08-16T14:02:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by Respiratory rate, which has moved across the readings in this window. Plateau pressure contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:06:00.000Z',
        imputed_share: 0.273,
        documentation_share: 0.912,
        sufficient_data: 'sufficient',
        risk_score: 70.2,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.608,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.508,
          },
          {
            name: 'FiO2',
            contribution: 0.382,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.295,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:06:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 429,
            source: 'measured',
            last_measured: '2026-08-16T14:06:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:06:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.51,
            source: 'measured',
            last_measured: '2026-08-16T14:06:00.000Z',
          },
          {
            name: 'SpO2',
            value: 94,
            source: 'measured',
            last_measured: '2026-08-16T14:06:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:06:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:06:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.6,
            source: 'measured',
            last_measured: '2026-08-16T14:06:00.000Z',
          },
        ],
        explanation:
          'The score is driven mainly by SpO2, which has moved across the readings in this window. Minute ventilation contributes next. Values shown are those the model received for this reading.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:36:00.000Z',
        imputed_share: 0.359,
        documentation_share: 0.918,
        sufficient_data: 'sufficient',
        risk_score: 48.7,
        risk_level: 'Medium',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.619,
          },
          {
            name: 'Tidal volume',
            contribution: 0.491,
          },
          {
            name: 'Driving pressure',
            contribution: 0.378,
          },
          {
            name: 'PEEP',
            contribution: 0.301,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 429,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:27:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.54,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.3,
            source: 'measured',
            last_measured: '2026-08-16T14:36:00.000Z',
          },
        ],
        explanation:
          'SpO2 carries the largest contribution in this reading, followed by Tidal volume. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.233,
        documentation_share: 0.58,
        sufficient_data: 'sufficient',
        risk_score: 49.7,
        risk_level: 'Medium',
        review_at: '2026-08-16T14:36:00.000Z',
        top_contributors: [
          {
            name: 'Tidal volume',
            contribution: 0.616,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.532,
          },
          {
            name: 'Driving pressure',
            contribution: 0.419,
          },
          {
            name: 'FiO2',
            contribution: 0.283,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 402,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.4,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 96,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Tidal volume. Minute ventilation also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ATS/ESICM/SCCM Clinical Practice Guideline (2017)',
            claim:
              'Recommends lower tidal volume ventilation for adult patients with acute respiratory distress syndrome.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2018',
    age: 85,
    gender: 'F',
    weight: '76',
    height: '184',
    race: 'White',
    warning_status: {
      status: 'Pending Review',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Immunosuppressed — transplant recipient',
        catch: false,
      },
      {
        name: 'Community-acquired pneumonia',
        catch: true,
      },
      {
        name: 'Congestive heart failure',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.338,
        documentation_share: 0.722,
        sufficient_data: 'sufficient',
        risk_score: 86,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.591,
          },
          {
            name: 'PEEP',
            contribution: 0.537,
          },
          {
            name: 'Driving pressure',
            contribution: 0.381,
          },
          {
            name: 'Tidal volume',
            contribution: 0.29,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 407,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 9,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.5,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 92,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 26,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.6,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by FiO2. PEEP also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2019',
    age: 82,
    gender: 'M',
    weight: '89',
    height: '189',
    race: 'Hispanic or Latino',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Obstructive sleep apnoea',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:28:00.000Z',
        imputed_share: 0.378,
        documentation_share: 0.847,
        sufficient_data: 'sufficient',
        risk_score: 71.1,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.627,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.528,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.428,
          },
          {
            name: 'Tidal volume',
            contribution: 0.268,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 21,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 458,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.48,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10,
            source: 'measured',
            last_measured: '2026-08-16T14:28:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by FiO2. Plateau pressure also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:34:00.000Z',
        imputed_share: 0.051,
        documentation_share: 0.938,
        sufficient_data: 'sufficient',
        risk_score: 68.5,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.627,
          },
          {
            name: 'Driving pressure',
            contribution: 0.507,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.386,
          },
          {
            name: 'PEEP',
            contribution: 0.275,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 452,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.35,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.4,
            source: 'measured',
            last_measured: '2026-08-16T14:34:00.000Z',
          },
        ],
        explanation:
          'SpO2 carries the largest contribution in this reading, followed by Driving pressure. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
          {
            name: 'GOLD Report, Chapter 5',
            claim:
              'Describes management of exacerbations in patients with chronic obstructive pulmonary disease requiring ventilatory support.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.135,
        documentation_share: 0.545,
        sufficient_data: 'sufficient',
        risk_score: 69.5,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'Minute ventilation',
            contribution: 0.637,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.637,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.393,
          },
          {
            name: 'SpO2',
            contribution: 0.303,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 20,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 450,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.45,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 24,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 11,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 8.2,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by Minute ventilation. Plateau pressure also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
    ],
  },
  {
    patient_id: 'PT-2020',
    age: 82,
    gender: 'Unknown',
    weight: '98',
    height: '187',
    race: 'Hispanic or Latino',
    warning_status: {
      status: 'Reviewed',
      flags: [],
    },
    underlying_condition: [
      {
        name: 'Type 2 diabetes mellitus',
        catch: true,
      },
      {
        name: 'Obesity (BMI 34)',
        catch: true,
      },
    ],
    readings: [
      {
        charttime: '2026-08-16T14:30:00.000Z',
        imputed_share: 0.194,
        documentation_share: 0.748,
        sufficient_data: 'sufficient',
        risk_score: 67.6,
        risk_level: 'High',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.635,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.529,
          },
          {
            name: 'Tidal volume',
            contribution: 0.425,
          },
          {
            name: 'FiO2',
            contribution: 0.262,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:19:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 453,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:09:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.38,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 27,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.9,
            source: 'measured',
            last_measured: '2026-08-16T14:30:00.000Z',
          },
        ],
        explanation:
          'The largest recorded contribution in this reading is SpO2; Plateau pressure follows. The contribution values are the model’s own and are not normalised.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
          {
            name: 'Surviving Sepsis Campaign, Respiratory Support',
            claim:
              'Describes targets for oxygenation support in mechanically ventilated adults with sepsis-induced hypoxaemic respiratory failure.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:35:00.000Z',
        imputed_share: 0.35,
        documentation_share: 0.68,
        sufficient_data: 'sufficient',
        risk_score: 89.8,
        risk_level: 'Critical',
        review_at: null,
        top_contributors: [
          {
            name: 'SpO2',
            contribution: 0.624,
          },
          {
            name: 'FiO2',
            contribution: 0.483,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.425,
          },
          {
            name: 'Respiratory rate',
            contribution: 0.319,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 23,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 421,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:08:00.000Z',
          },
          {
            name: 'PEEP',
            value: 8,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.43,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'SpO2',
            value: 95,
            source: 'population_reference',
            last_measured: null,
          },
          {
            name: 'Plateau pressure',
            value: 25,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 13,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 10.1,
            source: 'measured',
            last_measured: '2026-08-16T14:35:00.000Z',
          },
        ],
        explanation:
          'This assessment is dominated by SpO2. FiO2 also contributes. No factor outside the recorded parameter set entered this reading.',
        citations: [
          {
            name: 'ESICM Guideline on Weaning from Mechanical Ventilation',
            claim:
              'Describes readiness criteria and spontaneous breathing trial protocols for ventilated adults.',
          },
        ],
      },
      {
        charttime: '2026-08-16T14:40:00.000Z',
        imputed_share: 0.354,
        documentation_share: 0.955,
        sufficient_data: 'sufficient',
        risk_score: 86.9,
        risk_level: 'Critical',
        review_at: '2026-08-16T14:39:00.000Z',
        top_contributors: [
          {
            name: 'FiO2',
            contribution: 0.6,
          },
          {
            name: 'Minute ventilation',
            contribution: 0.532,
          },
          {
            name: 'Plateau pressure',
            contribution: 0.397,
          },
          {
            name: 'SpO2',
            contribution: 0.261,
          },
        ],
        parameters: [
          {
            name: 'Respiratory rate',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Tidal volume',
            value: 441,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'PEEP',
            value: 7,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'FiO2',
            value: 0.5,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'SpO2',
            value: 93,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Plateau pressure',
            value: 22,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Driving pressure',
            value: 14,
            source: 'measured',
            last_measured: '2026-08-16T14:40:00.000Z',
          },
          {
            name: 'Minute ventilation',
            value: 9.6,
            source: 'carried_forward',
            last_measured: '2026-08-16T14:16:00.000Z',
          },
        ],
        explanation:
          'FiO2 carries the largest contribution in this reading, followed by Minute ventilation. The remaining recorded factors contribute less individually.',
        citations: [
          {
            name: 'ARDS Definition Task Force, Berlin Definition',
            claim:
              'Defines acute respiratory distress syndrome by timing, chest imaging, origin of oedema, and oxygenation category.',
          },
        ],
      },
    ],
  },
];
