import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer,
} from "recharts";
import { computeIrrByExitYear } from "../../lib/analysis";
import { F } from "../../lib/formatters";
import { PAL } from "../../constants";

export default function IrrByExitYear({ inp }) {
  const data = useMemo(() => computeIrrByExitYear(inp), [inp]);

  const tk = "#64748b";
  const gk = "#e2e8f0";
  const tt = { background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 11 };

  if (!data.length) return null;

  const ticks = data.map((d) => d.year);

  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 12, right: 16, left: -10, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gk} />
        <XAxis
          dataKey="year"
          ticks={ticks}
          tick={{ fontSize: 10, fill: tk }}
          label={{ value: "Exit Year", position: "insideBottomRight", offset: -4, fontSize: 9, fill: tk }}
        />
        <YAxis tick={{ fontSize: 9, fill: tk }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
        <Tooltip
          formatter={(v, name) =>
            name === "irr" ? [`${v.toFixed(1)}%`, "Levered IRR"] : [`${v.toFixed(2)}×`, "MoM"]
          }
          contentStyle={tt}
        />
        <ReferenceLine
          x={inp.hold}
          stroke={PAL.brass}
          strokeDasharray="5 3"
          label={{ value: `Yr ${inp.hold} (planned)`, position: "insideTopRight", fontSize: 9, fill: PAL.brass }}
        />
        <ReferenceLine
          y={inp.targetIRR || 15}
          stroke={PAL.oxblood}
          strokeDasharray="4 3"
          label={{ value: `${inp.targetIRR || 15}% target`, position: "insideTopLeft", fontSize: 9, fill: PAL.oxblood }}
        />
        <Line
          type="monotone"
          dataKey="irr"
          name="irr"
          stroke={PAL.green}
          strokeWidth={2.5}
          dot={{ fill: PAL.green, r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
