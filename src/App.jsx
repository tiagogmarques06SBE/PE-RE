import { useState, useMemo, useEffect, useCallback } from "react";

import { DEF, WF_DEF, AC } from "./lib/config";
import { computeModel } from "./lib/model";
import { readStateFromUrl, writeStateToUrl } from "./lib/url";
import { BRAND, TABS } from "./constants";

import ErrorBanner from "./components/ui/ErrorBanner";
import UnderwriterPage from "./pages/UnderwriterPage";
import WaterfallPage from "./pages/WaterfallPage";
import AnalysisPage from "./pages/AnalysisPage";
import MemoExportPage from "./pages/MemoExportPage";

function initState() {
  const fromUrl = readStateFromUrl();
  if (fromUrl) return fromUrl;
  return { inp: { ...DEF }, wf: { ...WF_DEF }, tab: "underwriter" };
}

export default function App() {
  const initial = useMemo(() => initState(), []);
  const [inp, setInp] = useState(initial.inp);
  const [wf, setWf]   = useState(initial.wf);
  const [tab, setTab] = useState(initial.tab);
  const [shareMsg, setShareMsg] = useState("");

  const M = useMemo(() => computeModel(inp), [inp]);

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
          {TABS.map((t) => (
            <button
              key={t.id} type="button"
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
            onChange={(e) => setInp((p) => ({ ...p, dealName: e.target.value }))}
            placeholder="Deal name"
            aria-label="Deal name"
          />
          <input
            className="nav-input prepared-by"
            value={inp.preparedBy}
            onChange={(e) => setInp((p) => ({ ...p, preparedBy: e.target.value }))}
            placeholder="Prepared by"
            aria-label="Prepared by"
          />
          <select
            className="nav-select"
            value={inp.assetClass}
            onChange={(e) => setInp((p) => ({ ...p, assetClass: e.target.value }))}
            aria-label="Asset class"
          >
            {Object.entries(AC).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
          <button type="button" className={`btn btn-share${shareMsg ? " copied" : ""}`} onClick={handleShare}>
            {shareMsg || "Share deal"}
          </button>
          <button type="button" className="btn" onClick={handleReset}>Reset</button>
          <button type="button" className="btn btn-icon" onClick={() => setDark((d) => !d)} aria-label="Toggle dark mode" title={dark ? "Light mode" : "Dark mode"}>
            {dark ? "☀" : "☾"}
          </button>
        </div>
      </header>

      <ErrorBanner errors={M.errors} />

      <main className="page-content">
        {tab === "underwriter" && <UnderwriterPage inp={inp} setInp={setInp} M={M} dark={dark} />}
        {tab === "analysis"    && <AnalysisPage    inp={inp} M={M} dark={dark} />}
        {tab === "waterfall"   && <WaterfallPage   inp={inp} M={M} wf={wf} setWf={setWf} dark={dark} />}
        {tab === "memo"        && <MemoExportPage  inp={inp} M={M} dark={dark} />}
      </main>

      <footer className="brand-footer no-print">
        Praça · an Iberian real estate underwriting workbench ·{" "}
        <a href={BRAND.url} target="_blank" rel="noopener noreferrer">{BRAND.name}</a>
      </footer>
    </div>
  );
}
