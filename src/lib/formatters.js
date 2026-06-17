export const F = {
  pct: (v, d = 1) => (isFinite(v) ? `${(+v).toFixed(d)}%` : "—"),
  mul: (v) => (isFinite(v) ? `${(+v).toFixed(2)}×` : "—"),
  eur: (v) => {
    if (!isFinite(v)) return "—";
    const s = v < 0 ? "−" : "", a = Math.abs(v);
    if (a >= 1e6) return `${s}€${(a / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${s}€${(a / 1e3).toFixed(1)}K`;
    return `${s}€${a.toFixed(0)}`;
  },
};
