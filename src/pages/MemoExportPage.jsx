import { useMemo } from "react";
import { F } from "../lib/formatters";
import { PAL, BRAND } from "../constants";
import { AC } from "../lib/config";
import { buildSens, irrS } from "../lib/sensitivity";

export default function MemoExportPage({ inp, M, dark }) {
  const SENS = useMemo(() => {
    const b = inp.exitCap;
    return buildSens(inp, M.noi, [b - 1, b - 0.5, b, b + 0.5, b + 1], [50, 55, 60, 65, 70]);
  }, [inp, M.noi]);

  const today    = new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  const assetLbl = AC[inp.assetClass]?.name || "Real Estate";
  const execLine = M.valid
    ? `${assetLbl} acquisition targeting a ${M.HP}-year hold with `
      + `${F.pct(M.levIRR)} levered IRR at ${F.pct(M.capIn)} entry cap rate, `
      + `${inp.ltv}% LTV financing, and ${F.mul(M.mom)} equity multiple.`
    : "Model inputs require adjustment before metrics can be generated.";

  const docBg     = dark ? "#111827" : "#fff";
  const docBorder = dark ? "#1f2937" : "#e2e8f0";
  const docText   = dark ? "#d1d5db" : "#334155";
  const docMuted  = dark ? "#6b7280" : "#94a3b8";

  const ms = {
    hdr:  { background: "#0f172a", padding: "30px 36px", color: "#f8fafc", borderTop: "3px solid #0ea5e9" },
    sec:  { padding: "18px 36px", borderBottom: `1px solid ${docBorder}` },
    secH: { fontSize: 11, fontWeight: 700, color: dark ? "#9ca3af" : "#475569", marginBottom: 10, fontFamily: "sans-serif" },
    body: { fontSize: 11, color: docText, lineHeight: 1.6, fontFamily: "sans-serif" },
    foot: { background: dark ? "#020617" : "#f8fafc", padding: "12px 36px", borderTop: `1px solid ${docBorder}` },
  };

  return (
    <div className="memo-page">
      <div className="memo-control-bar no-print">
        <div>
          <div style={{ color: "#f8fafc", fontSize: 14, fontWeight: 600, fontFamily: "Fraunces, serif" }}>Investment committee memo</div>
        </div>
        <div style={{ flex: 1 }} />
        {inp.preparedBy && (
          <div style={{ color: "#94a3b8", fontSize: 11 }}>Prepared by {inp.preparedBy}</div>
        )}
        <button type="button" className="btn btn-primary" onClick={() => window.print()} aria-label="Print or save as PDF">
          Save as PDF
        </button>
      </div>

      <div className="memo-preview-wrap">
        <div className="memo-doc" style={{ background: docBg, borderColor: docBorder }}>
          <div style={ms.hdr}>
            <div style={{ fontSize: 11.5, color: "#38bdf8", marginBottom: 6, fontFamily: "sans-serif" }}>
              Confidential · Investment committee memorandum
            </div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.015em", fontFamily: "Fraunces, serif" }}>{inp.dealName}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 10, fontSize: 11, color: "#94a3b8", fontFamily: "sans-serif" }}>
              <span>{assetLbl}</span>
              <span>·</span>
              <span>{today}</span>
              {inp.preparedBy && <><span>·</span><span>Prepared by {inp.preparedBy}</span></>}
            </div>
          </div>

          <div style={ms.sec}>
            <div style={ms.secH}>Executive Summary</div>
            <div style={{ ...ms.body, fontStyle: "italic", fontSize: 12.5, lineHeight: 1.75, color: dark ? "#d1d5db" : "#1e293b" }}>
              {execLine}
            </div>
          </div>

          {M.valid && (
            <>
              <div style={ms.sec}>
                <div style={ms.secH}>Key Metrics</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", border: `1px solid ${docBorder}`, borderRadius: 6, overflow: "hidden" }}>
                  {[
                    [F.eur(inp.price),    "Purchase Price"],
                    [F.pct(M.levIRR),    "Levered IRR"],
                    [F.pct(M.unlevIRR),  "Unlevered IRR"],
                    [F.mul(M.mom),        "Equity Multiple"],
                    [F.pct(M.coc),        "Cash-on-Cash Y1"],
                    [F.pct(M.capIn),      "Entry Cap Rate"],
                  ].map(([v, l]) => (
                    <div key={l} style={{ textAlign: "center", padding: "12px 6px", borderRight: `1px solid ${docBorder}`, fontFamily: "sans-serif" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: dark ? "#f8fafc" : "#0f172a", letterSpacing: "-0.5px" }}>{v}</div>
                      <div style={{ fontSize: 9, color: docMuted, marginTop: 3 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={ms.sec}>
                <div style={ms.secH}>Capital Structure</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", border: `1px solid ${docBorder}`, borderRadius: 6, overflow: "hidden" }}>
                  {[
                    [`${inp.ltv}%`,      "LTV"],
                    [F.eur(M.loan),      "Loan Amount"],
                    [F.eur(M.equity),    "Equity Required"],
                    [`${inp.intRate}%`,  "Interest Rate"],
                    [`${inp.ioYrs} yrs`, "Interest Only"],
                    [F.mul(M.dscr1),     "DSCR Year 1"],
                  ].map(([v, l]) => (
                    <div key={l} style={{ padding: "10px 14px", fontFamily: "sans-serif", borderRight: `1px solid ${docBorder}` }}>
                      <div style={{ fontSize: 9, color: docMuted }}>{l}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: dark ? "#f8fafc" : "#0f172a", marginTop: 3 }}>{v}</div>
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
                        {SENS.ltvs.map((l) => (
                          <th key={l} style={{ padding: "5px 8px", textAlign: "center", fontSize: 10, fontWeight: 700, color: l === inp.ltv ? PAL.green : "#475569" }}>
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
                            <td style={{ padding: "4px 8px", fontSize: 10, fontWeight: isBase ? 700 : 400, color: isBase ? PAL.green : "#475569" }}>
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
                    ["NOI Growth",    `${inp.noiGrowth}% p.a.`],
                    ["Vacancy",       `${inp.vacancy}%`],
                    ["OpEx",          `${inp.opexPct}% of EGI`],
                    ["Hold Period",   `${inp.hold} years`],
                    ["Amortisation",  `${inp.amortYrs} years`],
                    ["Interest Only", `${inp.ioYrs} years`],
                    ["Exit Cap Rate", `${inp.exitCap}%`],
                    ["Disposal Costs",`${inp.exitCosts}%`],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: dark ? "#1e293b" : "#f8fafc", borderRadius: 6, padding: "8px 10px" }}>
                      <div style={{ fontSize: 9, color: docMuted }}>{l}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: docText, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div style={ms.foot}>
            <div style={{ fontSize: 9, color: "#94a3b8", lineHeight: 1.5, fontFamily: "sans-serif" }}>
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
