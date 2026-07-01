import { useMemo } from "react";
import WaterfallBars from "./WaterfallBars";

export default function ExitBridgeChart({ M, inp }) {
  const items = useMemo(() => {
    const exitRow = M.rows[M.HP - 1];
    const grossSale = M.exitGross || 0;
    const disposal = grossSale * ((inp.exitCosts || 0) / 100);
    const seniorBal = exitRow?.bal || 0;
    const mezzBal = exitRow?.mezzBal || 0;

    const rows = [
      { label: "Gross Sale Value", val: grossSale },
      { label: "Disposal Costs",   val: -disposal },
      { label: "Senior Repaid",    val: -seniorBal },
    ];
    if (inp.mezzOn && mezzBal > 0) rows.push({ label: "Mezzanine Repaid", val: -mezzBal });
    return rows;
  }, [M, inp]);

  return <WaterfallBars items={items} totalLabel="Net Equity to Sponsor" />;
}
