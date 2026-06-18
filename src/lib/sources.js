export function computeSourcesUses(M, i) {
  const acqCostsAmt = i.price * (i.acqCosts / 100);
  const capex = M.capex || 0;
  const mezzLoan = M.mezzLoan || 0;

  const uses = [
    { label: "Purchase Price", val: i.price },
    { label: "Acquisition Costs", val: acqCostsAmt },
  ];
  if (capex > 0) uses.push({ label: "Capital Expenditure", val: capex });
  const totalUses = uses.reduce((a, x) => a + x.val, 0);

  const sources = [
    { label: "Senior Debt", val: M.loan, pct: totalUses ? (M.loan / totalUses) * 100 : 0 },
  ];
  if (mezzLoan > 0) {
    sources.push({ label: "Mezzanine", val: mezzLoan, pct: totalUses ? (mezzLoan / totalUses) * 100 : 0 });
  }
  sources.push({ label: "Sponsor Equity", val: M.equity, pct: totalUses ? (M.equity / totalUses) * 100 : 0 });

  const totalSources = M.loan + mezzLoan + M.equity;

  return { uses, sources, totalUses, totalSources };
}
