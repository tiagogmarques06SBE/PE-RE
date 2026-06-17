// ============================================================
// App.jsx — UI only. All financial logic lives in calculations.js
// ============================================================

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

import {
  F, AC, DEF, WF_DEF,
  computeModel, computeWaterfall, buildSens, irrS,
  computeAttribution, computeSourcesUses, computeBreakeven,
  computeScenarios, SCENARIOS, computeTornado,
  readStateFromUrl, writeStateToUrl,
} from "./calculations";

import "../styles.css"

const TABS = [
  { id: "underwriter", label: "Underwriting" },
  { id: "analysis", label: "Analysis" },
  { id: "waterfall", label: "Waterfall" },
  { id: "memo", label: "IC Memo" },
];

const BRAND = {
  product: "Praça",
  name: "Tiago Marques",
  url: "https://peretiago.netlify.app",
  tagline: "Built by Tiago Marques · Nova SBE",
};

/* Brand palette — kept in sync with styles.css tokens for charts. */
const PAL = {
  green: "#2e5e4e",
  greenDeep: "#1c3e33",
  brass: "#9a7b43",
  oxblood: "#8c3a34",
  slate: "#3d5165",
  sage: "#7a9c8b",
  ink: "#1b2a24",
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

/* ─── Sources & Uses (capital stack) ──────────────────────── */
function SourcesUsesCard({ inp, M }) {
  const SU = useMemo(() => computeSourcesUses(M, inp), [M, inp]);
  const col = (rows, total, totalLabel, accent) => (
    <div className="su-col">
      {rows.map((r) => (
        <div key={r.label} className="su-row">
          <span className="su-label">{r.label}</span>
          <span className="su-val">
            {F.eur(r.val)}
            {r.pct != null && <span className="su-pct"> · {r.pct.toFixed(0)}%</span>}
          </span>
        </div>
      ))}
      <div className="su-row su-total" style={{ color: accent }}>
        <span>{totalLabel}</span>
        <span>{F.eur(total)}</span>
      </div>
    </div>
  );
  return (
    <div className="card">
      <div className="card-title">Sources &amp; Uses</div>
      <div className="su-grid">
        <div>
          <div className="su-head">Uses of Capital</div>
          {col(SU.uses, SU.totalUses, "Total Uses", PAL.green)}
        </div>
        <div>
          <div className="su-head">Sources of Capital</div>
          {col(SU.sources, SU.totalSources, "Total Sources", PAL.brass)}
        </div>
      </div>
    </div>
  );
}

/* ─── Value-creation waterfall (returns attribution) ──────── */
function AttributionWaterfall({ items, dark }) {
  const COLORS = { pos: PAL.green, neg: PAL.oxblood, total: PAL.brass };
  const data = useMemo(() => {
    let cum = 0;
    const d = items.map((it) => {
      const start = cum;
      const end = cum + it.val;
      cum = end;
      return {
        name: it.label,
        base: Math.min(start, end),
        delta: Math.abs(it.val),
        val: it.val,
        fill: it.val >= 0 ? COLORS.pos : COLORS.neg,
      };
    });
    d.push({ name: "Equity Profit", base: 0, delta: Math.abs(cum), val: cum, fill: COLORS.total });
    return d;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const tk = dark ? "#8b948a" : "#6b766f";
  const gk = dark ? "#2c322a" : "#e0dccf";
  const tt = dark ? { background: "#21261f", border: "1px solid #2c322a", color: "#ece9df", fontSize: 11 } : { background: "#fbf9f4", border: "1px solid #e0dccf", color: "#1b2a24", fontSize: 11 };
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gk} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 9, fill: tk }} tickFormatter={(v) => F.eur(v)} />
        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: tk }} />
        <Tooltip formatter={(v, n, p) => [F.eur(p.payload.val), "Contribution"]} contentStyle={tt} />
        <Bar dataKey="base" stackId="w" fill="transparent" />
        <Bar dataKey="delta" stackId="w" radius={[0, 3, 3, 0]}>
          {data.map((d, i) => <Cell key={i} fill={d.fill} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─── Tornado: which single variable swings IRR the most ──── */
function TornadoChart({ data }) {
  if (!data.valid) return null;
  const half = 48; // % width available on each side of the base line
  return (
    <div className="tornado">
      <div className="tornado-axis">
        <span className="tornado-axis-end">Lower IRR</span>
        <span className="tornado-axis-mid">Base {F.pct(data.base)}</span>
        <span className="tornado-axis-end">Higher IRR</span>
      </div>
      {data.items.map((it) => {
        const downW = (Math.abs(it.downside) / data.maxMag) * half;
        const upW = (Math.abs(it.upside) / data.maxMag) * half;
        return (
          <div key={it.key} className="tornado-row">
            <div className="tornado-name">{it.label}</div>
            <div className="tornado-track">
              <div className="tornado-center" />
              <div className="tornado-bar down" style={{ width: `${downW}%`, left: `calc(50% - ${downW}%)` }} title={`${F.pct(it.low)} (${it.loLbl})`} />
              <div className="tornado-bar up" style={{ width: `${upW}%`, left: "50%" }} title={`${F.pct(it.high)} (${it.hiLbl})`} />
            </div>
            <div className="tornado-range">{F.pct(it.low)} → {F.pct(it.high)}</div>
          </div>
        );
      })}
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
      <div className="card" style={{ color: "var(--muted)", fontSize: 13 }}>
        {message || "Adjust inputs in the sidebar to see outputs."}
      </div>
    </div>
  );
}

/* ─── Page 1 — Underwriter ────────────────────────────────── */
function UnderwriterPage({ inp, setInp, M, dark }) {
  const cfg = AC[inp.assetClass] || AC.office;
  const HP_r = M.HP, IO_r = M.IO;
  const num = k => v => setInp(p => ({ ...p, [k]: v }));
  const tk = dark ? "#8b948a" : "#6b766f";
  const gk = dark ? "#2c322a" : "#e0dccf";
  const tt = dark ? { background: "#21261f", border: "1px solid #2c322a", color: "#ece9df", fontSize: 10 } : { background: "#fbf9f4", border: "1px solid #e0dccf", color: "#1b2a24", fontSize: 10 };
  const exitRowBg = dark ? "#1b2620" : "#e4ece6";
  const totalRowBg = dark ? "#21261f" : "#efece2";

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
      </aside>

      <div className="main-panel">
        {!M.valid && (
          <div className="card" style={{ marginBottom: 14, color: "var(--muted)", fontSize: 12 }}>
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
                  {["Year", "NOI", "Interest", "Principal", "Debt Service", "CFADS", "DSCR", "Loan Bal.", "Exit Equity"].map(h => (
                    <th key={h} style={{ textAlign: h === "Year" ? "left" : "right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderTop: "1px solid var(--line-soft)" }}>
                  <td style={{ fontWeight: 500, color: "var(--ink-2)" }}>0 · Acquisition</td>
                  {["—", "—", "—", "—"].map((v, i) => <td key={i} style={{ textAlign: "right", color: "var(--muted-2)" }}>{v}</td>)}
                  <td style={{ textAlign: "right", fontWeight: 600, color: "var(--oxblood)" }}>({F.eur(M.equity)})</td>
                  <td style={{ textAlign: "right", color: "var(--muted-2)" }}>—</td>
                  <td style={{ textAlign: "right", color: "var(--muted)" }}>{F.eur(M.loan)}</td>
                  <td style={{ textAlign: "right", color: "var(--muted-2)" }}>—</td>
                </tr>
                {M.rows.map(d => {
                  const isExit = d.yr === HP_r, isIO = d.yr <= IO_r;
                  return (
                    <tr key={d.yr} style={{ borderTop: "1px solid var(--line-soft)", background: isExit ? exitRowBg : "" }}>
                      <td style={{ fontWeight: 500, color: "var(--ink-2)" }}>
                        {d.yr}{isIO ? " (IO)" : ""}{isExit ? " · Exit" : ""}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--ink-2)" }}>{F.eur(d.yrNOI)}</td>
                      <td style={{ textAlign: "right", color: PAL.oxblood }}>({F.eur(d.int)})</td>
                      <td style={{ textAlign: "right", color: "var(--muted)" }}>({F.eur(d.prin)})</td>
                      <td style={{ textAlign: "right", color: PAL.oxblood, fontWeight: 500 }}>({F.eur(d.ds)})</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: d.cfads >= 0 ? PAL.green : PAL.oxblood }}>{F.eur(d.cfads)}</td>
                      <td style={{
                        textAlign: "right",
                        fontWeight: d.dscr && d.dscr < 1.2 ? 700 : 400,
                        color: d.dscr && d.dscr < 1.2 ? PAL.oxblood : "var(--muted)",
                      }}>
                        {F.mul(d.dscr)}
                      </td>
                      <td style={{ textAlign: "right", color: "var(--muted)" }}>{F.eur(d.bal)}</td>
                      <td style={{
                        textAlign: "right", fontWeight: 600,
                        color: d.exitEq > 0 ? PAL.green : d.exitEq < 0 ? PAL.oxblood : "var(--muted-2)",
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
            <div className="card-title">Annual Cash Flows</div>
            <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 8 }} aria-hidden="true">IO = Interest Only period</div>
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gk} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: tk }} />
                <YAxis tick={{ fontSize: 9, fill: tk }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={v => F.eur(v)} contentStyle={tt} />
                <Legend wrapperStyle={{ fontSize: 9, color: tk }} />
                <Bar dataKey="NOI" fill={PAL.green} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Debt Service" fill={PAL.oxblood} radius={[2, 2, 0, 0]} />
                <Bar dataKey="CFADS" fill={PAL.brass} radius={[2, 2, 0, 0]} />
                <Bar dataKey="Exit Equity" fill={PAL.slate} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title">Levered IRR Sensitivity</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 10 }}>
              Exit Cap (rows) × LTV (cols) ·{" "}
              <span style={{ fontWeight: 600, color: PAL.green }}>
                Current: {F.pct(inp.exitCap)} / {inp.ltv}% LTV
              </span>
            </div>
            <div className="table-scroll">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, minWidth: 320 }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: 9, fontWeight: 500, color: "var(--muted)", padding: "3px 5px", textAlign: "left", width: 55 }}>
                      Cap ↓ LTV →
                    </th>
                    {SENS.ltvs.map(l => (
                      <th key={l} style={{
                        fontSize: 10, fontWeight: 600, padding: "3px 4px", textAlign: "center",
                        color: l === inp.ltv ? PAL.green : "var(--muted)",
                      }}>{l}%</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SENS.caps.map((ec, ri) => {
                    const isBase = Math.abs(ec - inp.exitCap) < 0.001;
                    return (
                      <tr key={ri}>
                        <td style={{ padding: "2px 5px", fontSize: 10, fontWeight: isBase ? 700 : 500, color: isBase ? PAL.green : "var(--ink-2)" }}>
                          {ec.toFixed(2)}%
                        </td>
                        {SENS.grid[ri].map((irr, ci) => {
                          const s = irrS(irr);
                          const active = isBase && SENS.ltvs[ci] === inp.ltv;
                          return (
                            <td key={ci} style={{
                              padding: "2px 4px", textAlign: "center", fontSize: 10, fontWeight: 600,
                              borderRadius: 4, ...s,
                              outline: active ? `2px solid ${PAL.brass}` : "none",
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
              {[["<0%", "#8c3a34"], ["0–4%", "#dba09c"], ["4–8%", "#ce7a74"], ["8–12%", "#e8cfa0"],
                ["12–16%", "#f0e6c6"], ["16–20%", "#c6ddd6"], ["20–25%", "#8abda9"], [">25%", "#2e5e4e"]].map(([l, bg]) => (
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
function WaterfallPage({ inp, M, wf, setWf, dark }) {
  const W = useMemo(() => computeWaterfall(M, wf), [M, wf]);
  const nW = k => v => setWf(p => ({ ...p, [k]: v }));
  const tk = dark ? "#8b948a" : "#6b766f";
  const gk = dark ? "#2c322a" : "#e0dccf";
  const tt = dark ? { background: "#21261f", border: "1px solid #2c322a", color: "#ece9df", fontSize: 10 } : { background: "#fbf9f4", border: "1px solid #e0dccf", color: "#1b2a24", fontSize: 10 };
  const totalRowBg = dark ? "#21261f" : "#efece2";
  const tblHeadBg = dark ? "#21261f" : "#efece2";
  const infoBoxBg = dark ? "#21261f" : "#efece2";

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

  const TIER_COLOURS = [PAL.greenDeep, PAL.green, PAL.brass, PAL.sage, PAL.slate];

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
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>Total equity distributions</div>
          <div className="num" style={{ fontSize: 20, fontWeight: 600, color: "var(--green)" }}>{F.eur(M.totalDist)}</div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
            Across the hold · deal MoM {F.mul(M.mom)}
          </div>
        </div>

        <Sec title="Capital Commitments">
          <NI id="lpPct" label="LP Commitment (%)" value={wf.lpPct}
            onChange={v => setWf(p => ({ ...p, lpPct: v, gpPct: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI id="gpPct" label="GP Commitment (%)" value={wf.gpPct}
            onChange={v => setWf(p => ({ ...p, gpPct: v, lpPct: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 6 }}>
            LP capital: {F.eur(W.lpCap)} · GP capital: {F.eur(W.gpCap)}
          </div>
        </Sec>

        <Sec title="Preferred Return">
          <NI id="hurdle" label="Hurdle Rate (p.a.)" value={wf.hurdle} onChange={nW("hurdle")} sfx="%" step="0.5" min="0" max="20" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: "var(--ink-2)" }}>GP Catch-Up</span>
            <button type="button" className="btn" aria-pressed={wf.catchUp}
              onClick={() => setWf(p => ({ ...p, catchUp: !p.catchUp }))}
              style={{ background: wf.catchUp ? PAL.greenDeep : "var(--surface-2)", color: wf.catchUp ? "#ece7da" : "var(--muted)", border: "1px solid var(--line)", borderRadius: 12, padding: "3px 12px", fontWeight: 600 }}>
              {wf.catchUp ? "ON" : "OFF"}
            </button>
          </div>
          {wf.catchUp && (
            <div style={{ fontSize: 9, color: "var(--muted)", background: "var(--surface-2)", borderRadius: 6, padding: "6px 8px", marginBottom: 8, lineHeight: 1.5 }}>
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
          <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 8, lineHeight: 1.4 }}>
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
                  <div className="num" style={{ fontSize: 21, fontWeight: 500, marginTop: 3 }}>{v}</div>
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
                  <div className="num" style={{ fontSize: 21, fontWeight: 500, marginTop: 3 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #ffffff25" }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>Promote earned: </span>
              <span className="num" style={{ fontSize: 17, fontWeight: 500 }}>{F.eur(W.gpPromote)}</span>
            </div>
          </div>
        </div>

        <div className="two-col-equal">
          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title">Distribution Waterfall</div>
            <div style={{ fontSize: 9, color: "var(--muted)", marginBottom: 10 }}>LP (left) vs GP (right) — stacked by tier</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gk} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: tk }} />
                <YAxis tick={{ fontSize: 9, fill: tk }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v, name) => [F.eur(v), name]} contentStyle={tt} />
                <Legend wrapperStyle={{ fontSize: 9, color: tk }} />
                {tiers.map((t, i) => (
                  <Bar key={t.key} dataKey={t.key} stackId="s" name={t.label}
                    fill={TIER_COLOURS[i]} radius={t.key === "t2" ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <div className="card-title">Tier-by-Tier Breakdown</div>
            <div className="table-scroll">
              <table className="data-table" style={{ minWidth: 400 }}>
                <thead>
                  <tr style={{ background: tblHeadBg }}>
                    {["Tier", "LP", "GP", "LP %", "GP %"].map(h => (
                      <th key={h} style={{ textAlign: h === "Tier" ? "left" : "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tierRows.map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--line-soft)" }}>
                      <td style={{ fontSize: 10, color: "var(--ink-2)" }}>{r.label}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: PAL.green }}>{r.lp > 0 ? F.eur(r.lp) : "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: PAL.brass }}>{r.gp > 0 ? F.eur(r.gp) : "—"}</td>
                      <td style={{ textAlign: "right", color: "var(--muted)" }}>{r.lpPct}</td>
                      <td style={{ textAlign: "right", color: "var(--muted)" }}>{r.gpPct}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid var(--line)", background: totalRowBg }}>
                    <td style={{ fontWeight: 700 }}>Total</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: PAL.green, fontSize: 12 }}>{F.eur(W.lpTotal)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: PAL.brass, fontSize: 12 }}>{F.eur(W.gpTotal)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--ink-2)" }}>
                      {W.lpTotal > 0 ? `${(W.lpTotal / (W.lpTotal + W.gpTotal) * 100).toFixed(0)}%` : "—"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: "var(--ink-2)" }}>
                      {W.gpTotal > 0 ? `${(W.gpTotal / (W.lpTotal + W.gpTotal) * 100).toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 14, background: infoBoxBg, borderRadius: 6, padding: "10px 12px" }}>
              <div className="sec-title">Sponsor economics</div>
              <div style={{ fontSize: 10, color: "var(--ink-2)", lineHeight: 1.6 }}>
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
function MemoExportPage({ inp, M, dark }) {
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

  const docBg = dark ? "#181c16" : "#ffffff";
  const docBorder = dark ? "#2c322a" : "#e0dccf";
  const docText = dark ? "#ece9df" : "#1b2a24";
  const docMuted = dark ? "#8b948a" : "#6b766f";
  const ms = {
    hdr: { background: "#1c3e33", padding: "30px 36px", color: "#ece7da", borderTop: "3px solid #9a7b43" },
    sec: { padding: "18px 36px", borderBottom: `1px solid ${docBorder}` },
    secH: { fontSize: 11, fontWeight: 700, color: dark ? "#8b948a" : "#41504a", marginBottom: 10, fontFamily: "sans-serif", letterSpacing: "0.04em" },
    body: { fontSize: 11, color: docText, lineHeight: 1.6, fontFamily: "sans-serif" },
    foot: { background: dark ? "#10130f" : "#f3f1ea", padding: "12px 36px", borderTop: `1px solid ${docBorder}` },
  };

  return (
    <div className="memo-page">
      <div className="memo-control-bar no-print">
        <div>
          <div style={{ color: "#ece7da", fontSize: 14, fontWeight: 600, fontFamily: "Fraunces, serif" }}>Investment committee memo</div>
        </div>
        <div style={{ flex: 1 }} />
        {inp.preparedBy && (
          <div style={{ color: "#a9b4ac", fontSize: 11 }}>Prepared by {inp.preparedBy}</div>
        )}
        <button type="button" className="btn btn-primary" onClick={() => window.print()} aria-label="Print or save as PDF">
          Save as PDF
        </button>
      </div>

      <div className="memo-preview-wrap">
        <div className="memo-doc" style={{ background: docBg, borderColor: docBorder }}>
          <div style={ms.hdr}>
            <div style={{ fontSize: 11.5, color: "#b4924f", marginBottom: 6, fontFamily: "sans-serif" }}>
              Confidential · Investment committee memorandum
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.015em", fontFamily: "Fraunces, serif" }}>{inp.dealName}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10, fontSize: 11, color: "#a9b4ac", fontFamily: "sans-serif" }}>
              <span>{assetLbl}</span>
              <span>·</span>
              <span>{today}</span>
              {inp.preparedBy && <><span>·</span><span>Prepared by {inp.preparedBy}</span></>}
            </div>
          </div>

          <div style={ms.sec}>
            <div style={ms.secH}>Executive Summary</div>
            <div style={{ ...ms.body, fontStyle: "italic", fontSize: 12.5, lineHeight: 1.75, color: docText }}>
              {execLine}
            </div>
          </div>

          {M.valid && (
            <>
              <div style={ms.sec}>
                <div style={ms.secH}>Key Metrics</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", border: `1px solid ${docBorder}`, borderRadius: 6, overflow: "hidden" }}>
                  {[
                    [F.eur(inp.price), "Purchase Price"],
                    [F.pct(M.levIRR), "Levered IRR"],
                    [F.pct(M.unlevIRR), "Unlevered IRR"],
                    [F.mul(M.mom), "Equity Multiple"],
                    [F.pct(M.coc), "Cash-on-Cash Y1"],
                    [F.pct(M.capIn), "Entry Cap Rate"],
                  ].map(([v, l]) => (
                    <div key={l} style={{ textAlign: "center", padding: "12px 6px", borderRight: `1px solid ${docBorder}`, fontFamily: "sans-serif" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: dark ? "#ece9df" : "#1b2a24", letterSpacing: "-0.5px" }}>{v}</div>
                      <div style={{ fontSize: 9, color: docMuted, marginTop: 3 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={ms.sec}>
                <div style={ms.secH}>Capital Structure</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", border: `1px solid ${docBorder}`, borderRadius: 6, overflow: "hidden" }}>
                  {[
                    [`${inp.ltv}%`, "LTV"],
                    [F.eur(M.loan), "Loan Amount"],
                    [F.eur(M.equity), "Equity Required"],
                    [`${inp.intRate}%`, "Interest Rate"],
                    [`${inp.ioYrs} yrs`, "Interest Only"],
                    [F.mul(M.dscr1), "DSCR Year 1"],
                  ].map(([v, l]) => (
                    <div key={l} style={{ padding: "10px 14px", fontFamily: "sans-serif", borderRight: `1px solid ${docBorder}` }}>
                      <div style={{ fontSize: 9, color: docMuted }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: dark ? "#ece9df" : "#1b2a24", marginTop: 3 }}>{v}</div>
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
                        <th style={{ padding: "5px 8px", textAlign: "left", color: docMuted, fontSize: 9 }}>Cap ↓ / LTV →</th>
                        {SENS.ltvs.map(l => (
                          <th key={l} style={{ padding: "5px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: l === inp.ltv ? PAL.green : docText }}>
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
                            <td style={{ padding: "4px 8px", fontSize: 10, fontWeight: isBase ? 700 : 400, color: isBase ? PAL.green : docText }}>
                              {ec.toFixed(2)}%
                            </td>
                            {SENS.grid[ri].map((irr, ci) => {
                              const s = irrS(irr);
                              const active = isBase && SENS.ltvs[ci] === inp.ltv;
                              return (
                                <td key={ci} style={{
                                  padding: "4px 6px", textAlign: "center", fontSize: 10, fontWeight: 600,
                                  borderRadius: 3, ...s,
                                  outline: active ? `2px solid ${PAL.brass}` : "none", outlineOffset: "-1px",
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
                    <div key={l} style={{ background: dark ? "#21261f" : "#f3f1ea", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, color: docMuted }}>{l}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: docText, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={ms.foot}>
            <div style={{ fontSize: 9, color: docMuted, lineHeight: 1.5, fontFamily: "sans-serif" }}>
              <strong>Disclaimer</strong> · For illustrative purposes only. This document does not
              constitute an offer to sell or a solicitation to buy any security. All projections are
              based on stated assumptions and are not guaranteed. Past performance is not indicative
              of future results.
              {" · "}
              Model by <a href={BRAND.url} style={{ color: PAL.green }}>{BRAND.name}</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page — Deal Analysis ────────────────────────────────── */
function AnalysisPage({ inp, M, dark }) {
  const A = useMemo(() => computeAttribution(M, inp), [M, inp]);
  const scenarios = useMemo(() => computeScenarios(inp), [inp]);
  const BE = useMemo(() => computeBreakeven(inp), [inp]);
  const tornado = useMemo(() => computeTornado(inp), [inp]);

  if (!M.valid) {
    return (
      <div className="page-layout">
        <aside className="sidebar" />
        <InvalidPanel message="Adjust inputs in the Underwriter tab to generate the analysis." />
      </div>
    );
  }

  const scColor = (s) => (!s.valid || s.noIRR ? "weak" : s.levIRR >= 15 ? "good" : s.levIRR >= 8 ? "ok" : "weak");
  const pct = (v) => (v == null ? "—" : `${v.toFixed(2)}%`);

  return (
    <div className="analysis-page">
      <div className="card">
        <div className="card-title">Value Creation Bridge</div>
        <div className="card-sub">
          Where the <strong>{F.eur(A.profit)}</strong> of equity profit comes from. Each driver adds up
          to total distributions less the equity invested.
        </div>
        <AttributionWaterfall items={A.items} dark={dark} />
        <div className="attr-grid">
          {A.items.map((it) => (
            <div key={it.key} className="attr-tile">
              <div className="attr-label">{it.label}</div>
              <div className="attr-val" style={{ color: it.val >= 0 ? PAL.green : PAL.oxblood }}>
                {it.val >= 0 ? "+" : "−"}{F.eur(Math.abs(it.val))}
              </div>
            </div>
          ))}
          <div className="attr-tile attr-profit">
            <div className="attr-label">Equity Profit</div>
            <div className="attr-val">{F.eur(A.profit)}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">IRR Sensitivity — Tornado</div>
        <div className="card-sub">
          Each driver moved on its own, holding everything else fixed. The widest bars are the
          assumptions the return depends on most.
        </div>
        <TornadoChart data={tornado} />
      </div>

      <div className="two-col-equal">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">Scenario Analysis</div>
          <div className="card-sub">
            Exit cap, NOI growth and vacancy moved together across a downside, base and upside case.
          </div>
          <div className="scenario-grid">
            {scenarios.map((s) => (
              <div key={s.key} className={`scenario-card ${scColor(s)}`}>
                <div className="scenario-name">{s.label}</div>
                <div className="scenario-irr">{s.noIRR ? "N/M" : F.pct(s.levIRR)}</div>
                <div className="scenario-sub">{F.mul(s.mom)} MoM</div>
              </div>
            ))}
          </div>
          <div className="scenario-legend">
            <span>Bear: +{SCENARIOS.bear.dCap}% cap · {SCENARIOS.bear.dGrowth}% growth · +{SCENARIOS.bear.dVac}% vac</span>
            <span>Bull: {SCENARIOS.bull.dCap}% cap · +{SCENARIOS.bull.dGrowth}% growth · {SCENARIOS.bull.dVac}% vac</span>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">Break-Even Thresholds</div>
          <div className="card-sub">
            The points where the deal stops working. Current exit cap: <strong>{F.pct(inp.exitCap)}</strong>.
          </div>
          <div className="be-grid">
            <div className="be-tile">
              <div className="be-label">Exit cap for {BE.target}% IRR</div>
              <div className="be-val">{pct(BE.capAtTarget)}</div>
            </div>
            <div className="be-tile">
              <div className="be-label">Exit cap for {BE.hurdle}% hurdle</div>
              <div className="be-val">{pct(BE.capAtHurdle)}</div>
            </div>
            <div className="be-tile">
              <div className="be-label">Break-even exit cap (0% IRR)</div>
              <div className="be-val">{pct(BE.capAtZero)}</div>
            </div>
            <div className="be-tile">
              <div className="be-label">Max price for {BE.target}% IRR</div>
              <div className="be-val">{F.eur(BE.maxPriceTarget)}</div>
            </div>
            <div className="be-tile">
              <div className="be-label">Break-even occupancy (DSCR 1.0×)</div>
              <div className="be-val">{BE.breakevenVacancy == null ? "—" : `${(100 - BE.breakevenVacancy).toFixed(0)}%`}</div>
            </div>
            <div className="be-tile">
              <div className="be-label">Exit cap cushion</div>
              <div className="be-val">
                {BE.capAtHurdle == null ? "—" : `${(BE.capAtHurdle - inp.exitCap).toFixed(2)}%`}
              </div>
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

  // Dark mode — persist to localStorage
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("re-theme") === "dark"; } catch { return false; }
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    try { localStorage.setItem("re-theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);

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
          <div className="top-nav-brand-title">{BRAND.product}</div>
          <div className="top-nav-brand-sub">Iberian real estate underwriting</div>
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
              {t.label}
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
          <button type="button" className="btn btn-icon" onClick={() => setDark(d => !d)} aria-label="Toggle dark mode" title={dark ? "Light mode" : "Dark mode"}>
            {dark ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <ErrorBanner errors={M.errors} />

      <main className="page-content">
        {tab === "underwriter" && <UnderwriterPage inp={inp} setInp={setInp} M={M} dark={dark} />}
        {tab === "analysis" && <AnalysisPage inp={inp} M={M} dark={dark} />}
        {tab === "waterfall" && <WaterfallPage inp={inp} M={M} wf={wf} setWf={setWf} dark={dark} />}
        {tab === "memo" && <MemoExportPage inp={inp} M={M} dark={dark} />}
      </main>

      <footer className="brand-footer no-print">
        Praça · an Iberian real estate underwriting workbench ·{" "}
        <a href={BRAND.url} target="_blank" rel="noopener noreferrer">{BRAND.name}</a>
      </footer>
    </div>
  );
}
