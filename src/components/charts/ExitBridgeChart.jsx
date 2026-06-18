import { useMemo } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { F } from "../../lib/formatters";
import { PAL } from "../../constants";

export default function ExitBridgeChart({ M, inp, dark }) {
  const tk = dark ? "#94a3b8" : "#64748b";
  const gk = dark ? "#334155" : "#e2e8f0";
  const tt = dark
    ? { background: "#1e293b", border: "1px solid #334155", color: "#f1f5f9", fontSize: 11 }
    : { background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 11 };

  const data = useMemo(() => {
    const exitRow = M.rows[M.HP - 1];
    const grossSale = M.exitGross || 0;
    const disposal = grossSale * ((inp.exitCosts || 0) / 100);
    const seniorBal = exitRow?.bal || 0;
    const mezzBal = (exitRow?.mezzBal || 0);
    const netEquity = exitRow?.exitEq || 0;

    const items = [
      { name: "Gross Sale Value",  base: 0, delta: grossSale,  val: grossSale,  fill: PAL.green },
      { name: "Disposal Costs",    base: grossSale - disposal, delta: disposal, val: -disposal, fill: PAL.oxblood },
      { name: "Senior Repaid",     base: grossSale - disposal - seniorBal, delta: seniorBal, val: -seniorBal, fill: PAL.oxblood },
    ];
    if (inp.mezzOn && mezzBal > 0) {
      items.push({ name: "Mezzanine Repaid", base: grossSale - disposal - seniorBal - mezzBal, delta: mezzBal, val: -mezzBal, fill: "#6366f1" });
    }
    items.push({ name: "Net Equity", base: 0, delta: Math.max(0, netEquity), val: netEquity, fill: PAL.brass });
    return items;
  }, [M, inp]);

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gk} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 9, fill: tk }} tickFormatter={(v) => F.eur(v)} />
        <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: tk }} />
        <Tooltip formatter={(v, n, p) => [F.eur(p.payload.val), "Amount"]} contentStyle={tt} />
        <Bar dataKey="base" stackId="b" fill="transparent" />
        <Bar dataKey="delta" stackId="b" radius={[0, 3, 3, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
