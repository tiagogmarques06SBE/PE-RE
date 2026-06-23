import { calcIRR } from "./irr";

// IRR-based hurdle via the "outstanding capital account" method.
// state.lpHurdle starts at lpCap, compounds at the hurdle rate each period,
// and is reduced by every LP receipt (ROC first, then pref). When it reaches
// zero the IRR hurdle is cleared. This is mathematically equivalent to an IRR
// test: -lpCap + Σ lpReceipts_i / (1+h)^i = 0.
function allocateDistribution(dist, state, wf, lpCap, gpCap) {
  let rem = Math.max(0, dist);
  const yr = { lp: 0, gp: 0 };
  if (rem <= 0) return yr;

  const t1LP = wf.t1LP / 100, t1GP = wf.t1GP / 100;
  const t2LP = wf.t2LP / 100, t2GP = wf.t2GP / 100;

  // 1. Return of LP capital
  const lpROC = Math.min(rem, Math.max(0, lpCap - state.lpROC));
  yr.lp += lpROC; state.lpROC += lpROC; rem -= lpROC;
  state.lpHurdle -= lpROC; // returning capital reduces the outstanding hurdle balance

  // 2. Return of GP capital
  const gpROC = Math.min(rem, Math.max(0, gpCap - state.gpROC));
  yr.gp += gpROC; state.gpROC += gpROC; rem -= gpROC;

  // 3. LP preferred return — pays down the compounded hurdle balance
  const lpPref = Math.min(rem, Math.max(0, state.lpHurdle));
  yr.lp += lpPref; state.lpPref += lpPref;
  state.lpHurdle -= lpPref; rem -= lpPref;

  // 4. GP catch-up (if enabled)
  if (wf.catchUp && rem > 0 && t1LP > 0) {
    const catchUpTarget = (state.lpPref * t1GP) / t1LP;
    const gpCatch = Math.min(rem, Math.max(0, catchUpTarget - state.gpCatchUp));
    yr.gp += gpCatch; state.gpCatchUp += gpCatch; rem -= gpCatch;
  }

  // 5. Tier 1 split — until LP cumulative receipts reach T2 EM threshold.
  // Fix: subtract ALL prior LP receipts (ROC + pref + T1 + T2 already paid).
  const lpNeedForT2 = Math.max(
    0,
    lpCap * wf.t2EMThreshold - state.lpROC - state.lpPref - state.lpT1 - state.lpT2
  );
  if (rem > 0 && lpNeedForT2 > 0 && t1LP > 0) {
    const pool = Math.min(rem, lpNeedForT2 / t1LP);
    const lpT1 = pool * t1LP, gpT1 = pool * t1GP;
    yr.lp += lpT1; yr.gp += gpT1;
    state.lpT1 += lpT1; state.gpT1 += gpT1;
    rem -= pool;
  }

  // 6. Tier 2 split (above EM threshold)
  if (rem > 0) {
    const lpT2 = rem * t2LP, gpT2 = rem * t2GP;
    yr.lp += lpT2; yr.gp += gpT2;
    state.lpT2 += lpT2; state.gpT2 += gpT2;
  }

  return yr;
}

export function computeWaterfall(M, wf) {
  if (!M.valid) {
    return {
      lpCap: 0, gpCap: 0, lpCalled: 0, gpCalled: 0,
      lpROC: 0, gpROC: 0, lpPref: 0, gpCatchUp: 0,
      lpT1: 0, gpT1: 0, lpT2: 0, gpT2: 0,
      lpTotal: 0, gpTotal: 0, gpPromote: 0,
      lpMoM: 0, gpMoM: 0, lpIRR: NaN, gpIRR: NaN,
      valid: false,
    };
  }

  const { equity, rows, HP } = M;
  const hurdle = wf.hurdle / 100;
  const lpPct = wf.lpPct / 100, gpPct = wf.gpPct / 100;
  // Capital is mutable: a year with a net cash shortfall is a capital call, which
  // adds to each partner's contributed capital (split by commitment ratio).
  let lpCap = equity * lpPct, gpCap = equity * gpPct;
  let lpCalled = 0, gpCalled = 0;

  const state = {
    lpROC: 0, gpROC: 0,
    lpPref: 0, gpCatchUp: 0,
    lpT1: 0, gpT1: 0, lpT2: 0, gpT2: 0,
    // IRR hurdle account: starts at committed capital, compounds at hurdle rate each year,
    // reduced by LP receipts. Reaches zero exactly when LP IRR = hurdle rate.
    lpHurdle: lpCap,
  };

  const lpCF = [-lpCap];
  const gpCF = [-gpCap];

  for (let yr = 1; yr <= HP; yr++) {
    // Compound the hurdle account before this period's distributions
    state.lpHurdle *= (1 + hurdle);

    const row = rows[yr - 1];
    // Net partner cash for the year = operating cash + refi proceeds (+ exit equity in
    // the final year). This mirrors the deal-level levered cash flow exactly, so that
    // LP + GP cash flows reconcile to the deal CF period-by-period.
    const net = row.cfads + (row.cashOut || 0) + (yr === HP ? row.exitEq : 0);

    if (net >= 0) {
      const split = allocateDistribution(net, state, wf, lpCap, gpCap);
      lpCF.push(split.lp);
      gpCF.push(split.gp);
    } else {
      // Capital call: partners fund the shortfall pro-rata to commitment. The new
      // capital lifts each partner's ROC target and the LP's outstanding-capital
      // hurdle account (so it correctly accrues preferred return thereafter).
      const lpCall = -net * lpPct, gpCall = -net * gpPct;
      lpCap += lpCall; gpCap += gpCall;
      lpCalled += lpCall; gpCalled += gpCall;
      state.lpHurdle += lpCall;
      lpCF.push(-lpCall);
      gpCF.push(-gpCall);
    }
  }

  const lpTotal = state.lpROC + state.lpPref + state.lpT1 + state.lpT2;
  const gpTotal = state.gpROC + state.gpCatchUp + state.gpT1 + state.gpT2;
  const gpPromote = state.gpCatchUp + state.gpT1 + state.gpT2;

  return {
    lpCap, gpCap,
    lpCalled, gpCalled,
    lpROC: state.lpROC, gpROC: state.gpROC,
    lpPref: state.lpPref, gpCatchUp: state.gpCatchUp,
    lpT1: state.lpT1, gpT1: state.gpT1,
    lpT2: state.lpT2, gpT2: state.gpT2,
    lpTotal, gpTotal, gpPromote,
    lpMoM: lpCap > 0 ? lpTotal / lpCap : 0,
    gpMoM: gpCap > 0 ? gpTotal / gpCap : 0,
    lpIRR: lpCap > 0 ? calcIRR(lpCF) * 100 : NaN,
    gpIRR: gpCap > 0 ? calcIRR(gpCF) * 100 : NaN,
    lpCF, gpCF,
    valid: true,
  };
}
