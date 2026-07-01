import { F } from "../../lib/formatters";
import { PAL } from "../../constants";

/**
 * Horizontal waterfall / bridge, built with layout primitives (not Recharts) so
 * each bar's *visible length* is exactly that line's magnitude, floating at the
 * running cumulative level — the way a value bridge is meant to read. The final
 * row is the cumulative total, drawn from zero.
 *
 *   items: [{ label, val }]  — signed contributions, in order
 *   totalLabel               — caption for the cumulative total row
 */
export default function WaterfallBars({ items, totalLabel = "Total" }) {
  let cum = 0;
  const steps = items.map((it) => {
    const start = cum;
    const end = cum + it.val;
    cum = end;
    return { label: it.label, val: it.val, start, end, lo: Math.min(start, end), hi: Math.max(start, end) };
  });
  const total = cum;
  const peak = Math.max(total, 0, ...steps.map((s) => s.hi)) || 1;
  const pct = (x) => `${(x / peak) * 100}%`;

  const LABEL_W = 148;
  const VAL_W = 96;
  const ROW_H = 34;

  const Row = ({ label, val, lo, hi, end, color, isTotal, showConnector }) => (
    <div style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px 1fr ${VAL_W}px`, alignItems: "center", columnGap: 12, height: ROW_H }}>
      <div style={{ fontSize: 11, color: isTotal ? "var(--ink)" : "var(--muted)", fontWeight: isTotal ? 600 : 500, textAlign: "right", lineHeight: 1.15 }}>
        {label}
      </div>
      <div style={{ position: "relative", height: ROW_H }}>
        <div
          title={`${val >= 0 ? "+" : "−"}${F.eur(Math.abs(val))}`}
          style={{
            position: "absolute", top: 8, bottom: 8,
            left: pct(lo), width: `max(2px, ${pct(hi - lo)})`,
            background: color, borderRadius: 2,
          }}
        />
        {showConnector && (
          <div style={{
            position: "absolute", left: pct(end), top: ROW_H / 2, height: ROW_H,
            width: 0, borderLeft: "1px dashed var(--muted-2)", opacity: 0.5,
          }} />
        )}
      </div>
      <div className="num" style={{ fontSize: 11.5, fontWeight: isTotal ? 700 : 500, textAlign: "right", color: isTotal ? "var(--ink)" : color }}>
        {isTotal ? F.eur(val) : `${val >= 0 ? "+" : "−"}${F.eur(Math.abs(val))}`}
      </div>
    </div>
  );

  return (
    <div>
      {steps.map((s, i) => (
        <Row key={s.label} label={s.label} val={s.val} lo={s.lo} hi={s.hi} end={s.end}
          color={s.val >= 0 ? PAL.green : PAL.oxblood} showConnector={i < steps.length - 1} />
      ))}
      {/* divider before the cumulative total */}
      <div style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px 1fr ${VAL_W}px`, columnGap: 12 }}>
        <div />
        <div style={{ borderTop: "1px solid var(--line)", margin: "3px 0" }} />
        <div />
      </div>
      <Row label={totalLabel} val={total} lo={0} hi={total} end={total} color={PAL.brass} isTotal />
      {/* axis */}
      <div style={{ display: "grid", gridTemplateColumns: `${LABEL_W}px 1fr ${VAL_W}px`, columnGap: 12, marginTop: 4 }}>
        <div />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted-2)" }}>
          <span>€0</span>
          <span>{F.eur(peak)}</span>
        </div>
        <div />
      </div>
    </div>
  );
}
