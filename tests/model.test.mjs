/**
 * Financial-model test suite.
 *
 * Run:  npm test        (plain `node tests/model.test.mjs` also works)
 *
 * Uses Node's built-in test runner (node:test) — no test-framework dependency.
 * The ESM source uses Vite-style extensionless imports, so we bundle it once
 * with esbuild (already a devDependency) and import the bundle.
 *
 * What is pinned here, and why:
 *  1. IRR solver + pmt against closed-form answers — the numeric foundation.
 *  2. The four risk-strategy preset IRRs (7.6 / 11.2 / 15.1 / 25.1) and the
 *     seven Iberian sector presets — any model change that moves a headline
 *     number fails loudly instead of silently.
 *  3. The reconciliation invariant in EVERY financing mode: the value-creation
 *     bridge must equal (total distributions − equity) with no mezz, cash-pay
 *     mezz, PIK mezz, refinance, and mezz+refi combined.
 *  4. Waterfall correctness: LP+GP cash flows tie to the deal cash flow
 *     period-by-period; catch-up hits its target ratio; the tier-2 threshold
 *     counts ALL prior LP receipts; the preferred return behaves like a true
 *     IRR hurdle at its boundaries; capital calls fund negative years.
 *  5. IRR-by-exit-year: the final point equals the deal IRR, including for
 *     refinance + PIK deals (exactness, not approximation).
 *  6. Edge cases: zero leverage, full-term IO, 100% vacancy, tampered URLs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { join } from "path";
import { writeFileSync, rmSync } from "fs";
import { pathToFileURL } from "url";

// ── Bundle the model once ─────────────────────────────────────────────────────
const entry = `
  export { calcIRR, pmt } from "./src/lib/irr.js";
  export { computeModel, buildLeveredCFs, validateInputs } from "./src/lib/model.js";
  export { computeWaterfall } from "./src/lib/waterfall.js";
  export { computeAttribution, computeIrrByExitYear, computeBreakeven, computeScenarios } from "./src/lib/analysis.js";
  export { computeSourcesUses } from "./src/lib/sources.js";
  export { buildSens2 } from "./src/lib/sensitivity.js";
  export { encodeAppState, decodeAppState } from "./src/lib/url.js";
  export { PRESETS, DEF, WF_DEF } from "./src/lib/config.js";
`;
const res = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: "entry.mjs", loader: "js" },
  bundle: true, format: "esm", platform: "node", write: false,
});
const tmp = join(process.cwd(), "tests", ".bundle-tmp.mjs");
writeFileSync(tmp, res.outputFiles[0].text);
const M = await import(pathToFileURL(tmp).href);
rmSync(tmp);

const {
  calcIRR, pmt, computeModel, buildLeveredCFs, computeWaterfall,
  computeAttribution, computeIrrByExitYear, computeSourcesUses,
  buildSens2, encodeAppState, decodeAppState, PRESETS, DEF, WF_DEF,
} = M;

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: |${a} - ${b}| > ${tol}`);

// ── 1. Numeric foundation ─────────────────────────────────────────────────────
test("IRR solver: single-period analytic case (-100 → +110 = 10%)", () => {
  near(calcIRR([-100, 110]) * 100, 10, 1e-6, "IRR");
});

test("IRR solver: two-period analytic case (-100 → 0 → +121 = 10%)", () => {
  near(calcIRR([-100, 0, 121]) * 100, 10, 1e-6, "IRR");
});

test("IRR solver: returns NaN when no sign change exists", () => {
  assert.ok(isNaN(calcIRR([100, 100])), "all-positive");
  assert.ok(isNaN(calcIRR([-100, -100])), "all-negative");
});

test("IRR solver: NPV at solved rate is ~zero (office preset)", () => {
  const m = computeModel(DEF);
  const r = m.levIRR / 100;
  const npv = m.levCF.reduce((s, c, t) => s + c / (1 + r) ** t, 0);
  near(npv, 0, 1, "NPV at IRR");
});

test("pmt matches closed-form annuity; zero-rate falls back to straight-line", () => {
  const P = 1_000_000, r = 0.045, n = 25;
  const expected = (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  near(pmt(P, 4.5, 25), expected, 1e-6, "annuity");
  near(pmt(P, 0, 25), P / 25, 1e-9, "zero-rate");
});

// ── 2. Preset IRRs pinned ─────────────────────────────────────────────────────
const PIN = {
  core: 7.6, corePlus: 11.2, valueAdd: 15.1, opportunistic: 25.1,
  industrial: 14.5, residential: 10.9, office: 15.6, hospitality: 14.5,
  retail: 9.9, student: 13.7, development: 18.9,
};
for (const [key, irr] of Object.entries(PIN)) {
  test(`preset "${key}" levered IRR ≈ ${irr}%`, () => {
    const m = computeModel(PRESETS[key].inp);
    assert.ok(m.valid, `${key} valid`);
    near(m.levIRR, irr, 0.1, `${key} IRR`);
  });
}

// ── 3. Reconciliation invariant across every financing mode ─────────────────
const MODES = {
  "no mezz":        { ...DEF },
  "cash-pay mezz":  { ...DEF, mezzOn: true, mezzLtv: 15, mezzRate: 10, mezzPik: false },
  "PIK mezz":       { ...DEF, mezzOn: true, mezzLtv: 15, mezzRate: 10, mezzPik: true },
  "refinance":      { ...DEF, refiYr: 2, refiLtv: 65, refiCap: 5.25, refiCosts: 1 },
  "PIK mezz + refi":{ ...DEF, mezzOn: true, mezzLtv: 12, mezzRate: 11, mezzPik: true, refiYr: 2, refiLtv: 68, refiCap: 5.4, refiCosts: 1 },
  "capital-call stress": { ...DEF, grossRev: 520000, vacancy: 6, opexPct: 28, ltv: 78, intRate: 6, amortYrs: 20, ioYrs: 0, hold: 6, exitCap: 6, capex: 400000, leaseUpYrs: 4, entryVacancy: 80 },
};

for (const [mode, inp] of Object.entries(MODES)) {
  test(`bridge reconciles to (distributions − equity) — ${mode}`, () => {
    const m = computeModel(inp);
    assert.ok(m.valid, "model valid");
    const a = computeAttribution(m, inp);
    near(a.profit, m.totalDist - m.equity, 2, "bridge = profit");
  });

  test(`sources = uses — ${mode}`, () => {
    const m = computeModel(inp);
    const su = computeSourcesUses(m, inp);
    near(su.totalSources, su.totalUses, 0.5, "S = U");
    near(m.equity, su.totalUses - m.loan - (m.mezzLoan || 0), 0.5, "equity identity");
  });

  test(`LP+GP cash flows tie to deal cash flow, period by period — ${mode}`, () => {
    const m = computeModel(inp);
    const w = computeWaterfall(m, WF_DEF);
    m.levCF.forEach((v, i) => near((w.lpCF[i] || 0) + (w.gpCF[i] || 0), v, 1, `period ${i}`));
    const blended = calcIRR(m.levCF.map((_, i) => (w.lpCF[i] || 0) + (w.gpCF[i] || 0))) * 100;
    near(blended, m.levIRR, 0.05, "blended IRR = deal IRR");
  });
}

// ── 4. Waterfall mechanics ────────────────────────────────────────────────────
test("waterfall: capital calls fire on the stress deal and increase contributed capital", () => {
  const m = computeModel(MODES["capital-call stress"]);
  const w = computeWaterfall(m, WF_DEF);
  assert.ok(w.lpCalled > 0, "LP capital called");
  assert.ok(w.gpCalled > 0, "GP capital called");
  near(w.lpCap + w.gpCap, m.equity + w.lpCalled + w.gpCalled, 0.5, "capital = equity + calls");
});

test("waterfall: GP catch-up reaches its target ratio when cash is sufficient", () => {
  // With catch-up on and deep profits, gpCatchUp should equal lpPref × t1GP/t1LP.
  const m = computeModel(DEF);
  const w = computeWaterfall(m, { ...WF_DEF, catchUp: true });
  const target = (w.lpPref * WF_DEF.t1GP) / WF_DEF.t1LP;
  near(w.gpCatchUp, target, 1, "catch-up = pref × promote ratio");
});

test("waterfall: tier-1 tops LP receipts exactly to the tier-2 threshold", () => {
  // Threshold above ROC+pref → tier 1 must fill LP to exactly cap × threshold.
  const m = computeModel(DEF);
  const w = computeWaterfall(m, { ...WF_DEF, t2EMThreshold: 1.6 });
  assert.ok(w.lpT1 > 0 && w.lpT2 > 0, "both tiers engaged");
  near(w.lpROC + w.lpPref + w.lpT1, w.lpCap * 1.6, 1, "LP receipts at T2 boundary = cap × threshold");
});

test("waterfall: preferred return is senior to the tier-2 threshold", () => {
  // Threshold below ROC+pref → pref still pays in full (it is a right, not
  // capped by the threshold); tier 1 is skipped and the excess flows to tier 2.
  const m = computeModel(DEF);
  const w = computeWaterfall(m, { ...WF_DEF, t2EMThreshold: 1.3 });
  near(w.lpT1, 0, 0.5, "tier 1 skipped");
  assert.ok(w.lpT2 > 0, "tier 2 engaged");
  assert.ok(w.lpROC + w.lpPref >= w.lpCap * 1.3, "ROC+pref exceed threshold");
});

test("waterfall: hurdle behaves as an IRR hurdle at its boundaries", () => {
  const m = computeModel(DEF);
  // Hurdle 0% → no preferred return accrues.
  const w0 = computeWaterfall(m, { ...WF_DEF, hurdle: 0 });
  near(w0.lpPref, 0, 0.5, "zero hurdle → zero pref");
  // Absurdly high hurdle → pref absorbs all profit; no promote is earned.
  const w99 = computeWaterfall(m, { ...WF_DEF, hurdle: 99 });
  near(w99.gpCatchUp + w99.gpT1 + w99.gpT2, 0, 1, "unreachable hurdle → no promote");
  assert.ok(w99.lpIRR < 99, "LP IRR below unreachable hurdle");
  // Normal hurdle with profits beyond pref → LP clears the hurdle.
  const w8 = computeWaterfall(m, WF_DEF);
  assert.ok(w8.lpIRR > WF_DEF.hurdle, "LP IRR clears hurdle when promote is paid");
});

// ── 5. IRR by exit year is exact, including refinance + PIK ──────────────────
for (const key of ["office", "valueAdd", "opportunistic"]) {
  test(`IRR-by-exit-year final point equals deal IRR — ${key}`, () => {
    const inp = PRESETS[key].inp;
    const m = computeModel(inp);
    const curve = computeIrrByExitYear(inp);
    assert.equal(curve.length > 0, true, "curve non-empty");
    const last = curve[curve.length - 1];
    assert.equal(last.year, m.HP, "last point at planned hold");
    near(last.irr, m.levIRR, 0.05, "curve end = deal IRR");
  });
}

// ── 6. Edge cases ─────────────────────────────────────────────────────────────
test("zero leverage: levered equals unlevered", () => {
  const m = computeModel({ ...DEF, ltv: 0 });
  assert.ok(m.valid, "valid");
  near(m.levIRR, m.unlevIRR, 0.01, "no debt → identical IRRs");
});

test("full-term IO: no principal amortises; balloon repaid at exit", () => {
  const m = computeModel({ ...DEF, ioYrs: DEF.hold });
  assert.ok(m.valid, "valid");
  const totalPrin = m.rows.reduce((s, r) => s + r.prin, 0);
  near(totalPrin, 0, 0.01, "no scheduled principal");
  near(m.rows[m.HP - 1].bal, m.loan, 0.01, "balloon = original loan");
});

test("100% vacancy: model degrades gracefully (no crash, flagged N/M)", () => {
  const m = computeModel({ ...DEF, vacancy: 100 });
  assert.ok(m.valid, "still valid");
  near(m.noi, 0, 0.01, "zero NOI");
  assert.ok(m.noIRR || m.levIRR < 0, "flagged as no-IRR or deeply negative");
});

test("invalid refi inputs are rejected by validation", () => {
  const m = computeModel({ ...DEF, refiYr: 2, refiCap: 0 });
  assert.ok(!m.valid && m.errors.length > 0, "zero refi cap rejected");
});

test("sensitivity grid always includes the deal's own LTV column", () => {
  const inp = PRESETS.valueAdd.inp; // 63% — off the standard grid
  const m = computeModel(inp);
  const s = buildSens2(inp, m.noi, "ltv");
  assert.ok(s.cols.some((c) => Math.abs(c - inp.ltv) < 1e-6), "current LTV present");
});

test("URL state: round-trip preserves inputs; tampered numerics fall back to defaults", () => {
  const enc = encodeAppState({ inp: DEF, wf: WF_DEF, tab: "analysis" });
  const dec = decodeAppState(enc);
  assert.equal(dec.tab, "analysis");
  assert.equal(dec.inp.price, DEF.price);
  // Tamper: replace price with a string inside the payload.
  const raw = JSON.parse(Buffer.from(enc, "base64").toString("utf8"));
  raw.inp.price = "not-a-number";
  raw.inp.dealName = "x".repeat(500);
  const tampered = Buffer.from(JSON.stringify(raw), "utf8").toString("base64");
  const dec2 = decodeAppState(tampered);
  assert.equal(dec2.inp.price, DEF.price, "string price → default");
  assert.ok(dec2.inp.dealName.length <= 120, "oversized text truncated");
});
