// ============================================================
// calculations.js — Core financial logic
// ============================================================

/* ─── Safe Base64 helpers (replaces deprecated escape/unescape) ─ */
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(bin);
}
function base64ToUtf8(str) {
  const bin = atob(str);
  const bytes = Uint8Array.from(bin, (m) => m.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/* ─── IRR (Newton-Raphson + bisection fallback) ───────────── */
export function calcIRR(cfs, g = 0.1) {
  const hasOutflow = cfs.some((c) => c < 0);
  const hasInflow = cfs.some((c) => c > 0);
  if (!hasOutflow || !hasInflow) return NaN;

  const npv = (r) => cfs.reduce((sum, c, t) => sum + c / (1 + r) ** t, 0);

  let r = g;
  for (let i = 0; i < 400; i++) {
    let f = 0, df = 0;
    cfs.forEach((c, t) => {
      const d = (1 + r) ** t;
      f += c / d;
      df -= (t * c) / (d * (1 + r));
    });
    if (!isFinite(f) || Math.abs(df) < 1e-14) break;
    const r2 = r - f / df;
    if (Math.abs(r2 - r) < 1e-9) return isFinite(r2) ? r2 : NaN;
    r = Math.max(-0.99, Math.min(50, r2));
  }

  let lo = -0.99, hi = 5;
  if (npv(lo) * npv(hi) > 0) return NaN;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-8 || hi - lo < 1e-9) return mid;
    if (v * npv(lo) <= 0) hi = mid;
    else lo = mid;
  }
  return NaN;
}

/* ─── Annuity payment (PMT equivalent) ───────────────────── */
export function pmt(P, rPct, n) {
  const r = rPct / 100;
  if (!r || !n) return n ? P / n : 0;
  return (P * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

/* ─── Number formatters ───────────────────────────────────── */
export const F = {
  pct: (v, d = 1) => (isFinite(v) ? `${(+v).toFixed(d)}%` : "—"),
  mul: (v) => (isFinite(v) ? `${(+v).toFixed(2)}×` : "—"),
  eur: (v) => {
    if (!isFinite(v)) return "—";
    const s = v < 0 ? "−" : "", a = Math.abs(v);
    if (a >= 1e6) return `${s}€${(a / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${s}€${(a / 1e3).toFixed(1)}K`;
    return `${s}€${a.toFixed(0)}`;
  },
};

/* ─── Asset class config ──────────────────────────────────── */
export const AC = {
  office:      { name: "Office",                 rev: "Passing Rent",        vac: "Void Allowance",        opx: "Non-Recoverable Costs" },
  residential: { name: "Residential / BTR",      rev: "Gross Rent Roll",     vac: "Vacancy & Bad Debt",    opx: "Operating Expenses"     },
  hospitality: { name: "Hospitality",            rev: "Total Hotel Revenue", vac: "Mgmt & Franchise Fees", opx: "Hotel Operating Costs"  },
  retail:      { name: "Retail / Mixed-Use",     rev: "Gross Passing Rent",  vac: "Vacancy Allowance",     opx: "Non-Recoverable OpEx"   },
  industrial:  { name: "Industrial / Logistics", rev: "Contracted Rent",     vac: "Void Allowance",        opx: "Property Running Costs" },
  development: { name: "Development (BTS/BTR)",  rev: "GDV / End Value",     vac: "Stabilisation Disc.",   opx: "Construction Costs"     },
};

/* ─── Default input values ────────────────────────────────── */
export const DEF = {
  dealName: "Porto Office – Value Add",
  assetClass: "office",
  grossRev: 700000,
  vacancy: 8,
  opexPct: 20,
  noiGrowth: 3,
  price: 9000000,
  acqCosts: 2,
  ltv: 60,
  intRate: 4.5,
  amortYrs: 25,
  ioYrs: 2,
  hold: 5,
  exitCap: 5.25,
  exitCosts: 1.5,
  preparedBy: "",

  // ── Optional advanced inputs (defaults are no-ops → base model) ──
  capex: 0,            // upfront capital expenditure (Uses)
  leaseUpYrs: 0,       // 0 = stabilised from day 1
  entryVacancy: 8,     // vacancy at acquisition (ramps to `vacancy`)
  refiYr: 0,           // 0 = no refinancing
  refiLtv: 65,         // LTV on refinanced value
  refiCap: 5.25,       // cap rate used to value at refi
  refiCosts: 1.0,      // refi costs as % of new loan
  targetIRR: 15,       // hurdle used by break-even analysis
};

export const WF_DEF = {
  lpPct: 90,
  gpPct: 10,
  hurdle: 8,
  catchUp: true,
  t1LP: 80,
  t1GP: 20,
  t2LP: 60,
  t2GP: 40,
  t2EMThreshold: 2.0,
};

const INP_KEYS = [
  "dealName", "assetClass", "preparedBy",
  "grossRev", "vacancy", "opexPct", "noiGrowth",
  "price", "acqCosts", "ltv", "intRate", "amortYrs", "ioYrs",
  "hold", "exitCap", "exitCosts",
  "capex", "leaseUpYrs", "entryVacancy",
  "refiYr", "refiLtv", "refiCap", "refiCosts", "targetIRR",
];

const WF_KEYS = [
  "lpPct", "gpPct", "hurdle", "catchUp",
  "t1LP", "t1GP", "t2LP", "t2GP", "t2EMThreshold",
];

/* ─── Input validation ────────────────────────────────────── */
export function validateInputs(i) {
  const errors = [];
  if (!i.price || i.price <= 0) errors.push("Purchase price must be positive.");
  if (i.grossRev < 0) errors.push("Revenue cannot be negative.");
  if (i.vacancy < 0 || i.vacancy > 100) errors.push("Vacancy must be between 0% and 100%.");
  if (i.opexPct < 0 || i.opexPct > 100) errors.push("OpEx must be between 0% and 100%.");
  if (i.ltv < 0 || i.ltv > 100) errors.push("LTV must be between 0% and 100%.");
  if (i.intRate < 0 || i.intRate > 30) errors.push("Interest rate must be between 0% and 30%.");
  if (i.exitCap <= 0 || i.exitCap > 30) errors.push("Exit cap rate must be between 0% and 30%.");
  if (i.hold < 1 || i.hold > 30) errors.push("Hold period must be between 1 and 30 years.");
  if (i.amortYrs < 1) errors.push("Amortisation must be at least 1 year.");
  if (i.ioYrs < 0 || i.ioYrs > i.hold) errors.push("Interest-only period cannot exceed hold period.");

  const totalAcq = i.price * (1 + i.acqCosts / 100);
  const loan = i.price * i.ltv / 100;
  if (totalAcq - loan <= 0) {
    errors.push("Equity must be positive — reduce LTV or check acquisition costs.");
  }
  return errors;
}

/* ─── Shared levered cash-flow builder ────────────────────── */
export function buildLeveredCFs(i, noiOverride) {
  const HP = Math.max(1, Math.round(i.hold));
  const IO = Math.round(i.ioYrs);
  const AY = Math.max(1, Math.round(i.amortYrs));
  const g = i.noiGrowth / 100;

  const egi = i.grossRev * (1 - i.vacancy / 100);
  const noi = noiOverride ?? egi * (1 - i.opexPct / 100); // stabilised NOI
  const capIn = i.price > 0 ? (noi / i.price) * 100 : 0;

  const capex = Math.max(0, i.capex || 0);
  const totalAcq = i.price * (1 + i.acqCosts / 100) + capex;
  const loan = i.price * i.ltv / 100;
  const equity = totalAcq - loan;
  let annPay = pmt(loan, i.intRate, AY);

  // ── Lease-up: NOI ramps from in-place (entry) to stabilised ──
  const leaseUp = Math.max(0, Math.round(i.leaseUpYrs || 0));
  const entryVac = i.entryVacancy != null ? i.entryVacancy : i.vacancy;
  const entryNOI = i.grossRev * (1 - entryVac / 100) * (1 - i.opexPct / 100);
  const noiAt = (yr) => {
    const grown = noi * (1 + g) ** (yr - 1);
    if (leaseUp <= 0 || yr >= leaseUp) return grown;
    return entryNOI + (grown - entryNOI) * (yr / leaseUp);
  };

  // ── Refinancing (cash-out) ──
  const refiYr = Math.max(0, Math.round(i.refiYr || 0));
  const refiActive = refiYr > 0 && refiYr < HP;
  const refiCapR = i.refiCap != null ? i.refiCap : i.exitCap;
  let refiEvent = null;

  const rows = [];
  const levCF = [-equity];
  const unlevCF = [-totalAcq];
  let bal = loan;

  for (let yr = 1; yr <= HP; yr++) {
    const yrNOI = noiAt(yr);
    const int_ = bal * i.intRate / 100;
    const ds = yr <= IO ? int_ : annPay;
    const prin = yr <= IO ? 0 : Math.max(0, Math.min(ds - int_, bal));
    bal = Math.max(0, bal - prin);

    const dscr = ds > 0 ? yrNOI / ds : null;

    // Refinance at end of year (forward stabilised NOI / refi cap)
    let cashOut = 0;
    if (refiActive && yr === refiYr) {
      const oldBal = bal;
      const refiNOIfwd = noi * (1 + g) ** yr;
      const refiValue = refiCapR > 0 ? refiNOIfwd / (refiCapR / 100) : 0;
      const newLoan = refiValue * (i.refiLtv / 100);
      const refiCostAmt = newLoan * ((i.refiCosts || 0) / 100);
      cashOut = newLoan - oldBal - refiCostAmt;
      bal = newLoan;
      annPay = pmt(newLoan, i.intRate, AY);
      refiEvent = { yr, refiValue, newLoan, oldBal, cashOut };
    }

    const cfads = yrNOI - ds;
    let exitEq = 0;

    if (yr === HP) {
      const xnoi = noi * (1 + g) ** HP;
      const gs = i.exitCap > 0 ? xnoi / (i.exitCap / 100) : 0;
      exitEq = gs * (1 - i.exitCosts / 100) - bal;
      unlevCF.push(yrNOI + gs * (1 - i.exitCosts / 100));
    } else {
      unlevCF.push(yrNOI);
    }

    rows.push({ yr, yrNOI, int: int_, prin, ds, cfads, dscr, bal, exitEq, cashOut });
    levCF.push(cfads + exitEq + cashOut);
  }

  const dscrValues = rows.map((r) => r.dscr).filter((v) => v != null && isFinite(v));
  const minDSCR = dscrValues.length ? Math.min(...dscrValues) : null;
  const minDSCRYear = minDSCR != null ? rows.find((r) => r.dscr === minDSCR)?.yr ?? null : null;

  return {
    egi,
    noi,
    entryNOI,
    capIn,
    loan,
    equity,
    totalAcq,
    capex,
    refiEvent,
    rows,
    levCF,
    unlevCF,
    HP,
    IO,
    minDSCR,
    minDSCRYear,
  };
}

/* ─── Core deal model ─────────────────────────────────────── */
export function computeModel(i) {
  const errors = validateInputs(i);
  const built = buildLeveredCFs(i);
  const { equity, levCF, unlevCF, rows, ...rest } = built;

  const base = {
    ...rest,
    equity,
    rows,
    levCF,
    levIRR: NaN,
    unlevIRR: NaN,
    mom: NaN,
    coc: NaN,
    dscr1: rows[0]?.dscr,
    totalDist: 0,
    valid: false,
    errors: [...errors],
  };

  if (errors.length) return base;
  if (equity <= 0) {
    base.errors.push("Equity must be positive.");
    return base;
  }

  const levIRR = calcIRR(levCF) * 100;
  const unlevIRR = calcIRR(unlevCF) * 100;
  const totalRec = levCF.slice(1).reduce((a, b) => a + b, 0);
  const mom = totalRec / equity;
  const coc = rows[0] ? (rows[0].cfads / equity) * 100 : NaN;

  // Only the equity multiple must be computable for the deal to be shown.
  // A levered IRR can legitimately not exist (e.g. capital is never fully
  // returned, so NPV has no root) — in that case we still surface the full
  // model and render IRR as "N/M" rather than blanking the whole screen.
  if (!isFinite(mom)) {
    base.errors.push("Model produced invalid returns — check LTV, hold period, and exit assumptions.");
    return base;
  }

  const noIRR = !isFinite(levIRR);

  return {
    ...base,
    levIRR,
    unlevIRR,
    mom,
    coc,
    totalDist: totalRec,
    noIRR,
    valid: true,
    errors: [],
  };
}

/* ─── Incremental LP/GP waterfall allocation ─────────────── */
function allocateDistribution(dist, state, wf, lpCap, gpCap, HP) {
  let rem = Math.max(0, dist);
  const yr = { lp: 0, gp: 0 };
  if (rem <= 0) return yr;

  const hurdle = wf.hurdle / 100;
  const t1LP = wf.t1LP / 100, t1GP = wf.t1GP / 100;
  const t2LP = wf.t2LP / 100, t2GP = wf.t2GP / 100;
  const lpPrefTarget = lpCap * ((1 + hurdle) ** HP - 1);

  const lpROC = Math.min(rem, Math.max(0, lpCap - state.lpROC));
  yr.lp += lpROC; state.lpROC += lpROC; rem -= lpROC;

  const gpROC = Math.min(rem, Math.max(0, gpCap - state.gpROC));
  yr.gp += gpROC; state.gpROC += gpROC; rem -= gpROC;

  const lpPref = Math.min(rem, Math.max(0, lpPrefTarget - state.lpPref));
  yr.lp += lpPref; state.lpPref += lpPref; rem -= lpPref;

  if (wf.catchUp && rem > 0 && t1LP > 0) {
    const catchUpTarget = (state.lpPref * t1GP) / t1LP;
    const gpCatch = Math.min(rem, Math.max(0, catchUpTarget - state.gpCatchUp));
    yr.gp += gpCatch; state.gpCatchUp += gpCatch; rem -= gpCatch;
  }

  const lpNeedForT2 = Math.max(0, lpCap * wf.t2EMThreshold - state.lpROC - state.lpPref);
  if (rem > 0 && lpNeedForT2 > 0 && t1LP > 0) {
    const pool = Math.min(rem, lpNeedForT2 / t1LP);
    const lpT1 = pool * t1LP, gpT1 = pool * t1GP;
    yr.lp += lpT1; yr.gp += gpT1;
    state.lpT1 += lpT1; state.gpT1 += gpT1;
    rem -= pool;
  }

  if (rem > 0) {
    const lpT2 = rem * t2LP, gpT2 = rem * t2GP;
    yr.lp += lpT2; yr.gp += gpT2;
    state.lpT2 += lpT2; state.gpT2 += gpT2;
  }

  return yr;
}

/* ─── LP/GP Waterfall ─────────────────────────────────────── */
export function computeWaterfall(M, wf) {
  if (!M.valid) {
    return {
      lpCap: 0, gpCap: 0,
      lpROC: 0, gpROC: 0, lpPref: 0, gpCatchUp: 0,
      lpT1: 0, gpT1: 0, lpT2: 0, gpT2: 0,
      lpTotal: 0, gpTotal: 0, gpPromote: 0,
      lpMoM: 0, gpMoM: 0, lpIRR: NaN, gpIRR: NaN,
      valid: false,
    };
  }

  const { equity, rows, HP } = M;
  const lpPct = wf.lpPct / 100, gpPct = wf.gpPct / 100;
  const lpCap = equity * lpPct, gpCap = equity * gpPct;

  const state = {
    lpROC: 0, gpROC: 0, lpPref: 0, gpCatchUp: 0,
    lpT1: 0, gpT1: 0, lpT2: 0, gpT2: 0,
  };

  const lpCF = [-lpCap];
  const gpCF = [-gpCap];

  for (let yr = 1; yr <= HP; yr++) {
    const row = rows[yr - 1];
    let dist = Math.max(0, row.cfads);
    if (yr === HP) dist += Math.max(0, row.exitEq);

    const split = allocateDistribution(dist, state, wf, lpCap, gpCap, HP);
    lpCF.push(split.lp);
    gpCF.push(split.gp);
  }

  const lpTotal = state.lpROC + state.lpPref + state.lpT1 + state.lpT2;
  const gpTotal = state.gpROC + state.gpCatchUp + state.gpT1 + state.gpT2;
  const gpPromote = state.gpCatchUp + state.gpT1 + state.gpT2;

  return {
    lpCap, gpCap,
    lpROC: state.lpROC, gpROC: state.gpROC,
    lpPref: state.lpPref, gpCatchUp: state.gpCatchUp,
    lpT1: state.lpT1, gpT1: state.gpT1,
    lpT2: state.lpT2, gpT2: state.gpT2,
    lpTotal, gpTotal, gpPromote,
    lpMoM: lpCap > 0 ? lpTotal / lpCap : 0,
    gpMoM: gpCap > 0 ? gpTotal / gpCap : 0,
    lpIRR: lpCap > 0 ? calcIRR(lpCF) * 100 : NaN,
    gpIRR: gpCap > 0 ? calcIRR(gpCF) * 100 : NaN,
    valid: true,
  };
}

/* ─── IRR Sensitivity grid ────────────────────────────────── */
export function buildSens(inp, noi, capsArr, ltvsArr) {
  const b = inp.exitCap;
  const caps = capsArr || [b - 1.5, b - 1, b - 0.5, b, b + 0.5, b + 1];
  const ltvs = ltvsArr || [40, 50, 55, 60, 65, 70];
  const HP = Math.max(1, Math.round(inp.hold));

  const grid = caps.map((ec) =>
    ltvs.map((lv) => {
      const scenario = { ...inp, ltv: lv, exitCap: ec };
      const built = buildLeveredCFs(scenario, noi);
      if (built.equity <= 0) return null;
      const irr = calcIRR(built.levCF) * 100;
      return isFinite(irr) ? irr : null;
    })
  );

  return { caps, ltvs, grid, HP };
}

/* ─── IRR cell colour ─────────────────────────────────────── */
export function irrS(v) {
  if (v == null || !isFinite(v)) return { background: "#f1f5f9", color: "#94a3b8" };
  if (v < 0) return { background: "#be123c", color: "#fff" };
  if (v < 4) return { background: "#fecaca", color: "#7f1d1d" };
  if (v < 8) return { background: "#f87171", color: "#fff" };
  if (v < 12) return { background: "#fed7aa", color: "#7c2d12" };
  if (v < 16) return { background: "#fef9c3", color: "#713f12" };
  if (v < 20) return { background: "#d1fae5", color: "#065f46" };
  if (v < 25) return { background: "#6ee7b7", color: "#064e3b" };
  return { background: "#059669", color: "#fff" };
}

/* ─── Sources & Uses (capital stack) ──────────────────────── */
export function computeSourcesUses(M, i) {
  const acqCostsAmt = i.price * (i.acqCosts / 100);
  const capex = M.capex || 0;

  const uses = [
    { label: "Purchase Price", val: i.price },
    { label: "Acquisition Costs", val: acqCostsAmt },
  ];
  if (capex > 0) uses.push({ label: "Capital Expenditure", val: capex });
  const totalUses = uses.reduce((a, x) => a + x.val, 0);

  const sources = [
    { label: "Senior Debt", val: M.loan, pct: totalUses ? (M.loan / totalUses) * 100 : 0 },
    { label: "Sponsor Equity", val: M.equity, pct: totalUses ? (M.equity / totalUses) * 100 : 0 },
  ];
  const totalSources = M.loan + M.equity;

  return { uses, sources, totalUses, totalSources };
}

/* ─── Returns attribution / value-creation bridge ─────────────
   Exact decomposition of levered equity profit. The components below
   sum identically to (total distributions − equity invested). ────── */
export function computeAttribution(M, i) {
  if (!M.valid) return { valid: false, items: [], profit: 0, equity: 0, totalReturned: 0 };

  const HP = M.HP;
  const g = i.noiGrowth / 100;
  const noiEntry = M.noi;
  const noiExit = noiEntry * (1 + g) ** HP;
  const entryCapF = i.price > 0 ? noiEntry / i.price : 0;     // fraction
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
    { key: "income",   label: "Operating Cash Flow", val: opIncome },
    { key: "noi",      label: "NOI Growth",          val: noiGrowthVal },
    { key: "cap",      label: "Cap Rate Movement",   val: capMoveVal },
    { key: "paydown",  label: "Debt Amortisation",   val: debtPaydown },
  ];
  if (refiProceeds !== 0) items.splice(1, 0, { key: "refi", label: "Refinancing Proceeds", val: refiProceeds });
  items.push({ key: "disposal", label: "Disposal Costs", val: -disposal });
  items.push({ key: "acq", label: "Acquisition Costs", val: -acqCostsAmt });
  if (capex > 0) items.push({ key: "capex", label: "Capital Expenditure", val: -capex });

  const profit = items.reduce((a, x) => a + x.val, 0);
  return { valid: true, items, profit, equity: M.equity, totalReturned: M.totalDist };
}

/* ─── Break-even / "what kills the deal" ──────────────────────
   Numeric root-finding by fine scan + linear interpolation. ───── */
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

/* ─── Single-variable sensitivity (tornado) ───────────────────
   Flexes one driver at a time and measures the swing in levered IRR
   versus the base case. Reuses the verified cash-flow builder so the
   underlying maths is identical to the main model. ──────────────── */
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
    { key: "exitCap",  label: "Exit Cap Rate",  fmt: (v) => `${v}%`,  lo: { exitCap: i.exitCap + 0.75 }, hi: { exitCap: Math.max(0.5, i.exitCap - 0.75) }, loLbl: `+0.75%`, hiLbl: `−0.75%` },
    { key: "noiGrowth", label: "NOI Growth",     fmt: (v) => `${v}%`, lo: { noiGrowth: i.noiGrowth - 1.5 }, hi: { noiGrowth: i.noiGrowth + 1.5 }, loLbl: `−1.5%`, hiLbl: `+1.5%` },
    { key: "intRate",  label: "Interest Rate",  fmt: (v) => `${v}%`,  lo: { intRate: i.intRate + 1 }, hi: { intRate: Math.max(0, i.intRate - 1) }, loLbl: `+1.0%`, hiLbl: `−1.0%` },
    { key: "vacancy",  label: "Vacancy",        fmt: (v) => `${v}%`,  lo: { vacancy: Math.min(100, i.vacancy + 5) }, hi: { vacancy: Math.max(0, i.vacancy - 5) }, loLbl: `+5%`, hiLbl: `−5%` },
    { key: "ltv",      label: "Leverage (LTV)", fmt: (v) => `${v}%`,  lo: { ltv: Math.max(0, i.ltv - 10) }, hi: { ltv: Math.min(95, i.ltv + 10) }, loLbl: `−10%`, hiLbl: `+10%` },
    { key: "price",    label: "Purchase Price", fmt: (v) => v,        lo: { price: i.price * 1.05 }, hi: { price: i.price * 0.95 }, loLbl: `+5%`, hiLbl: `−5%` },
  ];

  const items = drivers.map((d) => {
    const a = irrFor(d.lo);
    const b = irrFor(d.hi);
    const low = Math.min(a, b);
    const high = Math.max(a, b);
    return {
      key: d.key,
      label: d.label,
      low: isFinite(low) ? low : base,
      high: isFinite(high) ? high : base,
      downside: base - (isFinite(low) ? low : base),
      upside: (isFinite(high) ? high : base) - base,
      swing: (isFinite(high) ? high : base) - (isFinite(low) ? low : base),
      loLbl: d.loLbl,
      hiLbl: d.hiLbl,
    };
  });

  items.sort((x, y) => y.swing - x.swing);
  const maxMag = Math.max(
    0.01,
    ...items.map((it) => Math.max(Math.abs(it.downside), Math.abs(it.upside)))
  );
  return { valid: true, base, items, maxMag };
}

/* ─── Scenario analysis (Bear / Base / Bull) ──────────────── */
export const SCENARIOS = {
  bear: { label: "Bear", dCap: 0.75, dGrowth: -1.5, dVac: 4 },
  base: { label: "Base", dCap: 0, dGrowth: 0, dVac: 0 },
  bull: { label: "Bull", dCap: -0.5, dGrowth: 1.0, dVac: -2 },
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

export function computeScenarios(i) {
  return Object.keys(SCENARIOS).map((k) => {
    const M = computeModel(applyScenario(i, k));
    return {
      key: k,
      label: SCENARIOS[k].label,
      levIRR: M.levIRR,
      mom: M.mom,
      equity: M.equity,
      valid: M.valid,
      noIRR: M.noIRR,
    };
  });
}

/* ─── URL state encoding (shareable deals) ─────────────────── */
export function encodeAppState({ inp, wf, tab }) {
  const payload = {
    v: 1,
    tab: tab || "underwriter",
    inp: INP_KEYS.reduce((o, k) => { o[k] = inp[k]; return o; }, {}),
    wf: WF_KEYS.reduce((o, k) => { o[k] = wf[k]; return o; }, {}),
  };
  return utf8ToBase64(JSON.stringify(payload));
}

export function decodeAppState(encoded) {
  if (!encoded) return null;
  try {
    const payload = JSON.parse(base64ToUtf8(encoded));
    if (!payload || payload.v !== 1) return null;

    const inp = { ...DEF };
    INP_KEYS.forEach((k) => {
      if (payload.inp?.[k] !== undefined) inp[k] = payload.inp[k];
    });
    if (payload.inp?.assetClass && AC[payload.inp.assetClass]) {
      inp.assetClass = payload.inp.assetClass;
    }

    const wf = { ...WF_DEF };
    WF_KEYS.forEach((k) => {
      if (payload.wf?.[k] !== undefined) wf[k] = payload.wf[k];
    });

    const tab = ["underwriter", "analysis", "waterfall", "memo"].includes(payload.tab)
      ? payload.tab
      : "underwriter";

    return { inp, wf, tab };
  } catch {
    return null;
  }
}

export function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return decodeAppState(params.get("d"));
}

export function writeStateToUrl({ inp, wf, tab }) {
  const encoded = encodeAppState({ inp, wf, tab });
  const url = new URL(window.location.href);
  url.searchParams.set("d", encoded);
  window.history.replaceState(null, "", url.toString());
}
