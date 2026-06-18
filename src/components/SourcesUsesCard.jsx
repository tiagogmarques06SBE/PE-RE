import { useMemo } from "react";
import { F } from "../lib/formatters";
import { PAL } from "../constants";
import { computeSourcesUses } from "../lib/sources";

export default function SourcesUsesCard({ inp, M }) {
  const SU = useMemo(() => computeSourcesUses(M, inp), [M, inp]);

  const col = (rows, total, totalLabel, accent) => (
    <div className="su-col">
      {rows.map((r) => (
        <div key={r.label} className="su-row">
          <span className="su-label">{r.label}</span>
          <span className="su-val">
            {F.eur(r.val)}
            {r.pct != null && <span className="su-pct"> · {r.pct.toFixed(0)}%</span>}
          </span>
        </div>
      ))}
      <div className="su-row su-total" style={{ color: accent }}>
        <span>{totalLabel}</span>
        <span>{F.eur(total)}</span>
      </div>
    </div>
  );

  const STACK_COLORS = [PAL.oxblood, "#7a9c8b", PAL.green];

  return (
    <div className="card">
      <div className="card-title">Sources &amp; Uses</div>
      <div className="su-grid">
        <div>
          <div className="su-head">Uses of Capital</div>
          {col(SU.uses, SU.totalUses, "Total Uses", PAL.green)}
        </div>
        <div>
          <div className="su-head">Sources of Capital</div>
          {col(SU.sources, SU.totalSources, "Total Sources", PAL.brass)}
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <div style={{ height: 28, display: "flex", borderRadius: 5, overflow: "hidden" }}>
          {SU.sources.map((s, idx) => {
            const pct = SU.totalSources > 0 ? (s.val / SU.totalSources) * 100 : 0;
            const color = STACK_COLORS[idx % STACK_COLORS.length];
            return (
              <div
                key={s.label}
                style={{
                  width: `${pct}%`, background: color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, color: "#fff", fontWeight: 700, overflow: "hidden",
                  transition: "width 0.35s ease",
                }}
              >
                {pct > 7 ? `${pct.toFixed(0)}%` : ""}
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 5, flexWrap: "wrap" }}>
          {SU.sources.map((s, idx) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: STACK_COLORS[idx % STACK_COLORS.length], flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: "var(--muted)" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
