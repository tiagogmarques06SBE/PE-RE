import { useMemo } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { F } from "../../lib/formatters";
import { PAL } from "../../constants";

export default function AttributionWaterfall({ items, dark }) {
  const COLORS = { pos: PAL.green, neg: PAL.oxblood, total: PAL.brass };

  const data = useMemo(() => {
    let cum = 0;
    const d = items.map((it) => {
      const start = cum;
      const end = cum + it.val;
      cum = end;
      return {
        name: it.label,
        base: Math.min(start, end),
        delta: Math.abs(it.val),
        val: it.val,
        fill: it.val >= 0 ? COLORS.pos : COLORS.neg,
      };
    });
    d.push({ name: "Equity Profit", base: 0, delta: Math.abs(cum), val: cum, fill: COLORS.total });
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const tk = dark ? "#8b948a" : "#6b766f";
  const gk = dark ? "#2c322a" : "#e0dccf";
  const tt = dark
    ? { background: "#21261f", border: "1px solid #2c322a", color: "#ece9df", fontSize: 11 }
    : { background: "#fbf9f4", border: "1px solid #e0dccf", color: "#1b2a24", fontSize: 11 };

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gk} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 9, fill: tk }} tickFormatter={(v) => F.eur(v)} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: tk }} />
        <Tooltip formatter={(v, n, p) => [F.eur(p.payload.val), "Contribution"]} contentStyle={tt} />
        <Bar dataKey="base" stackId="w" fill="transparent" />
        <Bar dataKey="delta" stackId="w" radius={[0, 3, 3, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
