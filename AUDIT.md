# Quality-Pass Audit — Praça Real Estate Underwriting

Date: July 2026 · Branch: `quality-pass` · Auditor role: principal engineer + RE PE domain review.

Every finding below was either **fixed on this branch**, **verified as already correct** (with a
test now pinning it), or **deliberately left alone** with a reason. Ranked by impact.

---

## 1. Financial correctness

| # | Finding | Status |
|---|---------|--------|
| 1.1 | **Waterfall capital calls.** Years with negative net cash flow must be funded by LP/GP pro-rata capital calls, or partner IRRs don't tie to the deal IRR. | **Verified fixed** (implemented on `main` previously). Now pinned by tests: LP+GP cash flows tie to the deal cash flow period-by-period in six financing modes, including a stress deal that calls €1.58M. |
| 1.2 | **Tier-2 threshold across multi-year distributions.** The threshold must count *all* prior LP receipts. | **Verified correct.** Two new tests pin both branches: tier 1 tops LP receipts to exactly `capital × threshold` (to the euro), and when ROC + pref already exceed the threshold, tier 1 is correctly skipped because the preferred return is a senior right the threshold cannot claw back. |
| 1.3 | **"IRR hurdle" labelling.** Is the pref a true IRR hurdle or a euro-denominated coupon? | **Verified: it is a true IRR hurdle** (outstanding-capital method — the hurdle account compounds and is reduced by every LP receipt, mathematically equivalent to the IRR lookback test). Pinned by boundary tests: hurdle 0% → zero pref; unreachable hurdle → zero promote; normal hurdle → LP IRR clears it. Labels kept, now provably accurate. |
| 1.4 | **IRR-by-exit-year with refinance** was flagged as "approximate". | **Verified exact.** The curve rebuilds the full model per exit year; a refinance planned after the sale year correctly never happens. Test pins curve-end == deal IRR for the refinance + PIK preset to ±0.05. |
| 1.5 | **"Debt Amortisation" bridge line mislabeled under refinance.** | **Verified fixed** (relabels to "Net Senior Debt Change" when a refi is active). Bridge reconciliation is tested in all modes. |
| 1.6 | **Memo hard-coded "Office investment volumes"** in the liquidity risk for all seven asset classes. | **Fixed** — now uses the deal's asset class. |
| 1.7 | **Stale disclosure** on the Waterfall page claimed capital calls were *not* modelled (they now are). | **Fixed** — copy now states the actual behaviour. |
| 1.8 | **Refinance inputs unvalidated** (a crafted URL could set `refiCap: 0`, producing a nonsense refi). | **Fixed** — validation rejects refi cap ≤ 0 or > 30, LTV outside 0–100, costs outside 0–10. Tested. |
| 1.9 | **URL state not type-coerced** — a tampered share link could inject strings into numeric fields. | **Fixed** — every decoded field is coerced to the type of its default; failures fall back to defaults; free-text capped at 120 chars. Tested. |
| 1.10 | Whole-loan DSCR under PIK equals senior DSCR (PIK pays no cash). | **Correct by convention** (DSCR is a cash metric); now labelled "(cash DS only — PIK accrues)" and disclosed in Methodology. |

## 2. UX and trust

| # | Finding | Status |
|---|---------|--------|
| 2.1 | **Sensitivity highlight failed for off-grid LTVs** — the Value-Add preset itself (63% LTV) never highlighted its own base case. | **Fixed** — the deal's actual LTV is inserted into the column grid. Tested. |
| 2.2 | **DSCR breach vs thin cushion rendered identically** (both red). | **Fixed** — three severities: breach < 1.0× (red), thin cushion 1.0–1.2× (amber), headroom ≥ 1.2× (green), applied to senior and whole-loan cards. |
| 2.3 | **Empty sidebar box** rendered when the model was invalid on Analysis/Waterfall. | **Fixed** — a clear full-width message replaces the broken-looking empty panel. |

## 3. Accessibility (WCAG AA)

| # | Finding | Status |
|---|---------|--------|
| 3.1 | **Methodology collapsible was a click-only `<div>`** — unreachable by keyboard, invisible to screen readers. | **Fixed** — now a `<button>` with `aria-expanded`/`aria-controls`. |
| 3.2 | **Hint text at 2.9:1 contrast** (`#94a3b8` on white, 9–10px) across ~27 instances. | **Fixed** — all instances on light backgrounds now use `--muted` (#64748b, 4.76:1 — passes AA). |
| 3.3 | Toggle buttons missing `aria-pressed`; tables missing `scope="col"`. | **Fixed.** |
| 3.4 | Reduced-motion, focus rings, alert roles. | **Verified already present.** |

## 4. Engineering

| # | Finding | Status |
|---|---------|--------|
| 4.1 | **No test suite.** | **Fixed** — 48 tests on Node's built-in runner (zero new dependencies): solver maths, pinned preset IRRs, reconciliation in six financing modes, waterfall mechanics, exit-year exactness, edge cases, URL tampering. `npm test`. |
| 4.2 | **606 KB single JS chunk.** | **Fixed** — vendor splitting: app code 85 KB; React and Recharts in separately cached chunks. |
| 4.3 | Dead code (`buildSens`, `PAL.ink`). | **Removed.** |
| 4.4 | No README / CHANGELOG. | **Added.** |
| 4.5 | Model conventions undocumented in code. | **Fixed** — conventions block + typedefs at the top of `model.js`. |

## 5. SEO / shareability / analytics

| # | Finding | Status |
|---|---------|--------|
| 5.1 | `og-cover.png` exists and is referenced with absolute URL, width/height. | **Verified**; added `og:image:alt`, `og:site_name`, `og:locale`. |
| 5.2 | No canonical, robots.txt, sitemap, structured data. | **Added** (canonical link, robots.txt, sitemap.xml, JSON-LD `WebApplication`). |
| 5.3 | **GA double-count risk**: both `gtag.js` (G-BH6B1VGTGF) and GTM (GTM-T3QZC5NJ) load. If the GTM container *also* fires a GA4 tag with the same ID, every pageview counts twice. The container is not visible from code. | **Documented — owner action**: open GA4 DebugView (or Tag Assistant) and check for duplicate `page_view` events; if duplicated, remove either the inline gtag snippet or the GA4 tag inside GTM. |

## 6. Deliberately left alone

- **Dark mode** — removed earlier at the owner's explicit request; not reintroduced.
- **Visual identity** (navy hero, sky accent, rainbow sensitivity heatmap) — owner-approved look; only
  contrast-level fixes applied, no restyling.
- **TypeScript migration** — considered and declined: the owner must be able to defend every line;
  JSDoc typedefs + a 48-test suite deliver most of the safety without a new language. Documented in CHANGELOG.
- **Construction-draw (loan-to-cost) modelling** for development deals — a UI note already discloses the
  LTV-on-stabilised-value simplification; full LTC mechanics are a scope decision, not a bug.
- **Preset IRRs** — unchanged and now pinned: Core 7.6 · Core-Plus 11.2 · Value-Add 15.1 · Opportunistic 25.1
  (and the seven sector presets).
