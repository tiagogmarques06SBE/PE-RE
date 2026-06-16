// ============================================================
// App.jsx — UI only. All financial logic lives in calculations.js
// ============================================================

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

import {
  F, AC, DEF, WF_DEF,
  computeModel, computeWaterfall, buildSens, irrS,
  readStateFromUrl, writeStateToUrl,
} from "./calculations";

import "../styles.css"

const TABS = [
  { id: "underwriter", label: "Underwriter", icon: "📊" },
  { id: "waterfall", label: "Waterfall / Promote", icon: "🏦" },
  { id: "memo", label: "Memo Export", icon: "📄" },
];

const BRAND = {
  name: "Tiago Marques",
  url: "https://peretiago.netlify.app",
  tagline: "Built by Tiago Marques · Nova SBE",
};

/* ─── Shared UI ───────────────────────────────────────────── */
function NI({ id, label, value, onChange, pfx, sfx, step = "0.01", min, max }) {
  // Local typing buffer so the user can freely delete/retype digits
  // (a fully-controlled numeric input fights every keystroke otherwise).
  const [text, setText] = useState(String(value));

  useEffect(() => {
    // Only resync from outside (e.g. Reset button) when not actively diverging
    if (parseFloat(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e) => {
    const raw = e.target.value;
    setText(raw);
    if (raw === "" || raw === "-" || raw === ".") return;
    const n = parseFloat(raw);
    if (isNaN(n)) return;
    if (min != null && n < +min) return;
    if (max != null && n > +max) return;
    onChange(n);
  };

  const handleBlur = () => {
    const n = parseFloat(text);
    if (text === "" || isNaN(n)) {
      setText(String(value));
      return;
    }
    let clamped = n;
    if (min != null && clamped < +min) clamped = +min;
    if (max != null && clamped > +max) clamped = +max;
    if (clamped !== n) onChange(clamped);
    setText(String(clamped));
  };

  return (
    <div className="ni-wrap">
      <label className="ni-label" htmlFor={id}>{label}</label>
      <div className="ni-row">
        {pfx && <span className="ni-affix">{pfx}</span>}
        <input
          id={id}
          type="number"
          className="ni-input"
          value={text}
          step={step}
          min={min}
          max={max}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {sfx && <span className="ni-affix">{sfx}</span>}
      </div>
    </div>
  );
}

function Sec({ title, children }) {
  return (
    <div className="sec">
      <div className="sec-title">{title}</div>
      {children}
    </div>
  );
}

function MCard({ label, val, sub, hi, subClass }) {
  return (
    <div className={`mcard${hi ? " hi" : ""}`}>
      <div className="mcard-label">{label}</div>
      <div className="mcard-val">{val}</div>
      {sub && <div className={`mcard-sub${subClass ? ` ${subClass}` : ""}`}>{sub}</div>}
    </div>
  );
}

function ErrorBanner({ errors }) {
  if (!errors?.length) return null;
  return (
    <div className="error-banner" role="alert">
      <strong>Cannot compute returns</strong>
      {errors.map((e, i) => <div key={i}>{e}</div>)}
    </div>
  );
}

function InvalidPanel({ message }) {
  return (
    <div className="main-panel">
      <div className="card" style={{ color: "#64748b", fontSize: 13 }}>
        {message || "Adjust inputs in the sidebar to see outputs."}
      </div>
    </div>
  );
}

/* ─── Page 1 — Underwriter ────────────────────────────────── */
function UnderwriterPage({ inp, setInp, M }) {
  const cfg = AC[inp.assetClass] || AC.office;
  const HP_r = M.HP, IO_r = M.IO;
  const num = k => v => setInp(p => ({ ...p, [k]: v }));

  const SENS = useMemo(() => {
    const b = inp.exitCap;
    return buildSens(inp, M.noi, [b - 1.5, b - 1, b - 0.5, b, b + 0.5, b + 1], [40, 50, 55, 60, 65, 70]);
  }, [inp, M.noi]);

  const chartData = useMemo(() => M.rows.map(d => ({
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
            <div style={{ fontSize: 9, color: "#94a3b8" }}>Net Operating Income</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#1d4ed8" }}>{F.eur(M.noi)}</div>
            <div style={{ fontSize: 9, color: "#64748b" }}>Entry Cap: <strong>{F.pct(M.capIn)}</strong></div>
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
      </aside>

      <div className="main-panel">
        {!M.valid && (
          <div className="card" style={{ marginBottom: 14, color: "#64748b", fontSize: 12 }}>
            Adjust inputs to restore full metrics and charts.
          </div>
        )}
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

        <div className="card">
          <div className="card-title">Cash Flow & Debt Waterfall</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Year", "NOI", "Interest", "Principal", "Debt Service", "CFADS", "DSCR", "Loan Bal.", "Exit Equity"].map(h => (
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
                {M.rows.map(d => {
                  const isExit = d.yr === HP_r, isIO = d.yr <= IO_r;
                  return (
                    <tr key={d.yr} style={{ borderTop: "1px solid #f8fafc", background: isExit ? "#eff6ff" : "" }}>
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
                        color: d.exitEq > 0 ? "#1d4ed8" : d.exitEq < 0 ? "#ef4444" : "#cbd5e1",
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
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={v => F.eur(v)} contentStyle={{ fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="NOI" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Debt Service" fill="#fca5a5" radius={[2, 2, 0, 0]} />
                <Bar dataKey="CFADS" fill="#34d399" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Exit Equity" fill="#7c3aed" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: 12 }}>Levered IRR Sensitivity</div>
            <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 10 }}>
              Exit Cap (rows) × LTV (cols) ·{" "}
              <span style={{ fontWeight: 600, color: "#1d4ed8" }}>
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
                    {SENS.ltvs.map(l => (
                      <th key={l} style={{
                        fontSize: 10, fontWeight: 600, padding: "3px 4px", textAlign: "center",
                        color: l === inp.ltv ? "#1d4ed8" : "#94a3b8",
                      }}>{l}%</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SENS.caps.map((ec, ri) => {
                    const isBase = Math.abs(ec - inp.exitCap) < 0.001;
                    return (
                      <tr key={ri}>
                        <td style={{ padding: "2px 5px", fontSize: 10, fontWeight: isBase ? 700 : 500, color: isBase ? "#1d4ed8" : "#475569" }}>
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

/* ─── Page 2 — Waterfall ──────────────────────────────────── */
function WaterfallPage({ inp, M, wf, setWf }) {
  const W = useMemo(() => computeWaterfall(M, wf), [M, wf]);
  const nW = k => v => setWf(p => ({ ...p, [k]: v }));

  const chartData = useMemo(() => [
    { name: "LP", roc: W.lpROC, pref: W.lpPref, catchup: 0, t1: W.lpT1, t2: W.lpT2 },
    { name: "GP", roc: W.gpROC, pref: 0, catchup: W.gpCatchUp, t1: W.gpT1, t2: W.gpT2 },
  ], [W]);

  const tiers = [
    { key: "roc", label: "Return of Capital" },
    { key: "pref", label: "Preferred Return" },
    { key: "catchup", label: "GP Catch-Up" },
    { key: "t1", label: `Tier 1 (${wf.t1LP}% LP / ${wf.t1GP}% GP)` },
    { key: "t2", label: `Tier 2 (${wf.t2LP}% LP / ${wf.t2GP}% GP)` },
  ];

  const TIER_COLOURS = ["#1d4ed8", "#3b82f6", "#7c3aed", "#06b6d4", "#10b981"];

  const tierRows = [
    { label: "Return of Capital", lp: W.lpROC, gp: W.gpROC, lpPct: `${wf.lpPct}%`, gpPct: `${wf.gpPct}%` },
    { label: `Preferred Return (${wf.hurdle}% compounded)`, lp: W.lpPref, gp: 0, lpPct: "100%", gpPct: "—" },
    { label: "GP Catch-Up", lp: 0, gp: W.gpCatchUp, lpPct: "—", gpPct: "100%" },
    { label: "Tier 1 Split", lp: W.lpT1, gp: W.gpT1, lpPct: `${wf.t1LP}%`, gpPct: `${wf.t1GP}%` },
    { label: "Tier 2 Split", lp: W.lpT2, gp: W.gpT2, lpPct: `${wf.t2LP}%`, gpPct: `${wf.t2GP}%` },
  ];

  if (!M.valid) return (
    <div className="page-layout">
      <aside className="sidebar" />
      <InvalidPanel />
    </div>
  );

  return (
    <div className="page-layout">
      <aside className="sidebar">
        <div className="highlight-box" style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 4 }}>TOTAL EQUITY POOL</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#1d4ed8" }}>{F.eur(M.totalDist)}</div>
          <div style={{ fontSize: 9, color: "#64748b", marginTop: 2 }}>
            All distributions to equity · Deal MoM: {F.mul(M.mom)}
          </div>
        </div>

        <Sec title="Capital Commitments">
          <NI id="lpPct" label="LP Commitment (%)" value={wf.lpPct}
            onChange={v => setWf(p => ({ ...p, lpPct: v, gpPct: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI id="gpPct" label="GP Commitment (%)" value={wf.gpPct}
            onChange={v => setWf(p => ({ ...p, gpPct: v, lpPct: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 6 }}>
            LP capital: {F.eur(W.lpCap)} · GP capital: {F.eur(W.gpCap)}
          </div>
        </Sec>

        <Sec title="Preferred Return">
          <NI id="hurdle" label="Hurdle Rate (p.a.)" value={wf.hurdle} onChange={nW("hurdle")} sfx="%" step="0.5" min="0" max="20" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "#475569" }}>GP Catch-Up</span>
            <button type="button" className="btn" aria-pressed={wf.catchUp}
              onClick={() => setWf(p => ({ ...p, catchUp: !p.catchUp }))}
              style={{ background: wf.catchUp ? "#1d4ed8" : "#e2e8f0", color: wf.catchUp ? "#fff" : "#94a3b8", border: "none", borderRadius: 12, padding: "3px 12px", fontWeight: 600 }}>
              {wf.catchUp ? "ON" : "OFF"}
            </button>
          </div>
          {wf.catchUp && (
            <div style={{ fontSize: 9, color: "#64748b", background: "#f8fafc", borderRadius: 6, padding: "6px 8px", marginBottom: 8, lineHeight: 1.5 }}>
              GP receives 100% of proceeds until its promote share is whole, before the Tier 1 split begins.
            </div>
          )}
        </Sec>

        <Sec title="Tier 1 Split">
          <NI id="t1LP" label="LP Share (%)" value={wf.t1LP}
            onChange={v => setWf(p => ({ ...p, t1LP: v, t1GP: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI id="t1GP" label="GP (Promote) Share (%)" value={wf.t1GP}
            onChange={v => setWf(p => ({ ...p, t1GP: v, t1LP: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI id="t2EMThreshold" label="Until LP reaches MoM ×" value={wf.t2EMThreshold} onChange={nW("t2EMThreshold")} step="0.1" min="1" max="5" />
          <div style={{ fontSize: 9, color: "#64748b", marginBottom: 8, lineHeight: 1.4 }}>
            Hurdle measured after return of capital and preferred return only.
          </div>
        </Sec>

        <Sec title="Tier 2 Split (above threshold)">
          <NI id="t2LP" label="LP Share (%)" value={wf.t2LP}
            onChange={v => setWf(p => ({ ...p, t2LP: v, t2GP: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI id="t2GP" label="GP (Promote) Share (%)" value={wf.t2GP}
            onChange={v => setWf(p => ({ ...p, t2GP: v, t2LP: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
        </Sec>
      </aside>

      <div className="main-panel">
        <div className="score-grid">
          <div className="score-card lp">
            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 10 }}>LP — Limited Partner</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["Capital In", F.eur(W.lpCap)], ["Total Return", F.eur(W.lpTotal)],
                ["IRR", F.pct(W.lpIRR)], ["MoM", F.mul(W.lpMoM)]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{l}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="score-card gp">
            <div style={{ fontSize: 11, opacity: 0.75, marginBottom: 10 }}>GP — General Partner / Sponsor</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[["Capital In", F.eur(W.gpCap)], ["Total Return", F.eur(W.gpTotal)],
                ["IRR", F.pct(W.gpIRR)], ["MoM", F.mul(W.gpMoM)]].map(([l, v]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, opacity: 0.7 }}>{l}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #ffffff25" }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>Promote earned: </span>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{F.eur(W.gpPromote)}</span>
            </div>
          </div>
        </div>

        <div className="two-col-equal">
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: 12 }}>Distribution Waterfall</div>
            <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 10 }}>LP (left) vs GP (right) — stacked by tier</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v, name) => [F.eur(v), name]} contentStyle={{ fontSize: 10 }} />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                {tiers.map((t, i) => (
                  <Bar key={t.key} dataKey={t.key} stackId="s" name={t.label}
                    fill={TIER_COLOURS[i]} radius={t.key === "t2" ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title" style={{ fontSize: 12 }}>Tier-by-Tier Breakdown</div>
            <div className="table-scroll">
              <table className="data-table" style={{ minWidth: 400 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["Tier", "LP", "GP", "LP %", "GP %"].map(h => (
                      <th key={h} style={{ textAlign: h === "Tier" ? "left" : "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tierRows.map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f8fafc" }}>
                      <td style={{ fontSize: 10, color: "#475569" }}>{r.label}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "#1d4ed8" }}>{r.lp > 0 ? F.eur(r.lp) : "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "#7c3aed" }}>{r.gp > 0 ? F.eur(r.gp) : "—"}</td>
                      <td style={{ textAlign: "right", color: "#64748b" }}>{r.lpPct}</td>
                      <td style={{ textAlign: "right", color: "#64748b" }}>{r.gpPct}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid #e2e8f0", background: "#f8fafc" }}>
                    <td style={{ fontWeight: 700 }}>TOTAL</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#1d4ed8", fontSize: 12 }}>{F.eur(W.lpTotal)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "#7c3aed", fontSize: 12 }}>{F.eur(W.gpTotal)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#475569" }}>
                      {W.lpTotal > 0 ? `${(W.lpTotal / (W.lpTotal + W.gpTotal) * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "#475569" }}>
                      {W.gpTotal > 0 ? `${(W.gpTotal / (W.lpTotal + W.gpTotal) * 100).toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 14, background: "#f8fafc", borderRadius: 8, padding: "10px 12px" }}>
              <div className="sec-title">Why this matters</div>
              <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.6 }}>
                The GP invested <strong>{F.pct(wf.gpPct)}</strong> of equity but earns{" "}
                <strong>
                  {W.gpTotal > 0 && (W.lpTotal + W.gpTotal) > 0
                    ? `${(W.gpTotal / (W.lpTotal + W.gpTotal) * 100).toFixed(0)}%`
                    : "—"}
                </strong>{" "}
                of total distributions — at <strong>{F.pct(W.gpIRR)}</strong> IRR vs{" "}
                <strong>{F.pct(W.lpIRR)}</strong> for the LP.
                The <strong>{F.eur(W.gpPromote)}</strong> promote is earned through
                performance above the {wf.hurdle}% preferred return.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page 3 — Memo Export ────────────────────────────────── */
function MemoExportPage({ inp, M }) {
  const SENS = useMemo(() => {
    const b = inp.exitCap;
    return buildSens(inp, M.noi, [b - 1, b - 0.5, b, b + 0.5, b + 1], [50, 55, 60, 65, 70]);
  }, [inp, M.noi]);

  const today = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  const assetLbl = AC[inp.assetClass]?.name || "Real Estate";
  const execLine = M.valid
    ? `${assetLbl} acquisition targeting a ${M.HP}-year hold with `
      + `${F.pct(M.levIRR)} levered IRR at ${F.pct(M.capIn)} entry cap rate, `
      + `${inp.ltv}% LTV financing, and ${F.mul(M.mom)} equity multiple.`
    : "Model inputs require adjustment before metrics can be generated.";

  const ms = {
    hdr: { background: "#0f172a", padding: "28px 36px", color: "#fff" },
    sec: { padding: "18px 36px", borderBottom: "1px solid #e2e8f0" },
    secH: { fontSize: 9, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontFamily: "sans-serif" },
    body: { fontSize: 11, color: "#334155", lineHeight: 1.6, fontFamily: "sans-serif" },
    foot: { background: "#f8fafc", padding: "12px 36px", borderTop: "1px solid #e2e8f0" },
  };

  return (
    <div className="memo-page">
      <div className="memo-control-bar no-print">
        <div>
          <div style={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>Investment Memo</div>
          <div style={{ color: "#64748b", fontSize: 10 }}>Preview below · use Ctrl+P / ⌘+P to save as PDF</div>
        </div>
        <div style={{ flex: 1 }} />
        {inp.preparedBy && (
          <div style={{ color: "#94a3b8", fontSize: 11 }}>Prepared by: {inp.preparedBy}</div>
        )}
        <button type="button" className="btn btn-primary" onClick={() => window.print()} aria-label="Print or save as PDF">
          Print / Save PDF
        </button>
      </div>

      <div className="memo-preview-wrap">
        <div className="memo-doc">
          <div style={ms.hdr}>
            <div style={{ fontSize: 10, color: "#475569", marginBottom: 4, letterSpacing: "0.1em", fontFamily: "sans-serif" }}>
              INVESTMENT MEMORANDUM
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px" }}>{inp.dealName}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8, fontSize: 10, color: "#94a3b8", fontFamily: "sans-serif" }}>
              <span>{assetLbl}</span>
              <span>·</span>
              <span>{today}</span>
              {inp.preparedBy && <><span>·</span><span>Prepared by {inp.preparedBy}</span></>}
            </div>
          </div>

          <div style={ms.sec}>
            <div style={ms.secH}>Executive Summary</div>
            <div style={{ ...ms.body, fontStyle: "italic", color: "#1e293b", fontSize: 12, borderLeft: "3px solid #1d4ed8", paddingLeft: 14 }}>
              {execLine}
            </div>
          </div>

          {M.valid && (
            <>
              <div style={ms.sec}>
                <div style={ms.secH}>Key Metrics</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                  {[
                    [F.eur(inp.price), "Purchase Price"],
                    [F.pct(M.levIRR), "Levered IRR"],
                    [F.pct(M.unlevIRR), "Unlevered IRR"],
                    [F.mul(M.mom), "Equity Multiple"],
                    [F.pct(M.coc), "Cash-on-Cash Y1"],
                    [F.pct(M.capIn), "Entry Cap Rate"],
                  ].map(([v, l]) => (
                    <div key={l} style={{ textAlign: "center", padding: "12px 6px", borderRight: "1px solid #e2e8f0", fontFamily: "sans-serif" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px" }}>{v}</div>
                      <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 3 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={ms.sec}>
                <div style={ms.secH}>Capital Structure</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", border: "1px solid #e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                  {[
                    [`${inp.ltv}%`, "LTV"],
                    [F.eur(M.loan), "Loan Amount"],
                    [F.eur(M.equity), "Equity Required"],
                    [`${inp.intRate}%`, "Interest Rate"],
                    [`${inp.ioYrs} yrs`, "Interest Only"],
                    [F.mul(M.dscr1), "DSCR Year 1"],
                  ].map(([v, l]) => (
                    <div key={l} style={{ padding: "10px 14px", fontFamily: "sans-serif", borderRight: "1px solid #e2e8f0" }}>
                      <div style={{ fontSize: 9, color: "#94a3b8" }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 3 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={ms.sec}>
                <div style={ms.secH}>Levered IRR Sensitivity — Exit Cap Rate × LTV</div>
                <div className="table-scroll">
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, fontFamily: "sans-serif", minWidth: 360 }}>
                    <thead>
                      <tr>
                        <th style={{ padding: "5px 8px", textAlign: "left", color: "#94a3b8", fontSize: 9 }}>Cap ↓ / LTV →</th>
                        {SENS.ltvs.map(l => (
                          <th key={l} style={{ padding: "5px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: l === inp.ltv ? "#1d4ed8" : "#475569" }}>
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
                            <td style={{ padding: "4px 8px", fontSize: 10, fontWeight: isBase ? 700 : 400, color: isBase ? "#1d4ed8" : "#475569" }}>
                              {ec.toFixed(2)}%
                            </td>
                            {SENS.grid[ri].map((irr, ci) => {
                              const s = irrS(irr);
                              const active = isBase && SENS.ltvs[ci] === inp.ltv;
                              return (
                                <td key={ci} style={{
                                  padding: "4px 6px", textAlign: "center", fontSize: 10, fontWeight: 600,
                                  borderRadius: 3, ...s,
                                  outline: active ? "2px solid #1d4ed8" : "none", outlineOffset: "-1px",
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
              </div>

              <div style={ms.sec}>
                <div style={ms.secH}>Key Assumptions</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, fontFamily: "sans-serif" }}>
                  {[
                    ["NOI Growth", `${inp.noiGrowth}% p.a.`],
                    ["Vacancy", `${inp.vacancy}%`],
                    ["OpEx", `${inp.opexPct}% of EGI`],
                    ["Hold Period", `${inp.hold} years`],
                    ["Amortisation", `${inp.amortYrs} years`],
                    ["Interest Only", `${inp.ioYrs} years`],
                    ["Exit Cap Rate", `${inp.exitCap}%`],
                    ["Disposal Costs", `${inp.exitCosts}%`],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: "#f8fafc", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, color: "#94a3b8" }}>{l}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#334155", marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={ms.foot}>
            <div style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1.5, fontFamily: "sans-serif" }}>
              <strong>DISCLAIMER</strong> · For illustrative purposes only. This document does not
              constitute an offer to sell or a solicitation to buy any security. All projections are
              based on stated assumptions and are not guaranteed. Past performance is not indicative
              of future results.
              {" · "}
              Model by <a href={BRAND.url} style={{ color: "#1d4ed8" }}>{BRAND.name}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── App root ────────────────────────────────────────────── */
function initState() {
  const fromUrl = readStateFromUrl();
  if (fromUrl) return fromUrl;
  return { inp: { ...DEF }, wf: { ...WF_DEF }, tab: "underwriter" };
}

export default function App() {
  const initial = useMemo(() => initState(), []);
  const [inp, setInp] = useState(initial.inp);
  const [wf, setWf] = useState(initial.wf);
  const [tab, setTab] = useState(initial.tab);
  const [shareMsg, setShareMsg] = useState("");

  const M = useMemo(() => computeModel(inp), [inp]);

  useEffect(() => {
    const t = setTimeout(() => writeStateToUrl({ inp, wf, tab }), 300);
    return () => clearTimeout(t);
  }, [inp, wf, tab]);

  const handleReset = useCallback(() => {
    setInp({ ...DEF });
    setWf({ ...WF_DEF });
  }, []);

  const handleShare = useCallback(async () => {
    writeStateToUrl({ inp, wf, tab });
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg("Copied!");
    } catch {
      setShareMsg("Link ready — copy from address bar");
    }
    setTimeout(() => setShareMsg(""), 2500);
  }, [inp, wf, tab]);

  return (
    <div className="app-shell">
      <header className="top-nav no-print">
        <div className="top-nav-brand">
          <div className="top-nav-brand-title">RE Deal Underwriter</div>
          <div className="top-nav-brand-sub">Iberian Real Estate · Private Equity</div>
          <a className="top-nav-brand-link" href={BRAND.url} target="_blank" rel="noopener noreferrer">
            {BRAND.tagline}
          </a>
        </div>

        <nav className="top-nav-tabs" aria-label="Main navigation">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              className={`tab-btn${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <span aria-hidden="true">{t.icon} </span>{t.label}
            </button>
          ))}
        </nav>

        <div className="top-nav-spacer" />

        <div className="top-nav-fields">
          <input
            className="nav-input deal-name"
            value={inp.dealName}
            onChange={e => setInp(p => ({ ...p, dealName: e.target.value }))}
            placeholder="Deal name"
            aria-label="Deal name"
          />
          <input
            className="nav-input prepared-by"
            value={inp.preparedBy}
            onChange={e => setInp(p => ({ ...p, preparedBy: e.target.value }))}
            placeholder="Prepared by"
            aria-label="Prepared by"
          />
          <select
            className="nav-select"
            value={inp.assetClass}
            onChange={e => setInp(p => ({ ...p, assetClass: e.target.value }))}
            aria-label="Asset class"
          >
            {Object.entries(AC).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
          <button type="button" className={`btn btn-share${shareMsg ? " copied" : ""}`} onClick={handleShare}>
            {shareMsg || "Share deal"}
          </button>
          <button type="button" className="btn" onClick={handleReset}>Reset</button>
        </div>
      </header>

      <ErrorBanner errors={M.errors} />

      <main className="page-content">
        {tab === "underwriter" && <UnderwriterPage inp={inp} setInp={setInp} M={M} />}
        {tab === "waterfall" && <WaterfallPage inp={inp} M={M} wf={wf} setWf={setWf} />}
        {tab === "memo" && <MemoExportPage inp={inp} M={M} />}
      </main>

      <footer className="brand-footer no-print">
        RE Deal Underwriter · Iberian Real Estate PE model ·{" "}
        <a href={BRAND.url} target="_blank" rel="noopener noreferrer">{BRAND.name}</a>
      </footer>
    </div>
  );
}
