import {
  ComposedChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { F } from "../../lib/formatters";
import { PAL } from "../../constants";

/**
 * The J-curve: cumulative net cash flow to equity, from −equity at close to
 * total profit at exit. The zero line is the moment capital is fully returned.
 */
export default function PaybackCurve({ payback }) {
  const tk = "#64748b";
  const gk = "#e2e8f0";
  const tt = { background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 11 };

  if (!payback.valid || !payback.points.length) return null;

  const ticks = payback.points.map((p) => p.year);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <ComposedChart data={payback.points} margin={{ top: 12, right: 16, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="pb-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PAL.green} stopOpacity={0.22} />
            <stop offset="100%" stopColor={PAL.green} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gk} />
        <XAxis
          dataKey="year"
          ticks={ticks}
          tick={{ fontSize: 10, fill: tk }}
          tickFormatter={(v) => (v === 0 ? "Close" : `Yr ${v}`)}
        />
        <YAxis tick={{ fontSize: 9, fill: tk }} tickFormatter={(v) => F.eur(v)} width={62} />
        <Tooltip
          labelFormatter={(v) => (v === 0 ? "At close" : `End of Year ${v}`)}
          formatter={(v, name, p) => [F.eur(p.payload.cum), "Cumulative net cash to equity"]}
          contentStyle={tt}
        />
        <ReferenceLine y={0} stroke={tk} strokeWidth={1.25} />
        {payback.paybackYear != null && (
          <ReferenceLine
            x={payback.paybackYear}
            stroke={PAL.green}
            strokeDasharray="5 3"
            label={{ value: `Capital returned · Yr ${payback.paybackYear}`, position: "insideTopLeft", fontSize: 9, fill: PAL.green }}
          />
        )}
        <Area
          type="monotone"
          dataKey="cum"
          stroke={PAL.green}
          strokeWidth={2.5}
          fill="url(#pb-fill)"
          dot={{ fill: PAL.green, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
