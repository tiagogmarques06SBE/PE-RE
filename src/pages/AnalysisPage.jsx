import { useMemo } from "react";

import AttributionWaterfall from "../components/charts/AttributionWaterfall";
import ExitBridgeChart from "../components/charts/ExitBridgeChart";
import IrrByExitYear from "../components/charts/IrrByExitYear";
import TornadoChart from "../components/charts/TornadoChart";
import InvalidPanel from "../components/ui/InvalidPanel";
import {
  computeAttribution, computeScenarios, computeBreakeven, computeTornado, SCENARIOS,
} from "../lib/analysis";
import { F } from "../lib/formatters";

export default function AnalysisPage({ inp, M, wf }) {
  const A        = useMemo(() => computeAttribution(M, inp), [M, inp]);
  const scenarios = useMemo(() => computeScenarios(inp), [inp]);
  const BE       = useMemo(() => computeBreakeven(inp, wf?.hurdle), [inp, wf]);
  const tornado  = useMemo(() => computeTornado(inp), [inp]);

  if (!M.valid) {
    return <InvalidPanel message="Adjust inputs in the Underwriting tab to generate the analysis." />;
  }

  const scColor = (s) => (!s.valid || s.noIRR ? "weak" : s.levIRR >= 15 ? "good" : s.levIRR >= 8 ? "ok" : "weak");
  const pct     = (v) => (v == null ? "—" : `${v.toFixed(2)}%`);

  return (
    <div className="analysis-page">
      <div className="card">
        <div className="card-title">Value Creation Bridge</div>
        <div className="card-sub">
          Where the <strong>{F.eur(A.profit)}</strong> of equity profit comes from. Each driver adds up
          to total distributions less the equity invested.
        </div>
        <AttributionWaterfall items={A.items} />
        <div className="attr-grid">
          {A.items.map((it) => (
            <div key={it.key} className="attr-tile">
              <div className="attr-label">{it.label}</div>
              <div className="attr-val" style={{ color: it.val >= 0 ? "#059669" : "#ef4444" }}>
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

      <div className="card">
        <div className="card-title">IRR by Exit Year</div>
        <div className="card-sub">
          Levered IRR if the asset were sold in each year of the hold — shows the
          optimal exit window vs the planned {inp.hold}-year hold.
        </div>
        <IrrByExitYear inp={inp} />
      </div>

      <div className="card">
        <div className="card-title">Exit Equity Bridge</div>
        <div className="card-sub">
          How the gross sale value flows to equity investors after costs, senior repayment
          {inp.mezzOn ? ", and mezzanine repayment" : ""}.
        </div>
        <ExitBridgeChart M={M} inp={inp} />
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
              <div className="be-label">Exit cap for {BE.hurdle}% IRR hurdle</div>
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
              <div className="be-label">Exit cap cushion vs {BE.hurdle}% hurdle</div>
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
