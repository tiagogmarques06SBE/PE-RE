/**
 * Waterfall ⇄ deal reconciliation test.
 *
 * Proves that LP + GP partner cash flows tie back to the deal-level levered cash
 * flow for every preset — the check a sharp interviewer runs on any waterfall.
 * Self-contained: bundles the ESM source with esbuild (already a dependency) and
 * runs under plain Node, so there is no test-framework dependency.
 *
 *   npm run verify
 */
import { build } from "esbuild";
import { tmpdir } from "os";
import { join } from "path";
import { writeFileSync, rmSync } from "fs";
import { pathToFileURL } from "url";

const entry = `
  export { computeModel } from "./src/lib/model.js";
  export { computeWaterfall } from "./src/lib/waterfall.js";
  export { computeAttribution } from "./src/lib/analysis.js";
  export { computeSourcesUses } from "./src/lib/sources.js";
  export { calcIRR } from "./src/lib/irr.js";
  export { PRESETS, WF_DEF, DEF } from "./src/lib/config.js";
`;

const res = await build({
  stdin: { contents: entry, resolveDir: process.cwd(), sourcefile: "entry.mjs", loader: "js" },
  bundle: true, format: "esm", platform: "node", write: false,
});
const tmp = join(tmpdir(), `reconcile-${Date.now()}.mjs`);
writeFileSync(tmp, res.outputFiles[0].text);
const M = await import(pathToFileURL(tmp).href);
rmSync(tmp);

const { computeModel, computeWaterfall, computeAttribution, computeSourcesUses, calcIRR, PRESETS, WF_DEF, DEF } = M;

const near = (a, b, tol = 1.0) => Math.abs(a - b) <= tol;
const f = (v) => (v == null || !isFinite(v) ? "—" : Math.round(v).toLocaleString());

// Synthetic stress deal: deep lease-up + high leverage forces a NEGATIVE interim
// cash flow, which exercises the capital-call path. Reconciliation must still hold.
const STRESS = { ...DEF, dealName: "Stress — capital call", assetClass: "office",
  grossRev: 520000, vacancy: 6, opexPct: 28, noiGrowth: 4,
  price: 9000000, ltv: 78, intRate: 6.0, amortYrs: 20, ioYrs: 0,
  hold: 6, exitCap: 6.0, capex: 400000, leaseUpYrs: 4, entryVacancy: 80 };

const cases = [...Object.entries(PRESETS), ["stress", { inp: STRESS }]];

let failures = 0;
for (const [k, p] of cases) {
  const inp = p.inp;
  const model = computeModel(inp);
  const W = computeWaterfall(model, WF_DEF);
  const A = computeAttribution(model, inp);
  const SU = computeSourcesUses(model, inp);

  // (1) LP + GP cash flows equal the deal levered cash flow, period by period.
  const combined = model.levCF.map((_, i) => (W.lpCF[i] || 0) + (W.gpCF[i] || 0));
  const cfTie = model.levCF.every((v, i) => near(v, combined[i], 1.0));

  // (2) The IRR of combined partner flows equals the deal levered IRR.
  const blendedIRR = calcIRR(combined) * 100;
  const irrTie = near(blendedIRR, model.levIRR, 0.05);

  // (3) Net partner economics tie out: distributions − calls = deal total distributions.
  const netPartner = (W.lpTotal + W.gpTotal) - (W.lpCalled + W.gpCalled);
  const netTie = near(netPartner, model.totalDist, 2);

  // (4) Contributed capital = base equity + capital called.
  const capTie = near(W.lpCap + W.gpCap, model.equity + W.lpCalled + W.gpCalled, 0.5);

  // (5) Attribution bridge sums to equity profit; sources = uses.
  const bridgeTie = near(A.profit, model.totalDist - model.equity, 2);
  const suTie = near(SU.totalSources, SU.totalUses, 0.5);

  const ok = cfTie && irrTie && netTie && capTie && bridgeTie && suTie;
  if (!ok) failures++;
  console.log(
    (ok ? "PASS " : "FAIL ") + k.padEnd(13),
    "| deal", model.levIRR.toFixed(1).padStart(5),
    "| blended", blendedIRR.toFixed(1).padStart(5),
    "| LP", (W.lpIRR ?? NaN).toFixed(1).padStart(5),
    "| GP", (W.gpIRR ?? NaN).toFixed(1).padStart(5),
    "| called", f(W.lpCalled + W.gpCalled).padStart(9),
    ok ? "" : `  << cf:${cfTie} irr:${irrTie} net:${netTie} cap:${capTie} bridge:${bridgeTie} su:${suTie}`
  );
}

if (failures) {
  console.log(`\n✗ ${failures} preset(s) failed reconciliation`);
  process.exit(1);
}
console.log("\n✓ All presets reconcile: LP + GP ties to the deal at cash-flow and IRR level.");
