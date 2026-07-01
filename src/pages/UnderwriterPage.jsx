import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

import NI from "../components/ui/NI";
import Sec from "../components/ui/Sec";
import MCard from "../components/ui/MCard";
import SourcesUsesCard from "../components/SourcesUsesCard";
import { F } from "../lib/formatters";
import { PAL } from "../constants";
import { AC } from "../lib/config";
import { buildSens2, irrS } from "../lib/sensitivity";

export default function UnderwriterPage({ inp, setInp, M }) {
  const cfg = AC[inp.assetClass] || AC.office;
  const HP_r = M.HP, IO_r = M.IO;
  const num = (k) => (v) => setInp((p) => ({ ...p, [k]: v }));

  const [sensCol, setSensCol] = useState("price");
  const [methOpen, setMethOpen] = useState(false);

  const tk = "#64748b";
  const gk = "#e2e8f0";
  const tt = { background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 10 };
  const exitRowBg  = "#f0fdf4";
  const totalRowBg = "#f1f5f9";

  const SENS = useMemo(() => buildSens2(inp, M.noi, sensCol), [inp, M.noi, sensCol]);

  const chartData = useMemo(() => M.rows.map((d) => ({
    name: `Yr ${d.yr}${d.yr <= IO_r ? " (IO)" : ""}`,
    NOI: Math.round(d.yrNOI),
    "Debt Service": Math.round(d.ds),
    CFADS: Math.round(d.cfads),
    "Exit Equity": Math.round(d.exitEq),
  })), [M.rows, IO_r]);

  // Lead with the minimum (lender's underwriting view), not flattering Year-1 IO coverage.
  // Three severities: breach (<1.0×, red) · thin cushion (1.0–1.2×, amber) · headroom (≥1.2×, green).
  const dscrTier = (v) => v == null ? null
    : v < 1.0 ? { text: "Below 1.00× — covenant breach", cls: "mcard-warn" }
    : v < 1.2 ? { text: "Below 1.20× covenant — thin cushion", cls: "mcard-caution" }
    : { text: "Above 1.20× covenant", cls: "mcard-ok" };
  const dscrSub = dscrTier(M.minDSCR);

  return (
    <div className="page-layout">
      <aside className="sidebar">
        <Sec title="Revenue & NOI">
          <NI id="grossRev" label={cfg.rev} value={inp.grossRev} onChange={num("grossRev")} pfx="€" step="5000" min="0" />
          <NI id="vacancy" label={`${cfg.vac} (%)`} value={inp.vacancy} onChange={num("vacancy")} sfx="%" step="0.5" min="0" max="50" />
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>EGI: {F.eur(M.egi)}</div>
          <NI id="opexPct" label={`${cfg.opx} (% EGI)`} value={inp.opexPct} onChange={num("opexPct")} sfx="%" step="1" min="0" max="80" />
          <div className="highlight-box">
            <div style={{ fontSize: 10, color: "var(--muted)" }}>Net operating income</div>
            <div className="num" style={{ fontSize: 18, fontWeight: 600, color: "var(--green)" }}>{F.eur(M.noi)}</div>
            <div style={{ fontSize: 10, color: "var(--muted)" }}>Entry cap <strong>{F.pct(M.capIn)}</strong></div>
          </div>
          <NI id="noiGrowth" label="NOI Growth (p.a.)" value={inp.noiGrowth} onChange={num("noiGrowth")} sfx="%" step="0.25" min="-5" max="15" />
        </Sec>

        <Sec title="Acquisition">
          <NI id="price" label="Purchase Price" value={inp.price} onChange={num("price")} pfx="€" step="100000" min="1" />
          <NI id="acqCosts" label="Acquisition Costs" value={inp.acqCosts} onChange={num("acqCosts")} sfx="%" step="0.25" min="0" max="10" />
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>Total outlay: {F.eur(M.totalAcq)}</div>
        </Sec>

        <Sec title="Debt Structure">
          <NI id="ltv" label="LTV" value={inp.ltv} onChange={num("ltv")} sfx="%" step="5" min="0" max="100" />
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>
            Loan: {F.eur(M.loan)}<br />Equity: {F.eur(M.equity)}<br />
            Debt yield: {M.debtYield != null ? F.pct(M.debtYield * 100) : "—"}
          </div>
          <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 6 }}>LTV sized on purchase price. Acq. costs &amp; CapEx are 100% equity-funded.</div>
          <NI id="intRate" label="Interest Rate" value={inp.intRate} onChange={num("intRate")} sfx="%" step="0.25" min="0" max="15" />
          <NI id="amortYrs" label="Amortisation (years)" value={inp.amortYrs} onChange={num("amortYrs")} step="1" min="5" max="40" />
          <NI id="ioYrs" label="Interest Only (years)" value={inp.ioYrs} onChange={num("ioYrs")} step="1" min="0" max="10" />
          <div style={{ fontSize: 9, color: "var(--muted)" }}>IO-then-amortising uses full-term payment; residual balloon exits at hold-period end.</div>
          {(inp.assetClass === "development" || (inp.capex > 0 && inp.leaseUpYrs > 0)) && (
            <div style={{ fontSize: 9, color: "var(--muted)", marginTop: 6, lineHeight: 1.5, borderTop: "1px solid var(--line)", paddingTop: 6 }}>
              <strong>Simplification:</strong> debt is sized as LTV on stabilised value. A true
              development / heavy-reposition deal would be sized <em>loan-to-cost</em> with phased
              construction draws and interest during construction — materially changing the early
              debt balance and interest drag.
            </div>
          )}
        </Sec>

        <Sec title="Exit">
          <NI id="hold" label="Hold Period (years)" value={inp.hold} onChange={num("hold")} step="1" min="1" max="15" />
          <NI id="exitCap" label="Exit Cap Rate" value={inp.exitCap} onChange={num("exitCap")} sfx="%" step="0.25" min="1" max="15" />
          <NI id="exitCosts" label="Disposal Costs" value={inp.exitCosts} onChange={num("exitCosts")} sfx="%" step="0.25" min="0" max="5" />
          <div style={{ fontSize: 9, color: "var(--muted)" }}>Exit valued on Year HP+1 (forward) NOI — buyer prices on forward earnings.</div>
        </Sec>

        <Sec title="Capital Expenditure">
          <NI id="capex" label="Upfront CapEx" value={inp.capex} onChange={num("capex")} pfx="€" step="50000" min="0" />
          <div style={{ fontSize: 9, color: "var(--muted)" }}>Added to Uses & equity. 0 = none.</div>
        </Sec>

        <Sec title="Lease-Up (optional)">
          <NI id="leaseUpYrs" label="Lease-Up Period (years)" value={inp.leaseUpYrs} onChange={num("leaseUpYrs")} step="1" min="0" max="10" />
          <NI id="entryVacancy" label="Vacancy at Entry" value={inp.entryVacancy} onChange={num("entryVacancy")} sfx="%" step="1" min="0" max="100" />
          <div style={{ fontSize: 9, color: "var(--muted)" }}>NOI ramps from entry to stabilised. 0 yrs = stabilised day one.</div>
        </Sec>

        <Sec title="Refinancing (optional)">
          <NI id="refiYr" label="Refinance in Year" value={inp.refiYr} onChange={num("refiYr")} step="1" min="0" max={inp.hold - 1} />
          <NI id="refiLtv" label="Refi LTV" value={inp.refiLtv} onChange={num("refiLtv")} sfx="%" step="5" min="0" max="100" />
          <NI id="refiCap" label="Refi Valuation Cap" value={inp.refiCap} onChange={num("refiCap")} sfx="%" step="0.25" min="1" max="15" />
          <NI id="refiCosts" label="Refi Costs" value={inp.refiCosts} onChange={num("refiCosts")} sfx="%" step="0.25" min="0" max="5" />
          <div style={{ fontSize: 9, color: "var(--muted)" }}>0 = no refinancing.</div>
        </Sec>

        <Sec title="Mezzanine / Junior Debt">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>Enable Mezzanine</span>
            <button
              type="button"
              aria-pressed={inp.mezzOn}
              onClick={() => setInp((p) => ({ ...p, mezzOn: !p.mezzOn }))}
              style={{
                background: inp.mezzOn ? PAL.slate : "#e2e8f0",
                color: inp.mezzOn ? "#fff" : "#64748b",
                border: "none", borderRadius: 12, padding: "3px 14px",
                fontWeight: 600, fontSize: 12, cursor: "pointer",
              }}
            >
              {inp.mezzOn ? "ON" : "OFF"}
            </button>
          </div>
          <div style={{ opacity: inp.mezzOn ? 1 : 0.35, pointerEvents: inp.mezzOn ? "auto" : "none" }}>
            <NI id="mezzLtv" label="Mezz LTV (% of price)" value={inp.mezzLtv} onChange={num("mezzLtv")} sfx="%" step="5" min="0" max="30" />
            <NI id="mezzRate" label="Mezz Rate (% p.a.)" value={inp.mezzRate} onChange={num("mezzRate")} sfx="%" step="0.5" min="0" max="30" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: "var(--ink-2)" }}>Interest type</span>
              <button
                type="button"
                aria-pressed={inp.mezzPik}
                onClick={() => setInp((p) => ({ ...p, mezzPik: !p.mezzPik }))}
                style={{
                  background: inp.mezzPik ? "#8b5cf6" : "#e2e8f0",
                  color: inp.mezzPik ? "#fff" : "#64748b",
                  border: "none", borderRadius: 12, padding: "3px 14px",
                  fontWeight: 600, fontSize: 12, cursor: "pointer",
                }}
              >
                {inp.mezzPik ? "PIK" : "Cash"}
              </button>
            </div>
            {inp.mezzOn && (
              <div style={{ fontSize: 9, color: "var(--muted)", lineHeight: 1.5 }}>
                Senior {inp.ltv}% + Mezz {inp.mezzLtv}% → Whole loan {inp.ltv + inp.mezzLtv}% LTV
                {M.mezzLoan > 0 && <span> · {M.mezzPik ? "PIK" : "Cash-pay"} · Mezz: {F.eur(M.mezzLoan)}</span>}
              </div>
            )}
          </div>
        </Sec>
      </aside>

      <div className="main-panel">
        {!M.valid && (
          <div className="card" style={{ marginBottom: 14, color: "#64748b", fontSize: 12 }}>
            Adjust inputs to restore full metrics and charts.
          </div>
        )}

        <div className="hero">
          <div className="hero-head">
            <div>
              <div className="hero-eyebrow">{cfg.name} · {M.HP}-year hold · {inp.ltv}% LTV</div>
              <div className="hero-deal">{inp.dealName || "Untitled deal"}</div>
              {cfg.thesis && (
                <div style={{ fontSize: 11.5, color: "var(--on-folder-dim)", marginTop: 5, maxWidth: "58ch", lineHeight: 1.45 }}>{cfg.thesis}</div>
              )}
            </div>
            <div className={`hero-verdict ${M.valid ? (M.noIRR ? "weak" : M.levIRR >= inp.targetIRR ? "good" : M.levIRR >= 0.66 * inp.targetIRR ? "ok" : "weak") : "weak"}`}>
              {M.valid
                ? M.noIRR ? "Capital not returned"
                  : M.levIRR >= inp.targetIRR ? `Above target (≥${inp.targetIRR}%)`
                  : M.levIRR >= 0.66 * inp.targetIRR ? "Approaching target"
                  : "Below target return"
                : "Inputs incomplete"}
            </div>
          </div>
          <div className="hero-kpis">
            <div className="hero-kpi">
              <div className="hero-kpi-label">Levered IRR</div>
              <div className="hero-kpi-val">{M.noIRR ? "N/M" : F.pct(M.levIRR)}</div>
              <div className="hero-kpi-sub">Unlevered {F.pct(M.unlevIRR)}</div>
            </div>
            <div className="hero-kpi">
              <div className="hero-kpi-label">Equity Multiple</div>
              <div className="hero-kpi-val">{F.mul(M.mom)}</div>
              <div className="hero-kpi-sub">over {M.HP} years</div>
            </div>
            <div className="hero-kpi">
              <div className="hero-kpi-label">Equity Required</div>
              <div className="hero-kpi-val">{F.eur(M.equity)}</div>
              <div className="hero-kpi-sub">{(100 - inp.ltv).toFixed(0)}% of price + costs</div>
            </div>
          </div>
        </div>

        <div className="metric-grid">
          <MCard label="Cash-on-Cash (Year 1)" val={F.pct(M.coc)} sub="CFADS ÷ equity invested" />
          <MCard label="Entry Cap Rate" val={F.pct(M.capIn)}
            sub={`Exit cap ${F.pct(inp.exitCap)} · ${inp.exitCap > M.capIn ? "Cap expansion ↑" : "Cap compression ↓"}`} />
          <MCard label={inp.mezzOn ? "Senior Min DSCR" : "Min DSCR"} val={F.mul(M.minDSCR)}
            sub={dscrSub ? `NOI ÷ debt service · ${dscrSub.text}${M.minDSCRYear != null ? ` (Year ${M.minDSCRYear})` : ""}` : "—"}
            subClass={dscrSub?.cls} />
          <MCard label="Yield on Cost" val={M.yieldOnCost != null ? F.pct(M.yieldOnCost * 100) : "—"}
            sub={M.valueAddSpreadBps != null ? `${M.valueAddSpreadBps >= 0 ? "+" : ""}${M.valueAddSpreadBps.toFixed(0)} bps vs exit cap` : "—"} />
          <MCard label="Debt Yield" val={M.debtYield != null ? F.pct(M.debtYield * 100) : "—"}
            sub="NOI ÷ loan — lender metric" />
        </div>

        {inp.mezzOn && M.valid && (
          <div className="metric-grid" style={{ marginTop: -8 }}>
            <MCard label="Whole-Loan LTV" val={`${M.wholeLoanLTV.toFixed(0)}%`}
              sub={`Senior ${inp.ltv}% + Mezz ${inp.mezzLtv}%`} />
            <MCard label="Blended Debt Rate" val={`${M.blendedDebtRate.toFixed(2)}%`}
              sub={`Senior ${inp.intRate}% · Mezz ${inp.mezzRate}%`} />
            <MCard label="Mezzanine Loan" val={F.eur(M.mezzLoan)}
              sub={inp.mezzPik ? "PIK — accrues to exit" : "Cash-pay — IO bullet"} />
          </div>
        )}

        {inp.mezzOn && M.valid && M.mezzLoan > 0 && (
          <div className="card">
            <div className="card-title">Mezzanine Debt Schedule</div>
            <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 8 }}>
              {inp.mezzPik ? "PIK — interest accrues to balance, repaid at exit." : "Cash-pay — IO bullet, interest paid annually."}
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr style={{ background: totalRowBg }}>
                    {["Year", "Mezz Balance (BOP)", "Interest", inp.mezzPik ? "PIK Added" : "Cash Pay", "Mezz Balance (EOP)"].map((h) => (
                      <th key={h} scope="col" style={{ textAlign: h === "Year" ? "left" : "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {M.rows.map((d) => {
                    const bopBal = d.yr === 1 ? M.mezzLoan : (M.rows[d.yr - 2]?.mezzBal ?? M.mezzLoan);
                    return (
                      <tr key={d.yr} style={{ borderTop: "1px solid #f8fafc", background: d.yr === M.HP ? exitRowBg : "" }}>
                        <td style={{ fontWeight: 500, color: "#475569" }}>{d.yr}{d.yr === M.HP ? " · Exit" : ""}</td>
                        <td style={{ textAlign: "right", color: "#64748b" }}>{F.eur(bopBal)}</td>
                        <td style={{ textAlign: "right", color: "#f87171" }}>({F.eur(d.mezzInterest)})</td>
                        <td style={{ textAlign: "right", color: inp.mezzPik ? "#8b5cf6" : "#f87171" }}>
                          {inp.mezzPik ? `+${F.eur(d.mezzBal - bopBal)}` : `(${F.eur(d.mezzCashPay)})`}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "#475569" }}>{F.eur(d.mezzBal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {M.valid && <SourcesUsesCard inp={inp} M={M} />}

        <div className="card">
          <div className="card-title">Cash Flow &amp; Debt Schedule</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr style={{ background: totalRowBg }}>
                  {["Year", "NOI", "Interest", "Principal", "Debt Service", "CFADS", "DSCR", "Loan Bal.", "Exit Equity"].map((h) => (
                    <th key={h} scope="col" style={{ textAlign: h === "Year" ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: "1px solid #f8fafc" }}>
                  <td style={{ fontWeight: 500, color: "#475569" }}>0 · Acquisition</td>
                  {["—", "—", "—", "—"].map((v, i) => <td key={i} style={{ textAlign: "right", color: "#cbd5e1" }}>{v}</td>)}
                  <td style={{ textAlign: "right", fontWeight: 600, color: "#ef4444" }}>({F.eur(M.equity)})</td>
                  <td style={{ textAlign: "right", color: "#cbd5e1" }}>—</td>
                  <td style={{ textAlign: "right", color: "#64748b" }}>{F.eur(M.loan)}</td>
                  <td style={{ textAlign: "right", color: "#cbd5e1" }}>—</td>
                </tr>
                {M.rows.map((d) => {
                  const isExit = d.yr === HP_r, isIO = d.yr <= IO_r;
                  return (
                    <tr key={d.yr} style={{ borderTop: "1px solid #f8fafc", background: isExit ? exitRowBg : "" }}>
                      <td style={{ fontWeight: 500, color: "#475569" }}>
                        {d.yr}{isIO ? " (IO)" : ""}{isExit ? " · Exit" : ""}
                      </td>
                      <td style={{ textAlign: "right", color: "#334155" }}>{F.eur(d.yrNOI)}</td>
                      <td style={{ textAlign: "right", color: "#f87171" }}>({F.eur(d.int)})</td>
                      <td style={{ textAlign: "right", color: "#fca5a5" }}>({F.eur(d.prin)})</td>
                      <td style={{ textAlign: "right", color: "#ef4444", fontWeight: 500 }}>({F.eur(d.ds)})</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: d.cfads >= 0 ? "#059669" : "#ef4444" }}>{F.eur(d.cfads)}</td>
                      <td style={{
                        textAlign: "right",
                        fontWeight: d.dscr && d.dscr < 1.2 ? 700 : 400,
                        color: d.dscr && d.dscr < 1.2 ? "#ef4444" : "#64748b",
                      }}>
                        {F.mul(d.dscr)}
                      </td>
                      <td style={{ textAlign: "right", color: "#64748b" }}>{F.eur(d.bal)}</td>
                      <td style={{
                        textAlign: "right", fontWeight: 600,
                        color: d.exitEq > 0 ? PAL.green : d.exitEq < 0 ? "#ef4444" : "#cbd5e1",
                      }}>
                        {d.exitEq !== 0 ? F.eur(d.exitEq) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="two-col-grid">
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: 12 }}>Annual Cash Flows</div>
            <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 8 }} aria-hidden="true">IO = Interest Only period</div>
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={chartData} margin={{ top: 0, right: 40, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gk} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: tk }} />
                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: tk }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: tk }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => F.eur(v)} contentStyle={tt} />
                <Legend wrapperStyle={{ fontSize: 9, color: tk }} />
                <Bar yAxisId="left"  dataKey="NOI"          fill={PAL.green}   radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left"  dataKey="Debt Service" fill={PAL.oxblood} radius={[2, 2, 0, 0]} />
                <Bar yAxisId="left"  dataKey="CFADS"        fill={PAL.brass}   radius={[2, 2, 0, 0]} />
                <Bar yAxisId="right" dataKey="Exit Equity"  fill={PAL.slate}   radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <div className="card-title" style={{ fontSize: 12, marginBottom: 0 }}>Levered IRR Sensitivity</div>
              <select
                value={sensCol}
                onChange={(e) => setSensCol(e.target.value)}
                style={{ fontSize: 10, border: "1px solid #e2e8f0", borderRadius: 4, padding: "2px 6px", color: "#475569", background: "var(--surface)" }}
              >
                <option value="price">vs Purchase Price (±%)</option>
                <option value="ltv">vs LTV</option>
                <option value="noiGrowth">vs NOI Growth</option>
              </select>
            </div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 10 }}>
              Exit Cap (rows) ×{" "}
              {sensCol === "price" ? "Purchase Price (±%)" : sensCol === "ltv" ? "LTV" : "NOI Growth"}{" "}
              (cols) ·{" "}
              <span style={{ fontWeight: 600, color: PAL.green }}>
                Current: {F.pct(inp.exitCap)} /{" "}
                {sensCol === "price" ? F.eur(inp.price) : sensCol === "ltv" ? `${inp.ltv}% LTV` : `${inp.noiGrowth}% g`}
              </span>
            </div>
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 320 }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 9, fontWeight: 500, color: "var(--muted)", padding: "3px 5px", textAlign: "left", width: 55 }}>
                      Cap ↓ {sensCol === "ltv" ? "LTV" : sensCol === "price" ? "Price" : "g"} →
                    </th>
                    {SENS.cols.map((c, ci) => (
                      <th key={ci} style={{ fontSize: 10, fontWeight: 600, padding: "3px 4px", textAlign: "center", color: Math.abs(c - SENS.currentCol) < 1e-6 ? PAL.green : "var(--muted)" }}>
                        {SENS.colLabels[ci]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SENS.caps.map((ec, ri) => {
                    const isBase = Math.abs(ec - inp.exitCap) < 0.001;
                    return (
                      <tr key={ri}>
                        <td style={{ padding: "2px 5px", fontSize: 10, fontWeight: isBase ? 700 : 500, color: isBase ? PAL.green : "#475569" }}>
                          {ec.toFixed(2)}%
                        </td>
                        {SENS.grid[ri].map((irr, ci) => {
                          const s = irrS(irr);
                          const active = isBase && Math.abs(SENS.cols[ci] - SENS.currentCol) < 1e-6;
                          return (
                            <td key={ci} style={{
                              padding: "2px 4px", textAlign: "center", fontSize: 10, fontWeight: 600,
                              borderRadius: 4, ...s,
                              outline: active ? "2px solid #1d4ed8" : "none",
                              outlineOffset: "-1px",
                            }}>
                              {irr != null ? `${irr.toFixed(1)}%` : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="legend-row">
              {[["<0%", "#be123c"], ["0–4%", "#fecaca"], ["4–8%", "#f87171"], ["8–12%", "#fed7aa"],
                ["12–16%", "#fef9c3"], ["16–20%", "#d1fae5"], ["20–25%", "#6ee7b7"], [">25%", "#059669"]].map(([l, bg]) => (
                <div key={l} className="legend-item">
                  <div className="legend-swatch" style={{ background: bg }} aria-hidden="true" />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="card">
          <button
            type="button"
            onClick={() => setMethOpen((o) => !o)}
            aria-expanded={methOpen}
            aria-controls="methodology-list"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              width: "100%", background: "none", border: "none", padding: 0, textAlign: "left",
            }}
          >
            <span className="card-title" style={{ marginBottom: 0 }}>Methodology &amp; Key Assumptions</span>
            <span style={{ color: "var(--muted)", fontSize: 11, userSelect: "none" }} aria-hidden="true">{methOpen ? "▲" : "▼"}</span>
          </button>
          {methOpen && (
            <ul id="methodology-list" style={{ fontSize: 11, color: "#64748b", lineHeight: 1.75, marginTop: 10, paddingLeft: 18 }}>
              <li>Exit value = forward (year +1) NOI ÷ exit cap rate.</li>
              <li>Leverage sized on purchase price (LTV); acquisition costs and capex are equity-funded.</li>
              <li>Preferred return accrues on committed capital (outstanding-capital method), not a simple coupon.</li>
              <li>Interest-only loans carry a balloon balance at exit, repaid from sale proceeds.</li>
              <li>A refinance re-sizes the loan on the revaluation cap and restarts the amortisation schedule.</li>
              <li>Years with a net cash shortfall are funded as pro-rata LP/GP capital calls in the waterfall.</li>
              <li>DSCR is computed on cash debt service; PIK mezzanine interest accrues and is repaid at exit.</li>
              <li>IRR solved numerically (Newton-Raphson with bisection fallback).</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
