import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

import NI from "../components/ui/NI";
import Sec from "../components/ui/Sec";
import InvalidPanel from "../components/ui/InvalidPanel";
import { computeWaterfall } from "../lib/waterfall";
import { F } from "../lib/formatters";
import { PAL } from "../constants";

export default function WaterfallPage({ inp, M, wf, setWf, dark }) {
  const W = useMemo(() => computeWaterfall(M, wf), [M, wf]);
  const nW = (k) => (v) => setWf((p) => ({ ...p, [k]: v }));

  const tk = dark ? "#8b948a" : "#6b766f";
  const gk = dark ? "#2c322a" : "#e0dccf";
  const tt = dark
    ? { background: "#21261f", border: "1px solid #2c322a", color: "#ece9df", fontSize: 10 }
    : { background: "#fbf9f4", border: "1px solid #e0dccf", color: "#1b2a24", fontSize: 10 };
  const totalRowBg = dark ? "#21261f" : "#efece2";
  const tblHeadBg  = dark ? "#21261f" : "#efece2";
  const infoBoxBg  = dark ? "#21261f" : "#efece2";

  const TIER_COLOURS = [PAL.greenDeep, PAL.green, PAL.brass, PAL.sage, PAL.slate];

  const chartData = useMemo(() => [
    { name: "LP", roc: W.lpROC, pref: W.lpPref, catchup: 0,         t1: W.lpT1, t2: W.lpT2 },
    { name: "GP", roc: W.gpROC, pref: 0,         catchup: W.gpCatchUp, t1: W.gpT1, t2: W.gpT2 },
  ], [W]);

  const tiers = [
    { key: "roc",     label: "Return of Capital" },
    { key: "pref",    label: "Preferred Return" },
    { key: "catchup", label: "GP Catch-Up" },
    { key: "t1",      label: `Tier 1 (${wf.t1LP}% LP / ${wf.t1GP}% GP)` },
    { key: "t2",      label: `Tier 2 (${wf.t2LP}% LP / ${wf.t2GP}% GP)` },
  ];

  const tierRows = [
    { label: "Return of Capital",                       lp: W.lpROC,  gp: W.gpROC,     lpPct: `${wf.lpPct}%`, gpPct: `${wf.gpPct}%` },
    { label: `Preferred Return (${wf.hurdle}% compounded)`, lp: W.lpPref, gp: 0,           lpPct: "100%",         gpPct: "—"            },
    { label: "GP Catch-Up",                             lp: 0,         gp: W.gpCatchUp, lpPct: "—",            gpPct: "100%"         },
    { label: "Tier 1 Split",                            lp: W.lpT1,   gp: W.gpT1,      lpPct: `${wf.t1LP}%`,  gpPct: `${wf.t1GP}%`  },
    { label: "Tier 2 Split",                            lp: W.lpT2,   gp: W.gpT2,      lpPct: `${wf.t2LP}%`,  gpPct: `${wf.t2GP}%`  },
  ];

  if (!M.valid) {
    return (
      <div className="page-layout">
        <aside className="sidebar" />
        <InvalidPanel />
      </div>
    );
  }

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
            onChange={(v) => setWf((p) => ({ ...p, lpPct: v, gpPct: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI id="gpPct" label="GP Commitment (%)" value={wf.gpPct}
            onChange={(v) => setWf((p) => ({ ...p, gpPct: v, lpPct: +(100 - v).toFixed(1) }))}
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
              onClick={() => setWf((p) => ({ ...p, catchUp: !p.catchUp }))}
              style={{ background: wf.catchUp ? PAL.green : "#e2e8f0", color: wf.catchUp ? "#fff" : "#94a3b8", border: "none", borderRadius: 12, padding: "3px 12px", fontWeight: 600 }}>
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
            onChange={(v) => setWf((p) => ({ ...p, t1LP: v, t1GP: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI id="t1GP" label="GP (Promote) Share (%)" value={wf.t1GP}
            onChange={(v) => setWf((p) => ({ ...p, t1GP: v, t1LP: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI id="t2EMThreshold" label="Until LP reaches MoM ×" value={wf.t2EMThreshold} onChange={nW("t2EMThreshold")} step="0.1" min="1" max="5" />
          <div style={{ fontSize: 9, color: "#64748b", marginBottom: 8, lineHeight: 1.4 }}>
            Hurdle measured after return of capital and preferred return only.
          </div>
        </Sec>

        <Sec title="Tier 2 Split (above threshold)">
          <NI id="t2LP" label="LP Share (%)" value={wf.t2LP}
            onChange={(v) => setWf((p) => ({ ...p, t2LP: v, t2GP: +(100 - v).toFixed(1) }))}
            sfx="%" step="5" min="0" max="100" />
          <NI id="t2GP" label="GP (Promote) Share (%)" value={wf.t2GP}
            onChange={(v) => setWf((p) => ({ ...p, t2GP: v, t2LP: +(100 - v).toFixed(1) }))}
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
            <div className="card-title" style={{ fontSize: 12 }}>Distribution Waterfall</div>
            <div style={{ fontSize: 9, color: "#94a3b8", marginBottom: 10 }}>LP (left) vs GP (right) — stacked by tier</div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gk} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 600, fill: tk }} />
                <YAxis tick={{ fontSize: 9, fill: tk }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
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
            <div className="card-title" style={{ fontSize: 12 }}>Tier-by-Tier Breakdown</div>
            <div className="table-scroll">
              <table className="data-table" style={{ minWidth: 400 }}>
                <thead>
                  <tr style={{ background: tblHeadBg }}>
                    {["Tier", "LP", "GP", "LP %", "GP %"].map((h) => (
                      <th key={h} style={{ textAlign: h === "Tier" ? "left" : "right" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tierRows.map((r, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #f8fafc" }}>
                      <td style={{ fontSize: 10, color: "#475569" }}>{r.label}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: PAL.green }}>{r.lp > 0 ? F.eur(r.lp) : "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: PAL.brass }}>{r.gp > 0 ? F.eur(r.gp) : "—"}</td>
                      <td style={{ textAlign: "right", color: "#64748b" }}>{r.lpPct}</td>
                      <td style={{ textAlign: "right", color: "#64748b" }}>{r.gpPct}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop: "2px solid #e2e8f0", background: totalRowBg }}>
                    <td style={{ fontWeight: 700 }}>Total</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: PAL.green, fontSize: 12 }}>{F.eur(W.lpTotal)}</td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: PAL.brass, fontSize: 12 }}>{F.eur(W.gpTotal)}</td>
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

            <div style={{ marginTop: 14, background: infoBoxBg, borderRadius: 6, padding: "10px 12px" }}>
              <div className="sec-title">Sponsor economics</div>
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
