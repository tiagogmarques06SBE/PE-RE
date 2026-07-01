# Praça — Real Estate Underwriting

An investment-committee-grade real-estate underwriting workbench: levered and unlevered returns,
a senior + mezzanine debt schedule, an LP/GP distribution waterfall, value-creation attribution,
sensitivity analysis, and a printable IC memo. Built by **Tiago Marques (Nova SBE)** as a
portfolio piece — every calculation is explainable and tested.

**Live:** https://pere-tiago-marques.netlify.app

## Quick start

```bash
npm install
npm run dev       # local dev server (Vite)
npm test          # 48-test model suite (Node built-in runner, no extra deps)
npm run verify    # quick reconciliation smoke-check across all presets
npm run build     # production build to dist/
```

## Architecture

```
index.html                  meta/OG/analytics, fonts, favicon
src/
  main.jsx                  React entry
  App.jsx                   state, tabs, URL share-state, presets dropdown
  constants.js              brand, tabs, chart palette
  styles/index.css          design tokens + all component styles
  lib/                      ── pure financial logic, no React ──
    config.js               asset classes, defaults, 11 calibrated presets
    model.js                cash-flow engine (debt schedule, refi, mezz, exit)
    irr.js                  IRR solver (Newton-Raphson + bisection fallback), pmt
    waterfall.js            LP/GP waterfall with capital calls and IRR hurdle
    analysis.js             attribution bridge, scenarios, tornado, break-evens,
                            IRR-by-exit-year
    sensitivity.js          two-way sensitivity grids
    sources.js              sources & uses
    formatters.js           display formatting
    url.js                  share-link encode/decode (sanitised)
  pages/                    Underwriting · Analysis · Waterfall · IC Memo
  components/               inputs, cards, charts (Recharts + custom waterfalls)
tests/model.test.mjs        the model test suite
scripts/reconcile.mjs       reconciliation smoke-check
scripts/make-og.mjs         regenerates public/og-cover.png (sharp)
```

Everything under `src/lib/` is framework-free and imported by both the app and the tests.

## Model methodology and conventions

All conventions are disclosed in the app (Methodology panel) and asserted by tests:

- **Exit value** = forward (Year *HP*+1) NOI ÷ exit cap — a buyer prices on forward earnings.
- **Leverage** is sized on purchase price (LTV). Acquisition costs and capex are equity-funded.
- **Debt** is IO-then-amortising on the full-term annuity payment; the residual balloon repays
  from sale proceeds at exit.
- **Refinance** (optional) re-sizes the loan on a revaluation cap and restarts the amortisation
  schedule; cash-out flows to equity.
- **Mezzanine** (optional) is an IO bullet — cash-pay, or PIK (interest compounds to exit).
  DSCR is a cash metric, so PIK accrual does not reduce it.
- **Preferred return** uses the outstanding-capital method: the LP hurdle account compounds at
  the hurdle rate and is paid down by every LP receipt — mathematically a true IRR hurdle,
  not a simple coupon.
- **Capital calls:** years with a net cash shortfall are funded pro-rata by LP and GP, so partner
  cash flows reconcile to the deal cash flow in every scenario (tested period-by-period).
- **IRR** is solved numerically (Newton-Raphson with a bisection fallback); returns N/M when no
  sign change exists.
- All periods are annual; cash flows occur at period end. Figures are gross of fees and taxes.

Known simplification, disclosed in-app: development/heavy-reposition deals are financed as LTV on
stabilised value; real construction lending is loan-to-cost with phased draws.

## Presets

Two groups in the "Load example deal" menu:

- **Iberian sectors** — seven calibrated deals forming a risk-return ladder
  (Retail ≈10% → Development ≈19% levered IRR).
- **Risk strategy** — the same office asset underwritten Core (≈7.6%) / Core-Plus (≈11.2%) /
  Value-Add (≈15.1%) / Opportunistic (≈25.1%).

All eleven IRRs are pinned by tests: a model change that moves a headline number fails CI-style.

## Testing

`npm test` runs 48 assertions: solver maths vs closed-form answers, pinned preset IRRs, the
reconciliation invariant (attribution bridge = distributions − equity) in six financing modes,
waterfall mechanics (partner-to-deal tie, catch-up ratio, tier-2 threshold, hurdle boundaries,
capital calls), IRR-by-exit-year exactness under refinance, and edge cases (zero leverage,
full-term IO, 100% vacancy, tampered share links).

## Deployment & analytics

Netlify (`netlify.toml`): `npm run build` → `dist/`, SPA redirect included. Analytics: gtag +
GTM are both present — verify in GA4 DebugView that `page_view` isn't firing twice (see
CHANGELOG "Owner action"). To regenerate the social share image: `node scripts/make-og.mjs`.
