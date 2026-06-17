export function calcIRR(cfs, g = 0.1) {
  const hasOutflow = cfs.some((c) => c < 0);
  const hasInflow = cfs.some((c) => c > 0);
  if (!hasOutflow || !hasInflow) return NaN;

  const npv = (r) => cfs.reduce((sum, c, t) => sum + c / (1 + r) ** t, 0);

  let r = g;
  for (let i = 0; i < 400; i++) {
    let f = 0, df = 0;
    cfs.forEach((c, t) => {
      const d = (1 + r) ** t;
      f += c / d;
      df -= (t * c) / (d * (1 + r));
    });
    if (!isFinite(f) || Math.abs(df) < 1e-14) break;
    const r2 = r - f / df;
    if (Math.abs(r2 - r) < 1e-9) return isFinite(r2) ? r2 : NaN;
    r = Math.max(-0.99, Math.min(50, r2));
  }

  let lo = -0.99, hi = 5;
  if (npv(lo) * npv(hi) > 0) return NaN;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-8 || hi - lo < 1e-9) return mid;
    if (v * npv(lo) <= 0) hi = mid;
    else lo = mid;
  }
  return NaN;
}

export function pmt(P, rPct, n) {
  const r = rPct / 100;
  if (!r || !n) return n ? P / n : 0;
  return (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}
