import { calcIRR } from "./irr";
import { buildLeveredCFs, computeModel } from "./model";

export const SCENARIOS = {
  bear: { label: "Bear", dCap: 0.75, dGrowth: -1.5, dVac: 4 },
  base: { label: "Base", dCap: 0,    dGrowth: 0,    dVac: 0 },
  bull: { label: "Bull", dCap: -0.5, dGrowth: 1.0,  dVac: -2 },
};

export function applyScenario(i, key) {
  const s = SCENARIOS[key];
  if (!s) return { ...i };
  return {
    ...i,
    exitCap: Math.max(0.5, i.exitCap + s.dCap),
    noiGrowth: i.noiGrowth + s.dGrowth,
    vacancy: Math.min(100, Math.max(0, i.vacancy + s.dVac)),
  };
}

export function computeAttribution(M, i) {
  if (!M.valid) return { valid: false, items: [], profit: 0, equity: 0, totalReturned: 0 };

  const HP = M.HP;
  const g = i.noiGrowth / 100;
  const noiEntry = M.noi;
  const noiExit = noiEntry * (1 + g) ** HP;
  const entryCapF = i.price > 0 ? noiEntry / i.price : 0;
  const exitCapF = i.exitCap / 100;
  const exitGross = exitCapF > 0 ? noiExit / exitCapF : 0;

  const disposal = exitGross * (i.exitCosts / 100);
  const acqCostsAmt = i.price * (i.acqCosts / 100);
  const capex = M.capex || 0;
  // Gross of mezz so that senior operating income is isolated; mezz cost shown separately
  const opIncome = M.rows.reduce((a, r) => a + r.yrNOI - r.ds, 0);
  const refiProceeds = M.rows.reduce((a, r) => a + (r.cashOut || 0), 0);
  const balExit = M.rows[HP - 1].bal;
  const debtPaydown = M.loan - balExit;
  const noiGrowthVal = entryCapF > 0 ? (noiExit - noiEntry) / entryCapF : 0;
  const capMoveVal = noiExit * (1 / exitCapF - (entryCapF > 0 ? 1 / entryCapF : 0));

  // With a refinance, balExit reflects the re-levered balance, so this line captures
  // the NET change in senior debt (amortisation less cash-out), not pure amortisation.
  const hasRefi = refiProceeds !== 0;
  const items = [
    { key: "income",  label: "Operating Cash Flow", val: opIncome },
    { key: "noi",     label: "NOI Growth",           val: noiGrowthVal },
    { key: "cap",     label: "Cap Rate Movement",    val: capMoveVal },
    { key: "paydown", label: hasRefi ? "Net Senior Debt Change" : "Debt Amortisation", val: debtPaydown },
  ];
  if (hasRefi) items.splice(1, 0, { key: "refi", label: "Refinancing Proceeds", val: refiProceeds });
  items.push({ key: "disposal", label: "Disposal Costs",        val: -disposal });
  items.push({ key: "acq",      label: "Acquisition Costs",     val: -acqCostsAmt });
  if (capex > 0) items.push({ key: "capex", label: "Capital Expenditure", val: -capex });
  if (i.mezzOn && (M.mezzLoan || 0) > 0) {
    const mezzCashTotal = M.rows.reduce((a, r) => a + (r.mezzCashPay || 0), 0);
    const mezzBalExit = M.rows[HP - 1].mezzBal || 0;
    const mezzCostTotal = mezzCashTotal + (mezzBalExit - (M.mezzLoan || 0));
    items.push({ key: "mezz", label: "Mezzanine Financing Cost", val: -mezzCostTotal });
  }

  const profit = items.reduce((a, x) => a + x.val, 0);
  return { valid: true, items, profit, equity: M.equity, totalReturned: M.totalDist };
}

function solveCrossing(fn, lo, hi, target, steps = 240) {
  let prevX = lo, prevY = fn(lo);
  for (let k = 1; k <= steps; k++) {
    const x = lo + ((hi - lo) * k) / steps;
    const y = fn(x);
    if (isFinite(prevY) && isFinite(y) && (prevY - target) * (y - target) <= 0 && prevY !== y) {
      const t = (target - prevY) / (y - prevY);
      return prevX + (x - prevX) * t;
    }
    prevX = x; prevY = y;
  }
  return null;
}

/**
 * Equity payback (J-curve): cumulative net cash flow to equity by year.
 * Year 0 starts at −equity; each year adds that year's levered cash flow
 * (capital calls arrive as negative years and deepen the curve). The payback
 * year is the first year the running total reaches zero — "when is the
 * capital fully returned?" — null if it never is within the hold.
 */
export function computeEquityPayback(M) {
  if (!M.valid || !M.levCF?.length) return { valid: false, points: [], paybackYear: null, trough: 0, troughYear: 0 };

  let cum = 0;
  const points = M.levCF.map((cf, year) => {
    cum += cf;
    return { year, cf, cum };
  });

  const paybackYear = points.find((p) => p.year > 0 && p.cum >= 0)?.year ?? null;
  const trough = points.reduce((m, p) => Math.min(m, p.cum), 0);
  const troughYear = points.find((p) => p.cum === trough)?.year ?? 0;

  return { valid: true, points, paybackYear, trough, troughYear };
}

export function computeIrrByExitYear(inp) {
  const HP = Math.max(1, Math.round(inp.hold));
  const results = [];
  for (let h = 1; h <= HP; h++) {
    const built = buildLeveredCFs({ ...inp, hold: h });
    if (!built || built.equity <= 0) continue;
    const irr = calcIRR(built.levCF) * 100;
    if (!isFinite(irr)) continue;
    const totalRec = built.levCF.slice(1).reduce((a, b) => a + b, 0);
    const mom = totalRec / built.equity;
    results.push({ year: h, irr, mom });
  }
  return results;
}

export function computeBreakeven(i, wfHurdle) {
  const irrAtCap = (ec) => {
    const b = buildLeveredCFs({ ...i, exitCap: ec });
    if (!b || b.equity <= 0) return NaN;
    const v = calcIRR(b.levCF) * 100;
    return isFinite(v) ? v : NaN;
  };
  const irrAtPrice = (p) => {
    const b = buildLeveredCFs({ ...i, price: p });
    if (!b || b.equity <= 0) return NaN;
    const v = calcIRR(b.levCF) * 100;
    return isFinite(v) ? v : NaN;
  };
  const dscrAtVac = (vac) => {
    const b = buildLeveredCFs({ ...i, vacancy: vac });
    return b.rows[0]?.dscr ?? NaN;
  };

  const hurdle = wfHurdle ?? 8;
  const target = i.targetIRR || 15;

  return {
    hurdle,
    target,
    capAtZero: solveCrossing(irrAtCap, 1, 15, 0),
    capAtHurdle: solveCrossing(irrAtCap, 1, 15, hurdle),
    capAtTarget: solveCrossing(irrAtCap, 1, 15, target),
    maxPriceTarget: solveCrossing(irrAtPrice, i.price * 0.5, i.price * 2, target),
    breakevenVacancy: solveCrossing(dscrAtVac, i.vacancy, 100, 1),
  };
}

export function computeTornado(i) {
  const irrFor = (override) => {
    const b = buildLeveredCFs({ ...i, ...override });
    if (!b || b.equity <= 0) return NaN;
    const v = calcIRR(b.levCF) * 100;
    return isFinite(v) ? v : NaN;
  };

  const base = irrFor({});
  if (!isFinite(base)) return { valid: false, base: NaN, items: [] };

  const drivers = [
    { key: "exitCap",   label: "Exit Cap Rate",  lo: { exitCap: i.exitCap + 0.75 },              hi: { exitCap: Math.max(0.5, i.exitCap - 0.75) }, loLbl: "+0.75%", hiLbl: "−0.75%" },
    { key: "noiGrowth", label: "NOI Growth",      lo: { noiGrowth: i.noiGrowth - 1.5 },           hi: { noiGrowth: i.noiGrowth + 1.5 },             loLbl: "−1.5%",  hiLbl: "+1.5%"  },
    { key: "intRate",   label: "Interest Rate",   lo: { intRate: i.intRate + 1 },                  hi: { intRate: Math.max(0, i.intRate - 1) },      loLbl: "+1.0%",  hiLbl: "−1.0%"  },
    { key: "vacancy",   label: "Vacancy",         lo: { vacancy: Math.min(100, i.vacancy + 5) },   hi: { vacancy: Math.max(0, i.vacancy - 5) },      loLbl: "+5%",    hiLbl: "−5%"    },
    { key: "ltv",       label: "Leverage (LTV)",  lo: { ltv: Math.max(0, i.ltv - 10) },            hi: { ltv: Math.min(95, i.ltv + 10) },            loLbl: "−10%",   hiLbl: "+10%"   },
    { key: "price",     label: "Purchase Price",  lo: { price: i.price * 1.05 },                   hi: { price: i.price * 0.95 },                    loLbl: "+5%",    hiLbl: "−5%"    },
  ];

  const items = drivers.map((d) => {
    const a = irrFor(d.lo);
    const b = irrFor(d.hi);
    const low  = Math.min(a, b);
    const high = Math.max(a, b);
    return {
      key: d.key, label: d.label,
      low:  isFinite(low)  ? low  : base,
      high: isFinite(high) ? high : base,
      downside: base - (isFinite(low)  ? low  : base),
      upside:   (isFinite(high) ? high : base) - base,
      swing:    (isFinite(high) ? high : base) - (isFinite(low) ? low : base),
      loLbl: d.loLbl, hiLbl: d.hiLbl,
    };
  });

  items.sort((x, y) => y.swing - x.swing);
  const maxMag = Math.max(0.01, ...items.map((it) => Math.max(Math.abs(it.downside), Math.abs(it.upside))));
  return { valid: true, base, items, maxMag };
}

export function computeScenarios(i) {
  return Object.keys(SCENARIOS).map((k) => {
    const M = computeModel(applyScenario(i, k));
    return { key: k, label: SCENARIOS[k].label, levIRR: M.levIRR, mom: M.mom, equity: M.equity, valid: M.valid, noIRR: M.noIRR };
  });
}
