import { useMemo } from "react";
import { F } from "../lib/formatters";
import { BRAND } from "../constants";
import { AC } from "../lib/config";
import { computeAttribution, computeBreakeven } from "../lib/analysis";

const MONO  = "'IBM Plex Mono', monospace";
const SANS  = "Inter, system-ui, sans-serif";
const SERIF = "Fraunces, Georgia, serif";
const GREEN = "#059669";

function classify(t) {
  if (!t || t < 9)  return "Core";
  if (t < 13)       return "Core-Plus";
  if (t < 18)       return "Value-Add";
  return "Opportunistic";
}

function bps(v) {
  if (v == null || !isFinite(v)) return "—";
  const n = Math.round(v);
  return n >= 0 ? `+${n} bps` : `${n} bps`;
}

function p2(v) { return F.pct(v, 2); }
function p1(v) { return F.pct(v, 1); }

function attrV(items, key) {
  return items?.find(i => i.key === key)?.val ?? 0;
}

export default function MemoExportPage({ inp, M }) {
  const A  = useMemo(() => computeAttribution(M, inp), [M, inp]);
  const BE = useMemo(() => computeBreakeven(inp),       [inp]);

  const today    = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  const assetLbl = AC[inp.assetClass]?.name || "Real Estate";
  const strategy = classify(inp.targetIRR);
  const prepBy   = inp.preparedBy || "Investments Team";

  const bg     = "#ffffff";
  const border = "#d1d5db";
  const ink    = "#111827";
  const muted  = "#64748b";
  const faint  = "#f8fafc";

  const secH = {
    fontSize: 11, fontWeight: 700, color: ink, fontFamily: SANS,
    marginBottom: 10, marginTop: 0,
  };
  const body = { fontSize: 11.5, color: ink, lineHeight: 1.8, fontFamily: SANS, margin: 0 };

  if (!M.valid) {
    return (
      <div className="memo-page">
        <div className="memo-control-bar no-print">
          <span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600, fontFamily: SERIF }}>IC Memo</span>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>Save as PDF</button>
        </div>
        <div className="memo-preview-wrap">
          <div className="memo-doc" style={{ background: bg, borderColor: border, padding: "40px 44px", color: muted, fontFamily: SANS, fontSize: 13 }}>
            Adjust model inputs to generate the memorandum.
          </div>
        </div>
      </div>
    );
  }

  // ── Derived figures ─────────────────────────────────────────────────────────
  const grossProfit    = (M.totalDist || 0) - (M.equity || 0);
  const exitNOI        = M.noi * Math.pow(1 + inp.noiGrowth / 100, M.HP);
  const dySpreadBps    = M.debtYield != null ? Math.round((M.debtYield * 100 - inp.intRate) * 100) : null;
  const cushionBps     = BE.capAtTarget != null ? Math.round((BE.capAtTarget - inp.exitCap) * 100) : null;
  const zeroCushionBps = BE.capAtZero   != null ? Math.round((BE.capAtZero   - inp.exitCap) * 100) : null;

  const capexOverrun = M.capex > 0 ? (() => {
    const newYoC = M.noi / (M.totalAcq + M.capex * 0.1);
    return { overcost: M.capex * 0.1, lossBps: Math.round((M.yieldOnCost - newYoC) * 10000) };
  })() : null;

  // ── Business plan prose ─────────────────────────────────────────────────────
  const businessPlan = (() => {
    const parts = [];

    if (strategy === "Core") {
      parts.push(
        `The asset is acquired fully stabilised at ${p2(M.capIn)} with NOI of ${F.eur(M.noi)} ` +
        `and ${p1(inp.vacancy)} void. ` +
        `The plan is income-led: manage in place, renew leases at passing rents, and grow NOI at ` +
        `${p1(inp.noiGrowth)}% per annum. No capital expenditure is underwritten.`
      );
    } else if (strategy === "Core-Plus") {
      if (inp.leaseUpYrs > 0) {
        parts.push(
          `The plan targets a ${inp.leaseUpYrs}-year lease-up from ${p1(inp.entryVacancy)} entry ` +
          `vacancy to ${p1(inp.vacancy)} stabilised, with NOI then growing at ${p1(inp.noiGrowth)}% per annum.`
        );
      } else {
        parts.push(
          `The strategy is light asset management from a near-stabilised ${p1(inp.vacancy)} void position, ` +
          `growing NOI at ${p1(inp.noiGrowth)}% per annum.`
        );
      }
      if (M.capex > 0) {
        parts.push(`Capital expenditure of ${F.eur(M.capex)} is budgeted for targeted condition improvements.`);
      }
    } else if (strategy === "Value-Add") {
      if (inp.leaseUpYrs > 0) {
        parts.push(
          `Returns are driven by active repositioning. ` +
          `The plan underwrites a lease-up from ${p1(inp.entryVacancy)} entry vacancy to ` +
          `${p1(inp.vacancy)} stabilised over ${inp.leaseUpYrs} year${inp.leaseUpYrs > 1 ? "s" : ""}, ` +
          `with ${p1(inp.noiGrowth)}% NOI growth compounding thereafter.`
        );
      } else {
        parts.push(
          `The business plan grows NOI at ${p1(inp.noiGrowth)}% per annum ` +
          `from a going-in position of ${p1(inp.vacancy)} void.`
        );
      }
      if (M.capex > 0) {
        parts.push(`Capital expenditure of ${F.eur(M.capex)} funds the refurbishment programme required to support the lease-up.`);
      }
      if (M.yieldOnCost != null && M.valueAddSpreadBps != null) {
        parts.push(
          `Stabilised NOI of ${F.eur(M.noi)} reflects a ${p2(M.yieldOnCost * 100)}% yield on total cost, ` +
          `${bps(M.valueAddSpreadBps)} ahead of the ${p2(inp.exitCap)}% exit cap, providing a spread buffer at disposal.`
        );
      }
    } else {
      parts.push(
        `The plan is intensive repositioning: occupancy recovers from ${p1(inp.entryVacancy)} to ` +
        `${p1(inp.vacancy)} over ${inp.leaseUpYrs > 0 ? inp.leaseUpYrs + " years" : "the hold"}, ` +
        `with ${p1(inp.noiGrowth)}% per annum NOI growth underwritten through active leasing.`
      );
      if (M.capex > 0) {
        parts.push(`Capital expenditure of ${F.eur(M.capex)} funds structural and fit-out works.`);
      }
    }

    if (inp.refiYr > 0 && M.refiEvent) {
      const { cashOut } = M.refiEvent;
      parts.push(
        `A Year-${inp.refiYr} refinancing at ${p1(inp.refiLtv)}% LTV on a ${p2(inp.refiCap)}% ` +
        `revaluation cap is underwritten` +
        (cashOut > 0 ? `, releasing ${F.eur(cashOut)} to equity` : "") + `.`
      );
    }

    parts.push(
      `Disposal in Year ${M.HP} at ${p2(inp.exitCap)}% on forward NOI of ${F.eur(exitNOI)} ` +
      `implies gross proceeds of ${F.eur(M.exitGross)}, before ${p1(inp.exitCosts)}% disposal costs.`
    );

    return parts.join(" ");
  })();

  // ── Attribution paragraph ───────────────────────────────────────────────────
  const attrPara = (() => {
    if (!A?.items?.length) return "";
    const pos = [];
    const opI  = attrV(A.items, "income");
    const noiG = attrV(A.items, "noi");
    const capM = attrV(A.items, "cap");
    const payd = attrV(A.items, "paydown");
    const refi = attrV(A.items, "refi");

    if (opI  > 1000) pos.push(`operating cash flow of ${F.eur(opI)}`);
    if (noiG > 1000) pos.push(`NOI growth at exit (${F.eur(noiG)})`);
    if (Math.abs(capM) > 1000) {
      pos.push(`cap-rate movement ${capM > 0 ? `contributing ${F.eur(capM)}` : `detracting ${F.eur(Math.abs(capM))}`}`);
    }
    if (payd > 1000) pos.push(`debt amortisation of ${F.eur(payd)}`);
    if (refi > 1000) pos.push(`refinancing proceeds of ${F.eur(refi)}`);

    const neg = [];
    const acqC = attrV(A.items, "acq");
    const disp = attrV(A.items, "disposal");
    const capx = attrV(A.items, "capex");
    const mezz = attrV(A.items, "mezz");
    if (acqC < -500) neg.push(`acquisition costs (${F.eur(Math.abs(acqC))})`);
    if (disp < -500) neg.push(`disposal costs (${F.eur(Math.abs(disp))})`);
    if (capx < -500) neg.push(`capital expenditure (${F.eur(Math.abs(capx))})`);
    if (mezz < -500) neg.push(`mezzanine financing costs (${F.eur(Math.abs(mezz))})`);

    let para = `Of the ${F.eur(A.profit)} gross equity profit, `;
    if (pos.length) para += pos.join(", ") + ".";
    if (neg.length) para += ` The principal deductions are ${neg.join(" and ")}.`;
    return para;
  })();

  // ── Financing paragraph ─────────────────────────────────────────────────────
  const finPara = (() => {
    const parts = [];
    parts.push(
      `Senior debt of ${F.eur(M.loan)} (${p1(inp.ltv)}% LTV) is priced at ${p2(inp.intRate)}, ` +
      `with a ${inp.ioYrs}-year IO period and ${inp.amortYrs}-year amortisation schedule.`
    );
    if (dySpreadBps != null) {
      parts.push(
        `Day-one debt yield is ${p2(M.debtYield * 100)}%, ` +
        `${Math.abs(dySpreadBps)} bps ${dySpreadBps >= 0 ? "above" : "below"} the coupon.`
      );
    }
    if (M.minDSCR != null) {
      parts.push(`Senior DSCR troughs at ${F.mul(M.minDSCR)} in Year ${M.minDSCRYear}.`);
    }
    if (inp.mezzOn && M.mezzLoan > 0) {
      parts.push(
        `A mezzanine tranche of ${F.eur(M.mezzLoan)} (${p1(inp.mezzLtv)}% LTV, ${p2(inp.mezzRate)}%, ` +
        `${inp.mezzPik ? "PIK" : "cash-pay"}) brings whole-loan LTV to ${p1(M.wholeLoanLTV)}% ` +
        `and blended cost to ${p2(M.blendedDebtRate)}.`
      );
      if (M.minWholeLoanDSCR != null) {
        parts.push(`Whole-loan DSCR troughs at ${F.mul(M.minWholeLoanDSCR)}.`);
      }
    }
    if (inp.refiYr > 0 && M.refiEvent) {
      const { newLoan, cashOut } = M.refiEvent;
      parts.push(
        `The Year-${inp.refiYr} refinancing produces a new loan of ${F.eur(newLoan)}` +
        (cashOut > 0 ? `, returning ${F.eur(cashOut)} to equity` : "") + `.`
      );
    }
    return parts.join(" ");
  })();

  // ── Risks ───────────────────────────────────────────────────────────────────
  const risks = [];

  let exitRiskText = `Exit at ${p2(inp.exitCap)}% on forward NOI is the primary return driver.`;
  if (cushionBps != null) {
    exitRiskText += ` The ${p1(inp.targetIRR)}% target return holds to a ${p2(BE.capAtTarget)} cap — ${cushionBps} bps of outward shift from the underwritten level.`;
  }
  if (zeroCushionBps != null) {
    exitRiskText += ` Capital is returned in full to a ${p2(BE.capAtZero)} cap (${zeroCushionBps} bps total cushion before loss of principal).`;
  }
  exitRiskText += " A sustained repricing beyond these levels would impair equity.";
  risks.push({
    label: "Exit cap / market repricing",
    text: exitRiskText,
    mitigant: M.valueAddSpreadBps != null
      ? `${bps(M.valueAddSpreadBps)} spread of yield on cost over exit cap provides a partial pricing buffer.`
      : "Sensitivity analysis available in the Underwriting tab.",
  });

  if (inp.leaseUpYrs > 0) {
    risks.push({
      label: "Lease-up execution",
      text: `The plan requires occupancy to recover from ${p1(inp.entryVacancy)} to ${p1(inp.vacancy)} within ${inp.leaseUpYrs} year${inp.leaseUpYrs > 1 ? "s" : ""}. Extended void periods or rents below underwriting would suppress NOI and delay exit.`,
      mitigant: `Year-1 senior DSCR of ${F.mul(M.dscr1)} and cash-on-cash of ${p1(M.coc)}% provide hold-period headroom during the occupancy ramp.`,
    });
  }

  if (inp.ltv >= 65 || inp.mezzOn || inp.refiYr > 0) {
    let finRisk = `Senior DSCR troughs at ${F.mul(M.minDSCR)} in Year ${M.minDSCRYear}`;
    if (inp.mezzOn && M.minWholeLoanDSCR != null) finRisk += `; whole-loan DSCR troughs at ${F.mul(M.minWholeLoanDSCR)}`;
    finRisk += ".";
    if (inp.refiYr > 0) finRisk += ` The Year-${inp.refiYr} refinancing carries execution risk if credit markets deteriorate.`;
    risks.push({
      label: "Financing and coverage",
      text: finRisk,
      mitigant: dySpreadBps != null
        ? `Debt yield of ${p2(M.debtYield * 100)}% sits ${Math.abs(dySpreadBps)} bps ${dySpreadBps >= 0 ? "above" : "below"} the coupon.`
        : "Senior debt yield covers the coupon on day-one NOI.",
    });
  }

  if (M.capex > 0 && capexOverrun) {
    risks.push({
      label: "Capital expenditure",
      text: `The ${F.eur(M.capex)} capital programme carries cost-overrun and delivery risk. A 10% overrun (${F.eur(capexOverrun.overcost)}) reduces yield on cost by approximately ${capexOverrun.lossBps} bps.`,
      mitigant: "Independent cost-consultant sign-off required before drawdown.",
    });
  }

  risks.push({
    label: "Liquidity and hold extension",
    text: `Office investment volumes are sensitive to interest-rate cycles. Inability to sell at ${p2(inp.exitCap)}% in Year ${M.HP} would either extend the hold or reduce net proceeds.`,
    mitigant: BE.maxPriceTarget != null
      ? `The maximum entry price consistent with the ${p1(inp.targetIRR)}% target return is ${F.eur(BE.maxPriceTarget)}, versus an acquisition at ${F.eur(inp.price)}.`
      : "Break-even analysis available in the Analysis tab.",
  });

  // ── Table helpers ───────────────────────────────────────────────────────────
  const TR = ({ label, val, bold }) => (
    <tr style={{ borderBottom: `1px solid ${faint}` }}>
      <td style={{ padding: "4px 14px 4px 0", fontSize: 10.5, color: muted, fontFamily: SANS, width: "55%" }}>{label}</td>
      <td style={{ padding: "4px 0", fontSize: 11.5, fontWeight: bold ? 700 : 500, color: ink, fontFamily: MONO, textAlign: "right" }}>{val}</td>
    </tr>
  );
  const TG = ({ label }) => (
    <tr>
      <td colSpan={2} style={{ paddingTop: 12, paddingBottom: 3, fontSize: 10.5, fontWeight: 600, color: muted, fontFamily: SANS, borderBottom: `1px solid ${border}` }}>{label}</td>
    </tr>
  );

  const SEC = ({ title, children, last, noBreak }) => (
    <div style={{ padding: "20px 44px", ...(last ? {} : { borderBottom: `1px solid ${border}` }), ...(noBreak ? { breakInside: "avoid", pageBreakInside: "avoid" } : {}) }}>
      <p style={secH}>{title}</p>
      {children}
    </div>
  );

  return (
    <div className="memo-page">
      <div className="memo-control-bar no-print">
        <span style={{ color: "#f8fafc", fontSize: 13, fontWeight: 600, fontFamily: SERIF }}>IC Memo</span>
        <div style={{ flex: 1 }} />
        {inp.preparedBy && <span style={{ color: "#94a3b8", fontSize: 11, fontFamily: SANS }}>{inp.preparedBy}</span>}
        <button type="button" className="btn btn-primary" onClick={() => window.print()} aria-label="Save as PDF">
          Save as PDF
        </button>
      </div>

      <div className="memo-preview-wrap">
        <div className="memo-doc" style={{ background: bg, borderColor: border }}>

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <div style={{ padding: "28px 44px 22px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: muted, fontFamily: SANS }}>
                Private &amp; Confidential — Investment Committee Memorandum
              </span>
              <span style={{ fontSize: 10, color: muted, fontFamily: MONO, flexShrink: 0, marginLeft: 16 }}>{today}</span>
            </div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: ink, fontFamily: SERIF, lineHeight: 1.1, marginBottom: 10 }}>
              {inp.dealName || "Untitled Deal"}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: muted, fontFamily: SANS }}>
                {assetLbl}
                <span style={{ margin: "0 8px", opacity: 0.35 }}>·</span>
                {strategy}
                <span style={{ margin: "0 8px", opacity: 0.35 }}>·</span>
                <strong style={{ color: ink }}>For Approval</strong>
              </span>
              <span style={{ fontSize: 10, color: muted, fontFamily: SANS, whiteSpace: "nowrap" }}>
                Prepared by <strong style={{ color: ink }}>{prepBy}</strong>
              </span>
            </div>
          </div>
          <div style={{ borderTop: `2px solid ${ink}` }} />

          {/* ── 1. RECOMMENDATION ──────────────────────────────────────────── */}
          <SEC title="Recommendation">
            <p style={body}>
              We recommend the Committee approve an equity commitment of{" "}
              <strong style={{ fontFamily: MONO }}>{F.eur(M.equity)}</strong>{" "}
              to acquire {inp.dealName || "the asset"}, {assetLbl.toLowerCase()}, for{" "}
              <strong style={{ fontFamily: MONO }}>{F.eur(inp.price)}</strong>.{" "}
              The plan targets a{" "}
              <strong style={{ color: GREEN, fontFamily: MONO }}>{F.pct(M.levIRR)}</strong>{" "}
              gross levered IRR and{" "}
              <strong style={{ color: GREEN, fontFamily: MONO }}>{F.mul(M.mom)}</strong>{" "}
              equity multiple over a {M.HP}-year hold, underwritten to a{" "}
              <strong style={{ fontFamily: MONO }}>{p2(inp.exitCap)}</strong>{" "}
              exit cap rate on forward NOI.{" "}
              The deal is classified <strong>{strategy}</strong> against a {p1(inp.targetIRR)}% target return.
            </p>
          </SEC>

          {/* ── 2. TRANSACTION SUMMARY ─────────────────────────────────────── */}
          <SEC title="Transaction Summary">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 40px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <TG label="Acquisition" />
                  <TR label="Purchase price"                          val={F.eur(inp.price)} />
                  <TR label={`Acquisition costs (${p1(inp.acqCosts)})`} val={F.eur(inp.price * inp.acqCosts / 100)} />
                  {M.capex > 0 && <TR label="Capital expenditure"    val={F.eur(M.capex)} />}
                  <TR label="Total capitalisation"                    val={F.eur(M.totalAcq)} bold />
                  <TR label="Sponsor equity"                          val={F.eur(M.equity)} bold />
                  <TG label="Pricing" />
                  <TR label="Hold period"                             val={`${inp.hold} years`} />
                  <TR label="Going-in cap rate"                       val={p2(M.capIn)} />
                  <TR label="Exit cap rate"                           val={p2(inp.exitCap)} />
                  {M.yieldOnCost != null && <TR label="Yield on cost" val={p2(M.yieldOnCost * 100)} />}
                  {M.valueAddSpreadBps != null && <TR label="Value-add spread" val={bps(M.valueAddSpreadBps)} />}
                  {inp.refiYr > 0 && <TR label="Refinancing"         val={`Year ${inp.refiYr} @ ${p1(inp.refiLtv)}% LTV`} />}
                </tbody>
              </table>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <TG label="Senior Debt" />
                  <TR label="Loan amount"      val={`${F.eur(M.loan)} (${p1(inp.ltv)}% LTV)`} />
                  <TR label="Rate / IO / amort" val={`${p2(inp.intRate)} / ${inp.ioYrs}yr IO / ${inp.amortYrs}yr`} />
                  {M.debtYield != null && <TR label="Debt yield" val={p2(M.debtYield * 100)} />}
                  {M.minDSCR != null && <TR label="Min senior DSCR" val={`${F.mul(M.minDSCR)} (Year ${M.minDSCRYear})`} />}
                  <TR label={`DSCR, Year 1${inp.ioYrs > 0 ? " (IO)" : ""}`} val={F.mul(M.dscr1)} />
                  {inp.mezzOn && M.mezzLoan > 0 && <>
                    <TG label="Mezzanine" />
                    <TR label="Loan amount"    val={`${F.eur(M.mezzLoan)} (${p1(inp.mezzLtv)}% LTV)`} />
                    <TR label="Rate / type"    val={`${p2(inp.mezzRate)} / ${inp.mezzPik ? "PIK" : "cash-pay"}`} />
                    <TR label="Blended cost"   val={p2(M.blendedDebtRate)} />
                    <TR label="Whole-loan LTV" val={p1(M.wholeLoanLTV)} />
                    {M.minWholeLoanDSCR != null && <TR label="Min WL DSCR" val={F.mul(M.minWholeLoanDSCR)} />}
                  </>}
                </tbody>
              </table>
            </div>
          </SEC>

          {/* ── 3. BUSINESS PLAN ──────────────────────────────────────────── */}
          <SEC title="Business Plan">
            <p style={body}>{businessPlan}</p>
          </SEC>

          {/* ── 4. RETURNS & VALUE CREATION ──────────────────────────────── */}
          <SEC title="Returns &amp; Value Creation" noBreak>
            <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "0 40px", alignItems: "start" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {[
                    { label: "Levered IRR",     val: M.noIRR ? "N/M" : F.pct(M.levIRR), color: GREEN },
                    { label: "Unlevered IRR",   val: F.pct(M.unlevIRR) },
                    { label: "Equity multiple", val: F.mul(M.mom), color: GREEN },
                    { label: "Cash-on-Cash Y1", val: F.pct(M.coc) },
                    { label: "Equity invested", val: F.eur(M.equity) },
                    { label: "Total returned",  val: F.eur(M.totalDist) },
                    { label: "Gross profit",    val: F.eur(grossProfit), color: GREEN, bold: true },
                  ].map(({ label, val, color, bold }) => (
                    <tr key={label} style={{ borderBottom: `1px solid ${faint}` }}>
                      <td style={{ padding: "4px 12px 4px 0", fontSize: 10.5, color: muted, fontFamily: SANS }}>{label}</td>
                      <td style={{ padding: "4px 0", fontSize: 12, fontWeight: bold ? 700 : 600, color: color || ink, fontFamily: MONO, textAlign: "right" }}>{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ ...body, fontSize: 11 }}>{attrPara}</p>
            </div>
          </SEC>

          {/* ── 5. FINANCING ─────────────────────────────────────────────── */}
          <SEC title="Financing" noBreak>
            <p style={body}>{finPara}</p>
          </SEC>

          {/* ── 6. KEY RISKS & MITIGANTS ─────────────────────────────────── */}
          <SEC title="Key Risks &amp; Mitigants">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {["Risk", "Description", "Mitigant"].map((h, i) => (
                    <th key={h} style={{
                      width: i === 0 ? "22%" : undefined,
                      padding: "3px 12px 6px" + (i === 2 ? " 0" : " 0"),
                      textAlign: "left", fontSize: 10, fontWeight: 600,
                      color: muted, fontFamily: SANS,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {risks.map(({ label, text, mitigant }) => (
                  <tr key={label} style={{ borderBottom: `1px solid ${faint}`, verticalAlign: "top" }}>
                    <td style={{ padding: "7px 12px 7px 0", fontSize: 10.5, fontWeight: 600, color: ink, fontFamily: SANS, lineHeight: 1.5 }}>{label}</td>
                    <td style={{ padding: "7px 12px 7px 0", fontSize: 10.5, color: ink, fontFamily: SANS, lineHeight: 1.6 }}>{text}</td>
                    <td style={{ padding: "7px 0", fontSize: 10.5, color: muted, fontFamily: SANS, lineHeight: 1.6 }}>{mitigant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SEC>

          {/* ── 7. RECOMMENDATION & CONDITIONS ───────────────────────────── */}
          <SEC title="Recommendation &amp; Conditions Precedent" last noBreak>
            <p style={{ ...body, marginBottom: 14 }}>
              We recommend approval of the {F.eur(M.equity)} equity commitment on the terms stated above.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: ink, fontFamily: SANS, lineHeight: 2.0 }}>
              <li>Satisfactory completion of confirmatory legal, technical and environmental due diligence.</li>
              <li>Binding financing term sheet received and lender credit committee approval obtained.</li>
              <li>Final execution of sale and purchase agreement at the agreed acquisition price.</li>
              <li>No material adverse change to property condition, title or planning position prior to closing.</li>
            </ul>
          </SEC>

          {/* ── FOOTER ──────────────────────────────────────────────────────── */}
          <div style={{ borderTop: `2px solid ${ink}`, padding: "12px 44px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24, flexWrap: "wrap" }}>
              <span style={{ fontSize: 8.5, color: muted, fontFamily: SANS, lineHeight: 1.6, maxWidth: 460 }}>
                This document is private and confidential. Prepared for illustrative purposes only; it does not constitute an offer or advice. All figures are model outputs based on stated assumptions. Past performance is not indicative of future results.
              </span>
              <span style={{ fontSize: 8.5, color: muted, fontFamily: SANS, textAlign: "right", flexShrink: 0, lineHeight: 1.6 }}>
                <a href={BRAND.url} style={{ color: muted, textDecoration: "none", fontWeight: 600 }}>{BRAND.name}</a>
                <span style={{ display: "block" }}>Exit = fwd NOI ÷ cap rate · IRR: Newton-Raphson</span>
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
