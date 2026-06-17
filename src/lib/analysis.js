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
  const opIncome = M.rows.reduce((a, r) => a + r.cfads, 0);
  const refiProceeds = M.rows.reduce((a, r) => a + (r.cashOut || 0), 0);
  const balExit = M.rows[HP - 1].bal;
  const debtPaydown = M.loan - balExit;
  const noiGrowthVal = entryCapF > 0 ? (noiExit - noiEntry) / entryCapF : 0;
  const capMoveVal = noiExit * (1 / exitCapF - (entryCapF > 0 ? 1 / entryCapF : 0));

  const items = [
    { key: "income",  label: "Operating Cash Flow", val: opIncome },
    { key: "noi",     label: "NOI Growth",           val: noiGrowthVal },
    { key: "cap",     label: "Cap Rate Movement",    val: capMoveVal },
    { key: "paydown", label: "Debt Amortisation",    val: debtPaydown },
  ];
  if (refiProceeds !== 0) items.splice(1, 0, { key: "refi", label: "Refinancing Proceeds", val: refiProceeds });
  items.push({ key: "disposal", label: "Disposal Costs",        val: -disposal });
  items.push({ key: "acq",      label: "Acquisition Costs",     val: -acqCostsAmt });
  if (capex > 0) items.push({ key: "capex", label: "Capital Expenditure", val: -capex });

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

export function computeBreakeven(i) {
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

  const hurdle = 8;
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
