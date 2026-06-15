// ============================================================
// calculations.js — Core financial logic
// ============================================================

/* ─── IRR (Newton-Raphson solver) ─────────────────────────── */
export function calcIRR(cfs, g = 0.1) {
  let r = g;
  for (let i = 0; i < 400; i++) {
    let f = 0, df = 0;
    cfs.forEach((c, t) => {
      const d = (1 + r) ** t;
      f  += c / d;
      df -= t * c / (d * (1 + r));
    });
    if (!isFinite(f) || Math.abs(df) < 1e-14) break;
    const r2 = r - f / df;
    if (Math.abs(r2 - r) < 1e-9) return r2;
    r = Math.max(-0.99, Math.min(50, r2));
  }
  return r;
}

/* ─── Annuity payment (PMT equivalent) ───────────────────── */
export function pmt(P, rPct, n) {
  const r = rPct / 100;
  if (!r || !n) return n ? P / n : 0;
  return P * r * (1 + r) ** n / ((1 + r) ** n - 1);
}

/* ─── Number formatters ───────────────────────────────────── */
export const F = {
  pct: (v, d = 1) => isFinite(v) ? `${(+v).toFixed(d)}%` : "—",
  mul: v          => isFinite(v) ? `${(+v).toFixed(2)}×`  : "—",
  eur: v => {
    if (!isFinite(v)) return "—";
    const s = v < 0 ? "−" : "", a = Math.abs(v);
    return a >= 1e6 ? `${s}€${(a / 1e6).toFixed(2)}M`
         : a >= 1e3 ? `${s}€${(a / 1e3).toFixed(0)}K`
         : `${s}€${a.toFixed(0)}`;
  },
};

/* ─── Asset class config ──────────────────────────────────── */
export const AC = {
  office:      { name:"Office",                 rev:"Passing Rent",        vac:"Void Allowance",       opx:"Non-Recoverable Costs" },
  residential: { name:"Residential / BTR",      rev:"Gross Rent Roll",     vac:"Vacancy & Bad Debt",   opx:"Operating Expenses"    },
  hospitality: { name:"Hospitality",            rev:"Total Hotel Revenue", vac:"Mgmt & Franchise Fees",opx:"Hotel Operating Costs" },
  retail:      { name:"Retail / Mixed-Use",     rev:"Gross Passing Rent",  vac:"Vacancy Allowance",    opx:"Non-Recoverable OpEx"  },
  industrial:  { name:"Industrial / Logistics", rev:"Contracted Rent",     vac:"Void Allowance",       opx:"Property Running Costs"},
  development: { name:"Development (BTS/BTR)",  rev:"GDV / End Value",     vac:"Stabilisation Disc.", opx:"Construction Costs"    },
};

/* ─── Default input values ────────────────────────────────── */
export const DEF = {
  dealName:"Porto Office – Value Add", assetClass:"office",
  grossRev:700000, vacancy:8, opexPct:20, noiGrowth:3,
  price:9000000, acqCosts:2,
  ltv:60, intRate:4.5, amortYrs:25, ioYrs:2,
  hold:5, exitCap:5.25, exitCosts:1.5,
  preparedBy:"",
};

export const WF_DEF = {
  lpPct:90, gpPct:10, hurdle:8, catchUp:true,
  t1LP:80, t1GP:20, t2LP:60, t2GP:40, t2EMThreshold:2.0,
};

/* ─── Core deal model ─────────────────────────────────────── */
export function computeModel(i) {
  const HP = Math.max(1, Math.round(i.hold));
  const IO = Math.round(i.ioYrs);
  const AY = Math.max(1, Math.round(i.amortYrs));

  const egi   = i.grossRev * (1 - i.vacancy / 100);
  const noi   = egi * (1 - i.opexPct / 100);
  const capIn = i.price > 0 ? noi / i.price * 100 : 0;

  const totalAcq = i.price * (1 + i.acqCosts / 100);
  const loan     = i.price * i.ltv / 100;
  const equity   = totalAcq - loan;
  const annPay   = pmt(loan, i.intRate, AY);

  const rows = [], levCF = [-equity], unlevCF = [-totalAcq];
  let bal = loan;

  for (let yr = 1; yr <= HP; yr++) {
    const yrNOI = noi * (1 + i.noiGrowth / 100) ** (yr - 1);
    const int_  = bal * i.intRate / 100;
    const ds    = yr <= IO ? int_ : annPay;
    const prin  = yr <= IO ? 0 : Math.max(0, Math.min(ds - int_, bal));
    bal = Math.max(0, bal - prin);

    const cfads = yrNOI - ds;
    const dscr  = ds > 0 ? yrNOI / ds : null;
    let exitEq  = 0;

    if (yr === HP) {
      const xnoi = noi * (1 + i.noiGrowth / 100) ** HP;
      const gs   = i.exitCap > 0 ? xnoi / (i.exitCap / 100) : 0;
      exitEq = gs * (1 - i.exitCosts / 100) - bal;
      unlevCF.push(yrNOI + gs * (1 - i.exitCosts / 100));
    } else {
      unlevCF.push(yrNOI);
    }

    rows.push({ yr, yrNOI, int:int_, prin, ds, cfads, dscr, bal, exitEq });
    levCF.push(cfads + exitEq);
  }

  const levIRR   = calcIRR(levCF)   * 100;
  const unlevIRR = calcIRR(unlevCF) * 100;
  const totalRec = levCF.slice(1).reduce((a, b) => a + b, 0);
  const mom      = equity > 0 ? totalRec / equity : NaN;
  const coc      = equity > 0 && rows[0] ? rows[0].cfads / equity * 100 : NaN;

  return {
    egi, noi, capIn, loan, equity, totalAcq,
    levIRR, unlevIRR, mom, coc,
    dscr1: rows[0]?.dscr,
    rows, levCF,
    totalDist: totalRec,
    HP, IO,
  };
}

/* ─── LP/GP Waterfall ─────────────────────────────────────── */
export function computeWaterfall(M, wf) {
  const { equity, totalDist, HP } = M;
  const lpPct  = wf.lpPct  / 100,  gpPct  = wf.gpPct  / 100;
  const hurdle = wf.hurdle / 100;
  const t1LP   = wf.t1LP   / 100,  t1GP   = wf.t1GP   / 100;
  const t2LP   = wf.t2LP   / 100,  t2GP   = wf.t2GP   / 100;
  const lpCap  = equity * lpPct,   gpCap  = equity * gpPct;

  let rem = Math.max(0, totalDist);

  const lpROC = Math.min(rem, lpCap); rem -= lpROC;
  const gpROC = Math.min(rem, gpCap); rem -= gpROC;

  const lpPref = Math.min(rem, lpCap * ((1 + hurdle) ** HP - 1)); rem -= lpPref;

  let gpCatchUp = 0;
  if (wf.catchUp && rem > 0 && t1LP > 0) {
    gpCatchUp = Math.min(rem, lpPref * t1GP / t1LP); rem -= gpCatchUp;
  }

  let lpT1 = 0, gpT1 = 0;
  const lpNeedForT2 = Math.max(0, lpCap * wf.t2EMThreshold - lpROC - lpPref);
  if (rem > 0 && lpNeedForT2 > 0 && t1LP > 0) {
    const pool = Math.min(rem, lpNeedForT2 / t1LP);
    lpT1 = pool * t1LP; gpT1 = pool * t1GP; rem -= pool;
  }

  const lpT2 = rem * t2LP, gpT2 = rem * t2GP;

  const lpTotal   = lpROC + lpPref + lpT1 + lpT2;
  const gpTotal   = gpROC + gpCatchUp + gpT1 + gpT2;
  const gpPromote = gpCatchUp + gpT1 + gpT2;

  const z = (cap, total) =>
    cap > 0 ? calcIRR([-cap, ...Array(HP - 1).fill(0), total]) * 100 : 0;

  return {
    lpCap, gpCap,
    lpROC, gpROC,
    lpPref, gpCatchUp,
    lpT1, gpT1,
    lpT2, gpT2,
    lpTotal, gpTotal, gpPromote,
    lpMoM: lpCap > 0 ? lpTotal / lpCap : 0,
    gpMoM: gpCap > 0 ? gpTotal / gpCap : 0,
    lpIRR: z(lpCap, lpTotal),
    gpIRR: z(gpCap, gpTotal),
  };
}

/* ─── IRR Sensitivity grid ────────────────────────────────── */
export function buildSens(inp, noi, capsArr, ltvsArr) {
  const b    = inp.exitCap;
  const caps = capsArr || [b-1.5, b-1, b-0.5, b, b+0.5, b+1];
  const ltvs = ltvsArr || [40, 50, 55, 60, 65, 70];
  const HP   = Math.max(1, Math.round(inp.hold));
  const IO   = Math.round(inp.ioYrs);
  const AY   = Math.max(1, Math.round(inp.amortYrs));

  const grid = caps.map(ec => ltvs.map(lv => {
    const lo = inp.price * lv / 100;
    const eq = inp.price * (1 + inp.acqCosts / 100) - lo;
    if (eq <= 0) return null;
    const ap  = pmt(lo, inp.intRate, AY);
    const cfs = [-eq]; let bl = lo;

    for (let yr = 1; yr <= HP; yr++) {
      const yrN = noi * (1 + inp.noiGrowth / 100) ** (yr - 1);
      const it  = bl * inp.intRate / 100;
      const ds  = yr <= IO ? it : ap;
      const pr  = yr <= IO ? 0 : Math.max(0, Math.min(ds - it, bl));
      bl = Math.max(0, bl - pr);
      let ex = 0;
      if (yr === HP) {
        const xn = noi * (1 + inp.noiGrowth / 100) ** HP;
        ex = (ec > 0 ? xn / (ec / 100) : 0) * (1 - inp.exitCosts / 100) - bl;
      }
      cfs.push(yrN - ds + ex);
    }
    const irr = calcIRR(cfs) * 100;
    return isFinite(irr) ? irr : null;
  }));

  return { caps, ltvs, grid };
}

/* ─── IRR cell colour ─────────────────────────────────────── */
export function irrS(v) {
  if (v == null || !isFinite(v)) return { background:"#f1f5f9", color:"#94a3b8" };
  if (v <  0) return { background:"#be123c", color:"#fff" };
  if (v <  8) return { background:"#f87171", color:"#fff" };
  if (v < 12) return { background:"#fed7aa", color:"#7c2d12" };
  if (v < 16) return { background:"#fef9c3", color:"#713f12" };
  if (v < 20) return { background:"#d1fae5", color:"#065f46" };
  if (v < 25) return { background:"#6ee7b7", color:"#064e3b" };
  return             { background:"#059669", color:"#fff"    };
}
