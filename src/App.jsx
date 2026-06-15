// ============================================================
// App.jsx — UI only. All financial logic lives in calculations.js
//
// Lovable: you may freely edit layout, colours, fonts, and
// component structure in this file.
//
// ⚠️  DO NOT modify calculations.js — it contains the financial
//     model. If numbers look wrong, tell Lovable which specific
//     *visual* element is broken, not to "fix the formula."
//
// ============================================================

import { useState, useMemo, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

import {
  calcIRR, F, AC, DEF, WF_DEF,
  computeModel, computeWaterfall, buildSens, irrS,
} from "./calculations";

/* ══════════════════════════════════════════════════════
   SHARED UI COMPONENTS
   (Lovable can restyle these freely)
══════════════════════════════════════════════════════ */

// Numeric input field used throughout the left panels
function NI({ label, value, onChange, pfx, sfx, step = "0.01", min, max }) {
  return (
    <div style={{ marginBottom:8 }}>
      <div style={{ fontSize:10, color:"#94a3b8", marginBottom:2 }}>{label}</div>
      <div style={{ display:"flex", alignItems:"center", gap:3 }}>
        {pfx && <span style={{ fontSize:11, color:"#94a3b8" }}>{pfx}</span>}
        <input
          type="number" value={value} step={step} min={min} max={max}
          onChange={e => { const n = parseFloat(e.target.value); if (!isNaN(n)) onChange(n); }}
          style={{ width:"100%", fontSize:12, background:"#f8fafc", border:"1px solid #e2e8f0",
                   borderRadius:5, padding:"4px 7px", color:"#1e293b", outline:"none" }}
        />
        {sfx && <span style={{ fontSize:11, color:"#94a3b8" }}>{sfx}</span>}
      </div>
    </div>
  );
}

// Section divider used in left input panels
function Sec({ title, children }) {
  return (
    <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:10, marginBottom:4 }}>
      <div style={{ fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase",
                    letterSpacing:"0.08em", marginBottom:8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// Metric card used in the summary row at the top of the Underwriter page
function MCard({ label, val, sub, hi }) {
  return (
    <div style={{
      background: hi ? "#1d4ed8" : "#fff",
      border: hi ? "none" : "1px solid #e2e8f0",
      borderRadius:10, padding:"12px 14px",
      boxShadow: hi ? "0 4px 14px #1d4ed830" : "0 1px 3px #0001",
    }}>
      <div style={{ fontSize:10, color:hi?"#bfdbfe":"#94a3b8", marginBottom:3 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color:hi?"#fff":"#0f172a",
                    letterSpacing:"-0.5px" }}>{val}</div>
      {sub && <div style={{ fontSize:10, color:hi?"#bfdbfe":"#64748b", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PAGE 1 — UNDERWRITER
══════════════════════════════════════════════════════ */
function UnderwriterPage({ inp, setInp, M }) {
  const cfg  = AC[inp.assetClass] || AC.office;
  const HP_r = M.HP, IO_r = M.IO;
  const num  = k => v => setInp(p => ({ ...p, [k]:v }));

  // Sensitivity grid — computed from calculations.js, never touched by UI edits
  const SENS = useMemo(() => {
    const b = inp.exitCap;
    return buildSens(inp, M.noi, [b-1.5, b-1, b-0.5, b, b+0.5, b+1], [40, 50, 55, 60, 65, 70]);
  }, [inp, M.noi]);

  const chartData = M.rows.map(d => ({
    name: `Yr ${d.yr}${d.yr <= IO_r ? "◆" : ""}`,
    "NOI":          Math.round(d.yrNOI),
    "Debt Service": Math.round(d.ds),
    "CFADS":        Math.round(d.cfads),
    "Exit Equity":  Math.round(d.exitEq),
  }));

  const th = { fontSize:10, fontWeight:500, color:"#94a3b8", padding:"6px 8px" };
  const td = { fontSize:11, padding:"5px 8px" };

  return (
    <div style={{ display:"flex", height:"calc(100vh - 90px)", overflow:"hidden" }}>

      {/* Left: inputs */}
      <div style={{ width:220, flexShrink:0, background:"#fff", borderRight:"1px solid #f1f5f9",
                    padding:12, overflowY:"auto" }}>
        <Sec title="Revenue & NOI">
          <NI label={cfg.rev} value={inp.grossRev} onChange={num("grossRev")} pfx="€" step="5000" />
          <NI label={`${cfg.vac} (%)`} value={inp.vacancy} onChange={num("vacancy")} sfx="%" step="0.5" min="0" max="50" />
          <div style={{ fontSize:10, color:"#94a3b8", marginBottom:6 }}>EGI: {F.eur(M.egi)}</div>
          <NI label={`${cfg.opx} (% EGI)`} value={inp.opexPct} onChange={num("opexPct")} sfx="%" step="1" min="0" max="80" />
          <div style={{ background:"#eff6ff", borderRadius:7, padding:"8px 10px", marginBottom:8 }}>
            <div style={{ fontSize:9, color:"#94a3b8" }}>Net Operating Income</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#1d4ed8" }}>{F.eur(M.noi)}</div>
            <div style={{ fontSize:9, color:"#64748b" }}>Entry Cap: <strong>{F.pct(M.capIn)}</strong></div>
          </div>
          <NI label="NOI Growth (p.a.)" value={inp.noiGrowth} onChange={num("noiGrowth")} sfx="%" step="0.25" min="-5" max="15" />
        </Sec>

        <Sec title="Acquisition">
          <NI label="Purchase Price" value={inp.price} onChange={num("price")} pfx="€" step="100000" />
          <NI label="Acquisition Costs" value={inp.acqCosts} onChange={num("acqCosts")} sfx="%" step="0.25" min="0" max="10" />
          <div style={{ fontSize:10, color:"#94a3b8", marginBottom:6 }}>Total outlay: {F.eur(M.totalAcq)}</div>
        </Sec>

        <Sec title="Debt Structure">
          <NI label="LTV" value={inp.ltv} onChange={num("ltv")} sfx="%" step="5" min="0" max="85" />
          <div style={{ fontSize:10, color:"#94a3b8", marginBottom:6 }}>
            Loan: {F.eur(M.loan)}<br />Equity: {F.eur(M.equity)}
          </div>
          <NI label="Interest Rate" value={inp.intRate} onChange={num("intRate")} sfx="%" step="0.25" min="0" max="15" />
          <NI label="Amortisation (years)" value={inp.amortYrs} onChange={num("amortYrs")} step="1" min="5" max="40" />
          <NI label="Interest Only (years)" value={inp.ioYrs} onChange={num("ioYrs")} step="1" min="0" max="10" />
        </Sec>

        <Sec title="Exit">
          <NI label="Hold Period (years)" value={inp.hold} onChange={num("hold")} step="1" min="1" max="15" />
          <NI label="Exit Cap Rate" value={inp.exitCap} onChange={num("exitCap")} sfx="%" step="0.25" min="1" max="15" />
          <NI label="Disposal Costs" value={inp.exitCosts} onChange={num("exitCosts")} sfx="%" step="0.25" min="0" max="5" />
        </Sec>
      </div>

      {/* Right: outputs */}
      <div style={{ flex:1, padding:14, overflowY:"auto", minWidth:0 }}>

        {/* Metric cards */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
          <MCard hi label="Levered IRR" val={F.pct(M.levIRR)} sub={`Unlevered IRR: ${F.pct(M.unlevIRR)}`} />
          <MCard label="Equity Multiple (MoM)" val={F.mul(M.mom)} sub={`Equity: ${F.eur(M.equity)}`} />
          <MCard label="Cash-on-Cash (Year 1)" val={F.pct(M.coc)} sub="CFADS ÷ equity invested" />
          <MCard label="Entry Cap Rate" val={F.pct(M.capIn)}
            sub={`Exit cap ${F.pct(inp.exitCap)} · ${inp.exitCap > M.capIn ? "Cap expansion ↑" : "Cap compression ↓"}`} />
          <MCard label="DSCR — Year 1" val={F.mul(M.dscr1)}
            sub={M.dscr1 != null ? (M.dscr1 < 1.2 ? "⚠ Below 1.20× covenant" : "✓ Above 1.20× covenant") : "—"} />
          <MCard label="Equity Required" val={F.eur(M.equity)} sub={`${(100 - inp.ltv).toFixed(0)}% of price + costs`} />
        </div>

        {/* Debt waterfall table */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0",
                      padding:"12px 14px", marginBottom:14, overflowX:"auto" }}>
          <div style={{ fontWeight:600, fontSize:13, color:"#1e293b", marginBottom:10 }}>
            Cash Flow & Debt Waterfall
          </div>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead>
              <tr style={{ background:"#f8fafc" }}>
                {["Year","NOI","Interest","Principal","Debt Service","CFADS","DSCR","Loan Bal.","Exit Equity"].map(h => (
                  <th key={h} style={{ ...th, textAlign:h === "Year" ? "left" : "right" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Year 0 */}
              <tr style={{ borderTop:"1px solid #f8fafc" }}>
                <td style={{ ...td, fontWeight:500, color:"#475569" }}>0 · Acquisition</td>
                {["—","—","—","—"].map((v,i) => <td key={i} style={{ ...td, textAlign:"right", color:"#cbd5e1" }}>{v}</td>)}
                <td style={{ ...td, textAlign:"right", fontWeight:600, color:"#ef4444" }}>({F.eur(M.equity)})</td>
                <td style={{ ...td, textAlign:"right", color:"#cbd5e1" }}>—</td>
                <td style={{ ...td, textAlign:"right", color:"#64748b" }}>{F.eur(M.loan)}</td>
                <td style={{ ...td, textAlign:"right", color:"#cbd5e1" }}>—</td>
              </tr>
              {M.rows.map(d => {
                const isExit = d.yr === HP_r, isIO = d.yr <= IO_r;
                return (
                  <tr key={d.yr} style={{ borderTop:"1px solid #f8fafc", background:isExit?"#eff6ff":"" }}>
                    <td style={{ ...td, fontWeight:500, color:"#475569" }}>
                      {d.yr}{isIO ? " (IO)" : ""}{isExit ? " · Exit" : ""}
                    </td>
                    <td style={{ ...td, textAlign:"right", color:"#334155" }}>{F.eur(d.yrNOI)}</td>
                    <td style={{ ...td, textAlign:"right", color:"#f87171" }}>({F.eur(d.int)})</td>
                    <td style={{ ...td, textAlign:"right", color:"#fca5a5" }}>({F.eur(d.prin)})</td>
                    <td style={{ ...td, textAlign:"right", color:"#ef4444", fontWeight:500 }}>({F.eur(d.ds)})</td>
                    <td style={{ ...td, textAlign:"right", fontWeight:600,
                                 color:d.cfads >= 0 ? "#059669" : "#ef4444" }}>{F.eur(d.cfads)}</td>
                    <td style={{ ...td, textAlign:"right",
                                 fontWeight:d.dscr && d.dscr < 1.2 ? 700 : 400,
                                 color:d.dscr && d.dscr < 1.2 ? "#ef4444" : "#64748b" }}>
                      {F.mul(d.dscr)}
                    </td>
                    <td style={{ ...td, textAlign:"right", color:"#64748b" }}>{F.eur(d.bal)}</td>
                    <td style={{ ...td, textAlign:"right", fontWeight:600,
                                 color:d.exitEq > 0 ? "#1d4ed8" : d.exitEq < 0 ? "#ef4444" : "#cbd5e1" }}>
                      {d.exitEq !== 0 ? F.eur(d.exitEq) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Chart + sensitivity */}
        <div style={{ display:"grid", gridTemplateColumns:"2fr 3fr", gap:12 }}>

          {/* Bar chart */}
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:"12px 14px" }}>
            <div style={{ fontWeight:600, fontSize:12, color:"#1e293b", marginBottom:2 }}>Annual Cash Flows</div>
            <div style={{ fontSize:9, color:"#94a3b8", marginBottom:8 }}>◆ = Interest Only period</div>
            <ResponsiveContainer width="100%" height={185}>
              <BarChart data={chartData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize:9 }} />
                <YAxis tick={{ fontSize:9 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={v => F.eur(v)} contentStyle={{ fontSize:10 }} />
                <Legend wrapperStyle={{ fontSize:9 }} />
                <Bar dataKey="NOI"          fill="#3b82f6" radius={[2,2,0,0]} />
                <Bar dataKey="Debt Service" fill="#fca5a5" radius={[2,2,0,0]} />
                <Bar dataKey="CFADS"        fill="#34d399" radius={[2,2,0,0]} />
                <Bar dataKey="Exit Equity"  fill="#7c3aed" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* IRR sensitivity matrix */}
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:"12px 14px" }}>
            <div style={{ fontWeight:600, fontSize:12, color:"#1e293b", marginBottom:2 }}>Levered IRR Sensitivity</div>
            <div style={{ fontSize:10, color:"#94a3b8", marginBottom:10 }}>
              Exit Cap (rows) × LTV (cols) ·{" "}
              <span style={{ fontWeight:600, color:"#1d4ed8" }}>
                Current: {F.pct(inp.exitCap)} / {inp.ltv}% LTV
              </span>
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr>
                  <th style={{ fontSize:9, fontWeight:500, color:"#94a3b8", padding:"3px 5px",
                                textAlign:"left", width:55 }}>
                    Cap ↓ LTV →
                  </th>
                  {SENS.ltvs.map(l => (
                    <th key={l} style={{ fontSize:10, fontWeight:600, padding:"3px 4px", textAlign:"center",
                                         color:l === inp.ltv ? "#1d4ed8" : "#94a3b8" }}>{l}%</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SENS.caps.map((ec, ri) => {
                  const isBase = Math.abs(ec - inp.exitCap) < 0.001;
                  return (
                    <tr key={ri}>
                      <td style={{ padding:"2px 5px", fontSize:10, fontWeight:isBase?700:500,
                                   color:isBase?"#1d4ed8":"#475569" }}>{ec.toFixed(2)}%</td>
                      {SENS.grid[ri].map((irr, ci) => {
                        const s = irrS(irr);
                        const active = isBase && SENS.ltvs[ci] === inp.ltv;
                        return (
                          <td key={ci} style={{ padding:"2px 4px", textAlign:"center", fontSize:10,
                                               fontWeight:600, borderRadius:4, ...s,
                                               outline:active?"2px solid #1d4ed8":"none",
                                               outlineOffset:"-1px" }}>
                            {irr != null ? irr.toFixed(1) + "%" : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"6px 10px", marginTop:10 }}>
              {[["<0%","#be123c"],["0–8%","#f87171"],["8–12%","#fed7aa"],
                ["12–16%","#fef9c3"],["16–20%","#d1fae5"],["20–25%","#6ee7b7"],[">25%","#059669"]].map(([l,bg])=>(
                <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:10, height:10, borderRadius:2, background:bg }} />
                  <span style={{ fontSize:9, color:"#94a3b8" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PAGE 2 — WATERFALL / PROMOTE STRUCTURE
══════════════════════════════════════════════════════ */
function WaterfallPage({ inp, M }) {
  const [wf, setWf] = useState(WF_DEF);
  const W = useMemo(() => computeWaterfall(M, wf), [M, wf]);
  const nW = k => v => setWf(p => ({ ...p, [k]:v }));

  const chartData = [
    { name:"LP", roc:W.lpROC, pref:W.lpPref, catchup:0,          t1:W.lpT1, t2:W.lpT2 },
    { name:"GP", roc:W.gpROC, pref:0,         catchup:W.gpCatchUp,t1:W.gpT1, t2:W.gpT2 },
  ];

  const tiers = [
    { key:"roc",     label:"Return of Capital"                         },
    { key:"pref",    label:"Preferred Return"                          },
    { key:"catchup", label:"GP Catch-Up"                               },
    { key:"t1",      label:`Tier 1 (${wf.t1LP}% LP / ${wf.t1GP}% GP)` },
    { key:"t2",      label:`Tier 2 (${wf.t2LP}% LP / ${wf.t2GP}% GP)` },
  ];

  const TIER_COLOURS = ["#1d4ed8","#3b82f6","#7c3aed","#06b6d4","#10b981"];

  const tierRows = [
    { label:"Return of Capital",              lp:W.lpROC,     gp:W.gpROC,     lpPct:`${wf.lpPct}%`, gpPct:`${wf.gpPct}%` },
    { label:`Preferred Return (${wf.hurdle}% compounded)`, lp:W.lpPref,gp:0, lpPct:"100%",  gpPct:"—" },
    { label:"GP Catch-Up",                    lp:0,           gp:W.gpCatchUp, lpPct:"—",     gpPct:"100%" },
    { label:`Tier 1 Split`,                   lp:W.lpT1,      gp:W.gpT1,      lpPct:`${wf.t1LP}%`, gpPct:`${wf.t1GP}%` },
    { label:`Tier 2 Split`,                   lp:W.lpT2,      gp:W.gpT2,      lpPct:`${wf.t2LP}%`, gpPct:`${wf.t2GP}%` },
  ];

  const scoreStyle = bg => ({
    background:bg, borderRadius:10, padding:"16px 18px", color:"#fff",
  });

  return (
    <div style={{ display:"flex", height:"calc(100vh - 90px)", overflow:"hidden" }}>

      {/* Left: inputs */}
      <div style={{ width:220, flexShrink:0, background:"#fff", borderRight:"1px solid #f1f5f9",
                    padding:12, overflowY:"auto" }}>
        <div style={{ background:"#eff6ff", borderRadius:8, padding:"10px 12px", marginBottom:12 }}>
          <div style={{ fontSize:9, color:"#94a3b8", marginBottom:4 }}>TOTAL EQUITY POOL</div>
          <div style={{ fontSize:18, fontWeight:700, color:"#1d4ed8" }}>{F.eur(M.totalDist)}</div>
          <div style={{ fontSize:9, color:"#64748b", marginTop:2 }}>
            All distributions to equity · Deal MoM: {F.mul(M.mom)}
          </div>
        </div>

        <Sec title="Capital Commitments">
          <NI label="LP Commitment (%)" value={wf.lpPct}
            onChange={v => setWf(p => ({ ...p, lpPct:v, gpPct:+(100-v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI label="GP Commitment (%)" value={wf.gpPct}
            onChange={v => setWf(p => ({ ...p, gpPct:v, lpPct:+(100-v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <div style={{ fontSize:10, color:"#94a3b8", marginBottom:6 }}>
            LP capital: {F.eur(W.lpCap)} · GP capital: {F.eur(W.gpCap)}
          </div>
        </Sec>

        <Sec title="Preferred Return">
          <NI label="Hurdle Rate (p.a.)" value={wf.hurdle} onChange={nW("hurdle")}
            sfx="%" step="0.5" min="0" max="20" />
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ fontSize:10, color:"#475569" }}>GP Catch-Up</span>
            <button onClick={() => setWf(p => ({ ...p, catchUp:!p.catchUp }))}
              style={{ background:wf.catchUp?"#1d4ed8":"#e2e8f0",
                       color:wf.catchUp?"#fff":"#94a3b8",
                       border:"none", borderRadius:12, padding:"3px 12px",
                       fontSize:11, cursor:"pointer", fontWeight:600 }}>
              {wf.catchUp ? "ON" : "OFF"}
            </button>
          </div>
          {wf.catchUp && (
            <div style={{ fontSize:9, color:"#64748b", background:"#f8fafc",
                          borderRadius:6, padding:"6px 8px", marginBottom:8, lineHeight:1.5 }}>
              GP receives 100% of proceeds until its promote share is whole, before the Tier 1 split begins.
            </div>
          )}
        </Sec>

        <Sec title="Tier 1 Split">
          <NI label="LP Share (%)" value={wf.t1LP}
            onChange={v => setWf(p => ({ ...p, t1LP:v, t1GP:+(100-v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI label="GP (Promote) Share (%)" value={wf.t1GP}
            onChange={v => setWf(p => ({ ...p, t1GP:v, t1LP:+(100-v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI label="Until LP reaches MoM ×" value={wf.t2EMThreshold}
            onChange={nW("t2EMThreshold")} step="0.1" min="1" max="5" />
        </Sec>

        <Sec title="Tier 2 Split (above threshold)">
          <NI label="LP Share (%)" value={wf.t2LP}
            onChange={v => setWf(p => ({ ...p, t2LP:v, t2GP:+(100-v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI label="GP (Promote) Share (%)" value={wf.t2GP}
            onChange={v => setWf(p => ({ ...p, t2GP:v, t2LP:+(100-v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
        </Sec>
      </div>

      {/* Right: outputs */}
      <div style={{ flex:1, padding:14, overflowY:"auto", minWidth:0 }}>

        {/* LP / GP scorecard */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
          <div style={scoreStyle("#1d4ed8")}>
            <div style={{ fontSize:11, opacity:0.75, marginBottom:10 }}>LP — Limited Partner</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[["Capital In",F.eur(W.lpCap)],["Total Return",F.eur(W.lpTotal)],
                ["IRR",F.pct(W.lpIRR)],["MoM",F.mul(W.lpMoM)]].map(([l,v])=>(
                <div key={l}>
                  <div style={{ fontSize:10, opacity:0.7 }}>{l}</div>
                  <div style={{ fontSize:20, fontWeight:700, marginTop:2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={scoreStyle("#7c3aed")}>
            <div style={{ fontSize:11, opacity:0.75, marginBottom:10 }}>GP — General Partner / Sponsor</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              {[["Capital In",F.eur(W.gpCap)],["Total Return",F.eur(W.gpTotal)],
                ["IRR",F.pct(W.gpIRR)],["MoM",F.mul(W.gpMoM)]].map(([l,v])=>(
                <div key={l}>
                  <div style={{ fontSize:10, opacity:0.7 }}>{l}</div>
                  <div style={{ fontSize:20, fontWeight:700, marginTop:2 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, paddingTop:10, borderTop:"1px solid #ffffff25" }}>
              <span style={{ fontSize:10, opacity:0.7 }}>Promote earned: </span>
              <span style={{ fontSize:16, fontWeight:700 }}>{F.eur(W.gpPromote)}</span>
            </div>
          </div>
        </div>

        {/* Chart + tier table */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

          {/* Stacked bar chart */}
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:"12px 14px" }}>
            <div style={{ fontWeight:600, fontSize:12, color:"#1e293b", marginBottom:2 }}>
              Distribution Waterfall
            </div>
            <div style={{ fontSize:9, color:"#94a3b8", marginBottom:10 }}>
              LP (left) vs GP (right) — stacked by tier
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top:0, right:10, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize:11, fontWeight:600 }} />
                <YAxis tick={{ fontSize:9 }} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(v, name) => v > 100 ? [F.eur(v), name] : null}
                  contentStyle={{ fontSize:10 }}
                />
                <Legend wrapperStyle={{ fontSize:9 }} />
                {tiers.map((t, i) => (
                  <Bar key={t.key} dataKey={t.key} stackId="s" name={t.label}
                    fill={TIER_COLOURS[i]}
                    radius={t.key === "t2" ? [3,3,0,0] : [0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tier breakdown table */}
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #e2e8f0", padding:"12px 14px" }}>
            <div style={{ fontWeight:600, fontSize:12, color:"#1e293b", marginBottom:10 }}>
              Tier-by-Tier Breakdown
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
              <thead>
                <tr style={{ background:"#f8fafc" }}>
                  {["Tier","LP","GP","LP %","GP %"].map(h => (
                    <th key={h} style={{ fontSize:10, fontWeight:500, color:"#94a3b8",
                                         padding:"6px 8px", textAlign:h==="Tier"?"left":"right" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tierRows.map((r, i) => (
                  <tr key={i} style={{ borderTop:"1px solid #f8fafc" }}>
                    <td style={{ padding:"6px 8px", fontSize:10, color:"#475569" }}>{r.label}</td>
                    <td style={{ padding:"6px 8px", textAlign:"right", fontWeight:600, color:"#1d4ed8" }}>
                      {r.lp > 0 ? F.eur(r.lp) : "—"}
                    </td>
                    <td style={{ padding:"6px 8px", textAlign:"right", fontWeight:600, color:"#7c3aed" }}>
                      {r.gp > 0 ? F.eur(r.gp) : "—"}
                    </td>
                    <td style={{ padding:"6px 8px", textAlign:"right", color:"#64748b" }}>{r.lpPct}</td>
                    <td style={{ padding:"6px 8px", textAlign:"right", color:"#64748b" }}>{r.gpPct}</td>
                  </tr>
                ))}
                <tr style={{ borderTop:"2px solid #e2e8f0", background:"#f8fafc" }}>
                  <td style={{ padding:"7px 8px", fontWeight:700 }}>TOTAL</td>
                  <td style={{ padding:"7px 8px", textAlign:"right", fontWeight:700, color:"#1d4ed8", fontSize:12 }}>
                    {F.eur(W.lpTotal)}
                  </td>
                  <td style={{ padding:"7px 8px", textAlign:"right", fontWeight:700, color:"#7c3aed", fontSize:12 }}>
                    {F.eur(W.gpTotal)}
                  </td>
                  <td style={{ padding:"7px 8px", textAlign:"right", fontWeight:600, color:"#475569" }}>
                    {W.lpTotal > 0 ? `${(W.lpTotal / (W.lpTotal + W.gpTotal) * 100).toFixed(0)}%` : "—"}
                  </td>
                  <td style={{ padding:"7px 8px", textAlign:"right", fontWeight:600, color:"#475569" }}>
                    {W.gpTotal > 0 ? `${(W.gpTotal / (W.lpTotal + W.gpTotal) * 100).toFixed(0)}%` : "—"}
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ marginTop:14, background:"#f8fafc", borderRadius:8, padding:"10px 12px" }}>
              <div style={{ fontSize:9, color:"#94a3b8", fontWeight:700, marginBottom:6,
                            textTransform:"uppercase", letterSpacing:"0.06em" }}>
                Why this matters
              </div>
              <div style={{ fontSize:10, color:"#475569", lineHeight:1.6 }}>
                The GP invested <strong>{F.pct(wf.gpPct)}</strong> of equity but earns{" "}
                <strong>
                  {W.gpTotal > 0 && (W.lpTotal + W.gpTotal) > 0
                    ? `${(W.gpTotal / (W.lpTotal + W.gpTotal) * 100).toFixed(0)}%`
                    : "—"}
                </strong>{" "}
                of total distributions — at <strong>{F.pct(W.gpIRR)}</strong> IRR vs{" "}
                <strong>{F.pct(W.lpIRR)}</strong> for the LP.
                The <strong>{F.eur(W.gpPromote)}</strong> promote is earned purely through
                performance above the {wf.hurdle}% preferred return.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   PAGE 3 — MEMO EXPORT
══════════════════════════════════════════════════════ */
function MemoExportPage({ inp, M }) {
  const memoRef = useRef(null);

  const SENS = useMemo(() => {
    const b = inp.exitCap;
    return buildSens(inp, M.noi, [b-1, b-0.5, b, b+0.5, b+1], [50, 55, 60, 65, 70]);
  }, [inp, M.noi]);

  const today    = new Date().toLocaleDateString("en-GB", { year:"numeric", month:"long", day:"numeric" });
  const assetLbl = AC[inp.assetClass]?.name || "Real Estate";
  const execLine = `${assetLbl} acquisition targeting a ${M.HP}-year hold with `
    + `${F.pct(M.levIRR)} levered IRR at ${F.pct(M.capIn)} entry cap rate, `
    + `${inp.ltv}% LTV financing, and ${F.mul(M.mom)} equity multiple.`;

  const handlePrint = () => window.print();

  // ── Memo styles ──
  const ms = {
    page:  { width:794, background:"#fff", fontFamily:"Georgia, serif" },
    hdr:   { background:"#0f172a", padding:"28px 36px", color:"#fff" },
    sec:   { padding:"18px 36px", borderBottom:"1px solid #e2e8f0" },
    secH:  { fontSize:9, fontWeight:700, color:"#94a3b8", textTransform:"uppercase",
              letterSpacing:"0.1em", marginBottom:10, fontFamily:"sans-serif" },
    body:  { fontSize:11, color:"#334155", lineHeight:1.6, fontFamily:"sans-serif" },
    foot:  { background:"#f8fafc", padding:"12px 36px", borderTop:"1px solid #e2e8f0" },
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 90px)", overflow:"hidden" }}>

      {/* Control bar */}
      <div style={{ background:"#1e293b", padding:"10px 16px", display:"flex",
                    alignItems:"center", gap:12, flexShrink:0 }}>
        <div>
          <div style={{ color:"#e2e8f0", fontSize:13, fontWeight:600 }}>Investment Memo</div>
          <div style={{ color:"#64748b", fontSize:10 }}>Preview below · use Ctrl+P / ⌘+P to save as PDF</div>
        </div>
        <div style={{ flex:1 }} />
        <input
          value={inp.preparedBy}
          onChange={() => {}}
          placeholder="Prepared by (edit in top bar)"
          style={{ background:"#334155", color:"#94a3b8", border:"1px solid #475569",
                   borderRadius:6, padding:"5px 10px", fontSize:11, width:200, outline:"none" }}
        />
        <button onClick={handlePrint}
          style={{ background:"#1d4ed8", color:"#fff", border:"none", borderRadius:8,
                   padding:"8px 20px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
          🖨 Print / Save PDF
        </button>
      </div>

      {/* Scrollable preview */}
      <div style={{ flex:1, overflowY:"auto", background:"#64748b", padding:24,
                    display:"flex", justifyContent:"center" }}>
        <div ref={memoRef} style={ms.page}>

          {/* Header */}
          <div style={ms.hdr}>
            <div style={{ fontSize:10, color:"#475569", marginBottom:4,
                          letterSpacing:"0.1em", fontFamily:"sans-serif" }}>
              INVESTMENT MEMORANDUM
            </div>
            <div style={{ fontSize:22, fontWeight:700, letterSpacing:"-0.5px" }}>{inp.dealName}</div>
            <div style={{ display:"flex", gap:16, marginTop:8, fontSize:10,
                          color:"#94a3b8", fontFamily:"sans-serif" }}>
              <span>{assetLbl}</span>
              <span>·</span>
              <span>{today}</span>
              {inp.preparedBy && <><span>·</span><span>Prepared by {inp.preparedBy}</span></>}
            </div>
          </div>

          {/* Executive Summary */}
          <div style={ms.sec}>
            <div style={ms.secH}>Executive Summary</div>
            <div style={{ ...ms.body, fontStyle:"italic", color:"#1e293b", fontSize:12,
                          borderLeft:"3px solid #1d4ed8", paddingLeft:14 }}>
              {execLine}
            </div>
          </div>

          {/* Key Metrics */}
          <div style={ms.sec}>
            <div style={ms.secH}>Key Metrics</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)",
                          border:"1px solid #e2e8f0", borderRadius:6, overflow:"hidden" }}>
              {[
                [F.eur(inp.price),   "Purchase Price"],
                [F.pct(M.levIRR),   "Levered IRR"],
                [F.pct(M.unlevIRR), "Unlevered IRR"],
                [F.mul(M.mom),      "Equity Multiple"],
                [F.pct(M.coc),      "Cash-on-Cash Y1"],
                [F.pct(M.capIn),    "Entry Cap Rate"],
              ].map(([v, l], i) => (
                <div key={l} style={{ textAlign:"center", padding:"12px 6px",
                                       borderRight:i<5?"1px solid #e2e8f0":"none",
                                       fontFamily:"sans-serif" }}>
                  <div style={{ fontSize:20, fontWeight:700, color:"#0f172a",
                                letterSpacing:"-0.5px" }}>{v}</div>
                  <div style={{ fontSize:9, color:"#94a3b8", marginTop:3 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Capital Structure */}
          <div style={ms.sec}>
            <div style={ms.secH}>Capital Structure</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)",
                          border:"1px solid #e2e8f0", borderRadius:6, overflow:"hidden" }}>
              {[
                [`${inp.ltv}%`,     "LTV"],
                [F.eur(M.loan),     "Loan Amount"],
                [F.eur(M.equity),   "Equity Required"],
                [`${inp.intRate}%`, "Interest Rate"],
                [`${inp.ioYrs} yrs`,"Interest Only"],
                [F.mul(M.dscr1),    "DSCR Year 1"],
              ].map(([v, l], i) => (
                <div key={l} style={{ padding:"10px 14px", fontFamily:"sans-serif",
                                       borderRight:i<5?"1px solid #e2e8f0":"none" }}>
                  <div style={{ fontSize:9, color:"#94a3b8" }}>{l}</div>
                  <div style={{ fontSize:14, fontWeight:700, color:"#0f172a", marginTop:3 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sensitivity */}
          <div style={ms.sec}>
            <div style={ms.secH}>Levered IRR Sensitivity — Exit Cap Rate × LTV</div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:10,
                            fontFamily:"sans-serif" }}>
              <thead>
                <tr>
                  <th style={{ padding:"5px 8px", textAlign:"left", color:"#94a3b8", fontSize:9 }}>
                    Cap ↓ / LTV →
                  </th>
                  {SENS.ltvs.map(l => (
                    <th key={l} style={{ padding:"5px 8px", textAlign:"center", fontSize:10,
                                          fontWeight:700, color:l===inp.ltv?"#1d4ed8":"#475569" }}>
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
                      <td style={{ padding:"4px 8px", fontSize:10,
                                   fontWeight:isBase?700:400,
                                   color:isBase?"#1d4ed8":"#475569" }}>
                        {ec.toFixed(2)}%
                      </td>
                      {SENS.grid[ri].map((irr, ci) => {
                        const s = irrS(irr);
                        const active = isBase && SENS.ltvs[ci] === inp.ltv;
                        return (
                          <td key={ci} style={{ padding:"4px 6px", textAlign:"center",
                                               fontSize:10, fontWeight:600, borderRadius:3, ...s,
                                               outline:active?"2px solid #1d4ed8":"none",
                                               outlineOffset:"-1px" }}>
                            {irr != null ? irr.toFixed(1) + "%" : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Assumptions */}
          <div style={ms.sec}>
            <div style={ms.secH}>Key Assumptions</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10,
                          fontFamily:"sans-serif" }}>
              {[
                ["NOI Growth",     `${inp.noiGrowth}% p.a.`],
                ["Vacancy",        `${inp.vacancy}%`],
                ["OpEx",           `${inp.opexPct}% of EGI`],
                ["Hold Period",    `${inp.hold} years`],
                ["Amortisation",   `${inp.amortYrs} years`],
                ["Interest Only",  `${inp.ioYrs} years`],
                ["Exit Cap Rate",  `${inp.exitCap}%`],
                ["Disposal Costs", `${inp.exitCosts}%`],
              ].map(([l, v]) => (
                <div key={l} style={{ background:"#f8fafc", borderRadius:6, padding:"8px 10px" }}>
                  <div style={{ fontSize:9, color:"#94a3b8" }}>{l}</div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#334155", marginTop:2 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={ms.foot}>
            <div style={{ fontSize:9, color:"#94a3b8", lineHeight:1.5, fontFamily:"sans-serif" }}>
              <strong>DISCLAIMER</strong> · For illustrative purposes only. This document does not
              constitute an offer to sell or a solicitation to buy any security. All projections are
              based on stated assumptions and are not guaranteed. Past performance is not indicative
              of future results.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   APP — TAB NAVIGATION & SHARED STATE
══════════════════════════════════════════════════════ */
const TABS = [
  { id:"underwriter", label:"📊  Underwriter"         },
  { id:"waterfall",   label:"🏦  Waterfall / Promote"  },
  { id:"memo",        label:"📄  Memo Export"          },
];

export default function App() {
  const [inp, setInp] = useState(DEF);
  const [tab, setTab] = useState("underwriter");
  const M = useMemo(() => computeModel(inp), [inp]);

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh",
                  fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  background:"#f8fafc" }}>

      {/* Top navigation bar */}
      <div style={{ background:"#0f172a", padding:"0 16px", display:"flex",
                    alignItems:"center", gap:4, flexShrink:0 }}>
        <div style={{ marginRight:16 }}>
          <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>RE Deal Underwriter</div>
          <div style={{ color:"#475569", fontSize:10 }}>Iberian Real Estate · Private Equity</div>
        </div>

        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background:tab===t.id?"#1d4ed8":"transparent",
                     color:tab===t.id?"#fff":"#64748b",
                     border:"none", borderRadius:6, padding:"8px 14px",
                     fontSize:12, cursor:"pointer", fontWeight:tab===t.id?600:400 }}>
            {t.label}
          </button>
        ))}

        <div style={{ flex:1 }} />

        {/* Shared fields — visible on all pages */}
        <input value={inp.dealName}
          onChange={e => setInp(p => ({ ...p, dealName:e.target.value }))}
          style={{ background:"#1e293b", color:"#e2e8f0", border:"1px solid #334155",
                   borderRadius:6, padding:"5px 10px", fontSize:12, width:200, outline:"none" }}
          placeholder="Deal name" />
        <input value={inp.preparedBy}
          onChange={e => setInp(p => ({ ...p, preparedBy:e.target.value }))}
          style={{ background:"#1e293b", color:"#e2e8f0", border:"1px solid #334155",
                   borderRadius:6, padding:"5px 10px", fontSize:12, width:130, outline:"none" }}
          placeholder="Prepared by" />
        <select value={inp.assetClass}
          onChange={e => setInp(p => ({ ...p, assetClass:e.target.value }))}
          style={{ background:"#1e293b", color:"#e2e8f0", border:"1px solid #334155",
                   borderRadius:6, padding:"5px 8px", fontSize:11, outline:"none" }}>
          {Object.entries(AC).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <button onClick={() => setInp(DEF)}
          style={{ fontSize:10, color:"#64748b", border:"1px solid #334155", borderRadius:6,
                   padding:"5px 10px", background:"transparent", cursor:"pointer" }}>
          Reset
        </button>
      </div>

      {/* Page content */}
      <div style={{ flex:1, overflow:"hidden" }}>
        {tab === "underwriter" && <UnderwriterPage inp={inp} setInp={setInp} M={M} />}
        {tab === "waterfall"   && <WaterfallPage   inp={inp} M={M} />}
        {tab === "memo"        && <MemoExportPage  inp={inp} M={M} />}
      </div>
    </div>
  );
}
