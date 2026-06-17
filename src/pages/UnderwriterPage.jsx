import { useMemo } from "react";
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
import { buildSens, irrS } from "../lib/sensitivity";

export default function UnderwriterPage({ inp, setInp, M, dark }) {
  const cfg = AC[inp.assetClass] || AC.office;
  const HP_r = M.HP, IO_r = M.IO;
  const num = (k) => (v) => setInp((p) => ({ ...p, [k]: v }));

  const tk = dark ? "#94a3b8" : "#64748b";
  const gk = dark ? "#334155" : "#e2e8f0";
  const tt = dark
    ? { background: "#1e293b", border: "1px solid #334155", color: "#f1f5f9", fontSize: 10 }
    : { background: "#ffffff", border: "1px solid #e2e8f0", color: "#0f172a", fontSize: 10 };
  const exitRowBg  = dark ? "#022c22" : "#f0fdf4";
  const totalRowBg = dark ? "#1e293b" : "#f1f5f9";

  const SENS = useMemo(() => {
    const b = inp.exitCap;
    return buildSens(inp, M.noi, [b - 1.5, b - 1, b - 0.5, b, b + 0.5, b + 1], [40, 50, 55, 60, 65, 70]);
  }, [inp, M.noi]);

  const chartData = useMemo(() => M.rows.map((d) => ({
    name: `Yr ${d.yr}${d.yr <= IO_r ? " (IO)" : ""}`,
    NOI: Math.round(d.yrNOI),
    "Debt Service": Math.round(d.ds),
    CFADS: Math.round(d.cfads),
    "Exit Equity": Math.round(d.exitEq),
  })), [M.rows, IO_r]);

  const dscrSub = M.dscr1 != null
    ? M.dscr1 < 1.2
      ? { text: "Below 1.20× covenant", cls: "mcard-warn" }
      : { text: "Above 1.20× covenant", cls: "mcard-ok" }
    : null;

  return (
    <div className="page-layout">
      <aside className="sidebar">
        <Sec title="Revenue & NOI">
          <NI id="grossRev" label={cfg.rev} value={inp.grossRev} onChange={num("grossRev")} pfx="€" step="5000" min="0" />
          <NI id="vacancy" label={`${cfg.vac} (%)`} value={inp.vacancy} onChange={num("vacancy")} sfx="%" step="0.5" min="0" max="50" />
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>EGI: {F.eur(M.egi)}</div>
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
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>Total outlay: {F.eur(M.totalAcq)}</div>
        </Sec>

        <Sec title="Debt Structure">
          <NI id="ltv" label="LTV" value={inp.ltv} onChange={num("ltv")} sfx="%" step="5" min="0" max="100" />
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>
            Loan: {F.eur(M.loan)}<br />Equity: {F.eur(M.equity)}
          </div>
          <NI id="intRate" label="Interest Rate" value={inp.intRate} onChange={num("intRate")} sfx="%" step="0.25" min="0" max="15" />
          <NI id="amortYrs" label="Amortisation (years)" value={inp.amortYrs} onChange={num("amortYrs")} step="1" min="5" max="40" />
          <NI id="ioYrs" label="Interest Only (years)" value={inp.ioYrs} onChange={num("ioYrs")} step="1" min="0" max="10" />
        </Sec>

        <Sec title="Exit">
          <NI id="hold" label="Hold Period (years)" value={inp.hold} onChange={num("hold")} step="1" min="1" max="15" />
          <NI id="exitCap" label="Exit Cap Rate" value={inp.exitCap} onChange={num("exitCap")} sfx="%" step="0.25" min="1" max="15" />
          <NI id="exitCosts" label="Disposal Costs" value={inp.exitCosts} onChange={num("exitCosts")} sfx="%" step="0.25" min="0" max="5" />
        </Sec>

        <Sec title="Capital Expenditure">
          <NI id="capex" label="Upfront CapEx" value={inp.capex} onChange={num("capex")} pfx="€" step="50000" min="0" />
          <div style={{ fontSize: 9, color: "#94a3b8" }}>Added to Uses & equity. 0 = none.</div>
        </Sec>

        <Sec title="Lease-Up (optional)">
          <NI id="leaseUpYrs" label="Lease-Up Period (years)" value={inp.leaseUpYrs} onChange={num("leaseUpYrs")} step="1" min="0" max="10" />
          <NI id="entryVacancy" label="Vacancy at Entry" value={inp.entryVacancy} onChange={num("entryVacancy")} sfx="%" step="1" min="0" max="100" />
          <div style={{ fontSize: 9, color: "#94a3b8" }}>NOI ramps from entry to stabilised. 0 yrs = stabilised day one.</div>
        </Sec>

        <Sec title="Refinancing (optional)">
          <NI id="refiYr" label="Refinance in Year" value={inp.refiYr} onChange={num("refiYr")} step="1" min="0" max={inp.hold - 1} />
          <NI id="refiLtv" label="Refi LTV" value={inp.refiLtv} onChange={num("refiLtv")} sfx="%" step="5" min="0" max="100" />
          <NI id="refiCap" label="Refi Valuation Cap" value={inp.refiCap} onChange={num("refiCap")} sfx="%" step="0.25" min="1" max="15" />
          <NI id="refiCosts" label="Refi Costs" value={inp.refiCosts} onChange={num("refiCosts")} sfx="%" step="0.25" min="0" max="5" />
          <div style={{ fontSize: 9, color: "#94a3b8" }}>0 = no refinancing.</div>
        </Sec>
      </aside>

      <div className="main-panel">
        {!M.valid && (
          <div className="card" style={{ marginBottom: 14, color: "#64748b", fontSize: 12 }}>
            Adjust inputs to restore full metrics and charts.
          </div>
        )}

        <div className="hero">
          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-head">
            <div>
              <div className="hero-eyebrow">{cfg.name} · {M.HP}-year hold · {inp.ltv}% LTV</div>
              <div className="hero-deal">{inp.dealName || "Untitled deal"}</div>
            </div>
            <div className={`hero-verdict ${M.valid ? (M.levIRR >= 15 ? "good" : M.levIRR >= 10 ? "ok" : "weak") : "weak"}`}>
              {M.valid
                ? M.noIRR ? "Capital not returned"
                  : M.levIRR >= 15 ? "Above target return"
                  : M.levIRR >= 10 ? "Moderate return"
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
          <MCard hi label="Levered IRR" val={F.pct(M.levIRR)} sub={`Unlevered IRR: ${F.pct(M.unlevIRR)}`} />
          <MCard label="Equity Multiple (MoM)" val={F.mul(M.mom)} sub={`Equity: ${F.eur(M.equity)}`} />
          <MCard label="Cash-on-Cash (Year 1)" val={F.pct(M.coc)} sub="CFADS ÷ equity invested" />
          <MCard label="Entry Cap Rate" val={F.pct(M.capIn)}
            sub={`Exit cap ${F.pct(inp.exitCap)} · ${inp.exitCap > M.capIn ? "Cap expansion ↑" : "Cap compression ↓"}`} />
          <MCard label="DSCR — Year 1" val={F.mul(M.dscr1)}
            sub={dscrSub ? `${dscrSub.text}${M.minDSCR != null ? ` · Min ${F.mul(M.minDSCR)} (Yr ${M.minDSCRYear})` : ""}` : "—"}
            subClass={dscrSub?.cls} />
          <MCard label="Equity Required" val={F.eur(M.equity)} sub={`${(100 - inp.ltv).toFixed(0)}% of price + costs`} />
        </div>

        {M.valid && <SourcesUsesCard inp={inp} M={M} />}

        <div className="card">
          <div className="card-title">Cash Flow &amp; Debt Schedule</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr style={{ background: totalRowBg }}>
                  {["Year", "NOI", "Interest", "Principal", "Debt Service", "CFADS", "DSCR", "Loan Bal.", "Exit Equity"].map((h) => (
                    <th key={h} style={{ textAlign: h === "Year" ? "left" : "right" }}>{h}</th>
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
            <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 8 }} aria-hidden="true">IO = Interest Only period</div>
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gk} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: tk }} />
                <YAxis tick={{ fontSize: 9, fill: tk }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v) => F.eur(v)} contentStyle={tt} />
                <Legend wrapperStyle={{ fontSize: 9, color: tk }} />
                <Bar dataKey="NOI"          fill={PAL.green}   radius={[2, 2, 0, 0]} />
                <Bar dataKey="Debt Service" fill={PAL.oxblood} radius={[2, 2, 0, 0]} />
                <Bar dataKey="CFADS"        fill={PAL.brass}   radius={[2, 2, 0, 0]} />
                <Bar dataKey="Exit Equity"  fill={PAL.slate}   radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: 12 }}>Levered IRR Sensitivity</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 10 }}>
              Exit Cap (rows) × LTV (cols) ·{" "}
              <span style={{ fontWeight: 600, color: PAL.green }}>
                Current: {F.pct(inp.exitCap)} / {inp.ltv}% LTV
              </span>
            </div>
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 320 }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 9, fontWeight: 500, color: "#94a3b8", padding: "3px 5px", textAlign: "left", width: 55 }}>
                      Cap ↓ LTV →
                    </th>
                    {SENS.ltvs.map((l) => (
                      <th key={l} style={{ fontSize: 10, fontWeight: 600, padding: "3px 4px", textAlign: "center", color: l === inp.ltv ? PAL.green : "#94a3b8" }}>
                        {l}%
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
                          const active = isBase && SENS.ltvs[ci] === inp.ltv;
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
      </div>
    </div>
  );
}
