# Changelog — quality-pass branch

Plain-English notes on every meaningful change: what, why, how it works, and — where it matters —
what an interviewer might ask and how to answer. Nothing here changes a headline number: the four
risk presets still produce **Core 7.6% · Core-Plus 11.2% · Value-Add 15.1% · Opportunistic 25.1%**
levered IRR, now enforced by tests.

---

## Financial model

### Refinance input validation (`src/lib/model.js`)
**What:** when a refinance year is set, the revaluation cap must be 0–30%, LTV 0–100%, costs 0–10%.
**Why:** a shared URL could previously deliver `refiCap: 0` straight into a division, producing a
zero valuation and a nonsense refi. Inputs from the URL are untrusted; the model now refuses them.
**Interview note:** "Why validate in the model rather than the UI?" — because the model is the last
line of defence; the UI clamps, but state can also arrive from a URL.

### Conventions documented in code (`src/lib/model.js`)
A comment block at the top of the model states every convention: exit on forward NOI, leverage
sized on price, IO-then-amortising with balloon, refinance restarts the amortisation clock,
PIK compounding, annual end-of-period cash flows. These were always true; now they are declared
where the code lives, and mirrored in the UI Methodology panel.

## Waterfall — verified, not changed

The engine was **not** modified. Three previously-flagged concerns were investigated and proven
correct, each now pinned by a test:

1. **Capital calls.** Negative years are funded pro-rata by LP and GP, lifting their capital
   accounts and the LP hurdle balance. Tests show LP+GP cash flows equal the deal cash flow in
   every period, and blended partner IRR equals deal IRR — including a stress deal calling €1.58M.
   *Interview question: "Do your partner returns tie to the deal return?" — Yes, period by period,
   and there's a test that fails if they ever don't.*
2. **Tier-2 threshold.** Tier 1 tops LP cumulative receipts to exactly `capital × threshold`
   (to the euro). Nuance the tests also pin: if ROC + preferred return already exceed the
   threshold, tier 1 is skipped — the pref is a senior *right*; the threshold cannot claw it back.
3. **"IRR hurdle" is genuinely an IRR hurdle.** The pref uses the outstanding-capital method: the
   hurdle account compounds at the hurdle rate and every LP receipt pays it down. That is
   mathematically the same as testing `NPV(LP flows at hurdle rate) = 0`. Boundary tests: 0% hurdle
   → zero pref; 99% hurdle → pref absorbs everything, promote is zero.

### Stale disclosure corrected (`src/pages/WaterfallPage.jsx`)
The sponsor-economics note still said capital calls were *not* modelled — true before, false now.
Copy corrected; both LP and GP cards note called capital when it occurs.

## IC memo

### Asset-class-aware risk copy (`src/pages/MemoExportPage.jsx`)
The liquidity risk said "Office investment volumes…" even for a hotel or logistics deal — a
factual error in an IC document. It now names the actual asset class.

## Underwriting page

### Sensitivity grid always shows your own deal (`src/lib/sensitivity.js`)
The LTV columns were a fixed list (40/50/55/60/65/70). A deal at 63% LTV — the Value-Add preset
itself — never highlighted its own base case. The deal's actual LTV is now inserted into the grid.
Dead code (`buildSens`, superseded by `buildSens2`) removed.

### DSCR severity tiers
Breach (< 1.00×, red), thin cushion (1.00–1.20×, amber) and headroom (≥ 1.20×, green) are now
visually distinct on both the senior and whole-loan cards. Previously breach and thin cushion
looked identical. The whole-loan card under PIK notes "(cash DS only — PIK accrues)" — DSCR is a
cash-coverage metric, so accrued PIK interest correctly doesn't reduce it.

### Methodology panel
Now a real `<button>` (keyboard + screen-reader accessible, `aria-expanded`), with three added
disclosures: refinance restarts the amortisation schedule; shortfall years are funded as pro-rata
capital calls; DSCR is computed on cash debt service.

## Security / robustness

### Share-link sanitisation (`src/lib/url.js`)
Every field decoded from a shared URL is coerced to the type of its default value; anything that
fails coercion falls back to the default, and free text is capped at 120 characters. React already
escapes rendered text (no XSS), but the model now provably never receives a string where it
expects a number. Pinned by a tampering test.

## Accessibility

- ~27 instances of 2.9:1 hint text (`#94a3b8` on white) raised to `--muted` (#64748b, 4.76:1 — AA).
- `aria-pressed` on Mezzanine/PIK toggles; `scope="col"` on data-table headers.
- Invalid-state pages show a clear message instead of an empty sidebar box.

## Performance

### Vendor chunk splitting (`vite.config.js`)
The bundle was one 606 KB file. React and Recharts now build into separate long-cached chunks;
the app's own code is ~85 KB. Users re-downloading after a deploy only fetch the app chunk.
*Interview note: charts library dominates the payload; the app itself is small.*

## SEO / shareability

Canonical URL, `og:site_name`, `og:locale`, `og:image:alt`, JSON-LD (`WebApplication`),
`robots.txt` and `sitemap.xml` added. The share image (`og-cover.png`, 1200×630) already existed
and is referenced with absolute URLs — LinkedIn/Twitter previews resolve it.

**Owner action — analytics:** both `gtag.js` and GTM load in `index.html`. If the GTM container
also fires a GA4 tag for `G-BH6B1VGTGF`, pageviews are double-counted. Check GA4 DebugView for
duplicate `page_view` events; if present, remove one of the two.

## Testing

`npm test` — 48 tests, Node's built-in runner, zero new dependencies (esbuild, already a
devDependency, bundles the Vite-style imports). Coverage of the model layer:

- IRR solver against closed-form answers; NPV≈0 at the solved rate; `pmt` vs the annuity formula.
- All 11 preset IRRs pinned to ±0.1%.
- Reconciliation invariant — bridge = distributions − equity — in six financing modes
  (no mezz / cash mezz / PIK / refi / PIK+refi / capital-call stress).
- Waterfall: period-by-period partner-to-deal tie, catch-up ratio, both tier-2 threshold branches,
  IRR-hurdle boundary behaviour, capital-call accounting.
- IRR-by-exit-year exactness (curve end = deal IRR) including refinance + PIK.
- Edge cases: zero leverage (levered = unlevered), full-term IO (balloon = loan), 100% vacancy
  (graceful N/M), invalid refi rejected, URL tampering.

`npm run verify` remains as a quick reconciliation smoke-check.

## Considered and deliberately not done

- **TypeScript migration** — the suite + JSDoc typedefs give most of the safety; a language
  migration adds review burden without a defensible interview story.
- **Dark mode** — removed at the owner's request earlier; not reintroduced.
- **Visual redesign** — the approved identity was left intact; only contrast-level fixes.
- **Loan-to-cost construction draws** — disclosed as a simplification in the UI; a modelling
  scope decision for later, not a defect.
