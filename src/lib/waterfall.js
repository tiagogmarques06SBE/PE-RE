import { calcIRR } from "./irr";

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

  const state = { lpROC: 0, gpROC: 0, lpPref: 0, gpCatchUp: 0, lpT1: 0, gpT1: 0, lpT2: 0, gpT2: 0 };
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
