import { calcIRR } from "./irr";
import { buildLeveredCFs } from "./model";

export function buildSens(inp, noi, capsArr, ltvsArr) {
  const b = inp.exitCap;
  const caps = capsArr || [b - 1.5, b - 1, b - 0.5, b, b + 0.5, b + 1];
  const ltvs = ltvsArr || [40, 50, 55, 60, 65, 70];

  const grid = caps.map((ec) =>
    ltvs.map((lv) => {
      const scenario = { ...inp, ltv: lv, exitCap: ec };
      const built = buildLeveredCFs(scenario, noi);
      if (built.equity <= 0) return null;
      const irr = calcIRR(built.levCF) * 100;
      return isFinite(irr) ? irr : null;
    })
  );

  return { caps, ltvs, grid };
}

export function irrS(v) {
  if (v == null || !isFinite(v)) return { background: "#f1f5f9", color: "#94a3b8" };
  if (v < 0)  return { background: "#be123c", color: "#fff" };
  if (v < 4)  return { background: "#fecaca", color: "#7f1d1d" };
  if (v < 8)  return { background: "#f87171", color: "#fff" };
  if (v < 12) return { background: "#fed7aa", color: "#7c2d12" };
  if (v < 16) return { background: "#fef9c3", color: "#713f12" };
  if (v < 20) return { background: "#d1fae5", color: "#065f46" };
  if (v < 25) return { background: "#6ee7b7", color: "#064e3b" };
  return { background: "#059669", color: "#fff" };
}
