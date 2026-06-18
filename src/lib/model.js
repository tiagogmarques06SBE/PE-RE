import { calcIRR, pmt } from "./irr";

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
  if (i.mezzOn) {
    if ((i.mezzRate || 0) < 0 || (i.mezzRate || 0) > 30) errors.push("Mezzanine rate must be between 0% and 30%.");
    if ((i.mezzLtv || 0) < 0) errors.push("Mezzanine LTV must be non-negative.");
  }

  const totalAcq = i.price * (1 + i.acqCosts / 100);
  const loan = i.price * i.ltv / 100;
  const mezzLoan = i.mezzOn ? i.price * ((i.mezzLtv || 0) / 100) : 0;
  if (totalAcq - loan - mezzLoan <= 0) {
    errors.push("Equity must be positive — reduce leverage or check acquisition costs.");
  }
  return errors;
}

export function buildLeveredCFs(i, noiOverride) {
  const HP = Math.max(1, Math.round(i.hold));
  const IO = Math.round(i.ioYrs);
  const AY = Math.max(1, Math.round(i.amortYrs));
  const g = i.noiGrowth / 100;

  const egi = i.grossRev * (1 - i.vacancy / 100);
  const noi = noiOverride ?? egi * (1 - i.opexPct / 100);
  const capIn = i.price > 0 ? (noi / i.price) * 100 : 0;

  const capex = Math.max(0, i.capex || 0);
  const totalAcq = i.price * (1 + i.acqCosts / 100) + capex;
  const loan = i.price * i.ltv / 100;

  const mezzLoan = i.mezzOn ? i.price * ((i.mezzLtv || 0) / 100) : 0;
  const mezzRate = (i.mezzRate || 0) / 100;
  const mezzPik = !!(i.mezzOn && i.mezzPik);

  const equity = totalAcq - loan - mezzLoan;
  let annPay = pmt(loan, i.intRate, AY);

  const leaseUp = Math.max(0, Math.round(i.leaseUpYrs || 0));
  const entryVac = i.entryVacancy != null ? i.entryVacancy : i.vacancy;
  const entryNOI = i.grossRev * (1 - entryVac / 100) * (1 - i.opexPct / 100);
  const noiAt = (yr) => {
    const grown = noi * (1 + g) ** (yr - 1);
    if (leaseUp <= 0 || yr >= leaseUp) return grown;
    return entryNOI + (grown - entryNOI) * (yr / leaseUp);
  };

  const refiYr = Math.max(0, Math.round(i.refiYr || 0));
  const refiActive = refiYr > 0 && refiYr < HP;
  const refiCapR = i.refiCap != null ? i.refiCap : i.exitCap;
  let refiEvent = null;
  let exitGross = 0;

  const rows = [];
  const levCF = [-equity];
  const unlevCF = [-totalAcq];
  let bal = loan;
  let mezzBal = mezzLoan;

  for (let yr = 1; yr <= HP; yr++) {
    const yrNOI = noiAt(yr);
    const int_ = bal * i.intRate / 100;
    const ds = yr <= IO ? int_ : annPay;
    const prin = yr <= IO ? 0 : Math.max(0, Math.min(ds - int_, bal));
    bal = Math.max(0, bal - prin);

    const dscr = ds > 0 ? yrNOI / ds : null;

    // Mezzanine: interest accrues, then either PIK (compounds) or cash-pay
    const mezzInterest = mezzBal * mezzRate;
    let mezzCashPay = 0;
    if (i.mezzOn) {
      if (mezzPik) {
        mezzBal = mezzBal * (1 + mezzRate); // PIK: balance compounds, no cash out
      } else {
        mezzCashPay = mezzInterest; // cash-pay: IO bullet, balance unchanged
      }
    }

    const wholeLoanDS = ds + mezzCashPay;
    const wholeLoanDSCR = wholeLoanDS > 0 ? yrNOI / wholeLoanDS : null;

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

    const cfads = yrNOI - ds - mezzCashPay;
    let exitEq = 0;

    if (yr === HP) {
      const xnoi = noi * (1 + g) ** HP;
      exitGross = i.exitCap > 0 ? xnoi / (i.exitCap / 100) : 0;
      exitEq = exitGross * (1 - i.exitCosts / 100) - bal - mezzBal;
      unlevCF.push(yrNOI + exitGross * (1 - i.exitCosts / 100));
    } else {
      unlevCF.push(yrNOI);
    }

    rows.push({ yr, yrNOI, int: int_, prin, ds, cfads, dscr, wholeLoanDSCR, bal, exitEq, cashOut, mezzInterest, mezzCashPay, mezzBal });
    levCF.push(cfads + exitEq + cashOut);
  }

  const dscrValues = rows.map((r) => r.dscr).filter((v) => v != null && isFinite(v));
  const minDSCR = dscrValues.length ? Math.min(...dscrValues) : null;
  const minDSCRYear = minDSCR != null ? rows.find((r) => r.dscr === minDSCR)?.yr ?? null : null;

  const wlDscrValues = rows.map((r) => r.wholeLoanDSCR).filter((v) => v != null && isFinite(v));
  const minWholeLoanDSCR = wlDscrValues.length ? Math.min(...wlDscrValues) : null;

  const totalDebt = loan + mezzLoan;
  const blendedDebtRate = totalDebt > 0
    ? (loan * (i.intRate || 0) + mezzLoan * (i.mezzRate || 0)) / totalDebt
    : 0;
  const wholeLoanLTV = (i.ltv || 0) + (i.mezzOn ? (i.mezzLtv || 0) : 0);

  return {
    egi, noi, entryNOI, capIn,
    loan, mezzLoan, equity, totalAcq, capex,
    refiEvent, exitGross,
    rows, levCF, unlevCF, HP, IO,
    minDSCR, minDSCRYear, minWholeLoanDSCR,
    blendedDebtRate, wholeLoanLTV,
  };
}

export function computeModel(i) {
  const errors = validateInputs(i);
  const built = buildLeveredCFs(i);
  const { equity, levCF, unlevCF, rows, ...rest } = built;

  const yieldOnCost = rest.totalAcq > 0 ? rest.noi / rest.totalAcq : null;
  const debtYield = rest.loan > 0 ? rest.noi / rest.loan : null;
  const valueAddSpreadBps = yieldOnCost != null ? (yieldOnCost - i.exitCap / 100) * 10000 : null;

  const base = {
    ...rest,
    equity,
    rows,
    levCF,
    yieldOnCost,
    debtYield,
    valueAddSpreadBps,
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

  if (!isFinite(mom)) {
    base.errors.push("Model produced invalid returns — check LTV, hold period, and exit assumptions.");
    return base;
  }

  const noIRR = !isFinite(levIRR);

  return { ...base, levIRR, unlevIRR, mom, coc, totalDist: totalRec, noIRR, valid: true, errors: [] };
}
