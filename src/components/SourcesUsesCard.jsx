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
    </div>
  );
}
