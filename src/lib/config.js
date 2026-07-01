// Asset classes — ordered as a PE professional would structure Iberian coverage.
// `rev`/`vac`/`opx` drive the sector-specific input terminology; `thesis` is the
// one-line market read shown in the underwriting header.
export const AC = {
  industrial:  { name: "Industrial / Logistics",  rev: "Contracted Rent",     vac: "Void Allowance",        opx: "Non-Recoverable Costs",
    thesis: "Hottest Iberian sector — e-commerce and nearshoring demand on port corridors." },
  residential: { name: "Residential / BTR",        rev: "Gross Rent Roll",     vac: "Vacancy & Bad Debt",    opx: "Operating Expenses",
    thesis: "Structural housing supply shortage across major Iberian metros." },
  office:      { name: "Office",                    rev: "Passing Rent",        vac: "Void Allowance",        opx: "Non-Recoverable Costs",
    thesis: "Core transaction volume; value-add repricing in prime CBD post-COVID." },
  hospitality: { name: "Hospitality",              rev: "Total Hotel Revenue", vac: "Out-of-Order Rooms",    opx: "Hotel Operating Costs",
    thesis: "Tourism-led economy; a major Iberian PE asset class on wide yields." },
  retail:      { name: "Retail / Mixed-Use",       rev: "Gross Passing Rent",  vac: "Vacancy Allowance",     opx: "Non-Recoverable OpEx",
    thesis: "Selective — dominant high streets and prime retail parks still trade." },
  student:     { name: "Student Housing / PBSA",   rev: "Total Room Income",   vac: "Void / Non-Renewal",    opx: "Operating Expenses",
    thesis: "Fastest-growing segment; deep PBSA pipeline across university cities." },
  development: { name: "Development / BTS",         rev: "Stabilised Rent Roll",vac: "Lease-Up Void",         opx: "Operating Expenses",
    thesis: "Build-to-suit and speculative development — the highest-return strategy." },
};

export const DEF = {
  dealName: "CBD Office — Value-Add",
  assetClass: "office",
  grossRev: 700000,
  vacancy: 8,
  opexPct: 20,
  noiGrowth: 3,
  price: 9000000,
  acqCosts: 2,
  ltv: 60,
  intRate: 4.5,
  amortYrs: 25,
  ioYrs: 2,
  hold: 5,
  exitCap: 5.25,
  exitCosts: 1.5,
  preparedBy: "",
  capex: 0,
  leaseUpYrs: 0,
  entryVacancy: 8,
  refiYr: 0,
  refiLtv: 65,
  refiCap: 5.25,
  refiCosts: 1.0,
  targetIRR: 15,
  mezzOn: false,
  mezzLtv: 0,
  mezzRate: 10,
  mezzPik: false,
};

export const WF_DEF = {
  lpPct: 90,
  gpPct: 10,
  hurdle: 8,
  catchUp: true,
  t1LP: 80,
  t1GP: 20,
  t2LP: 60,
  t2GP: 40,
  t2EMThreshold: 2.0,
};

export const INP_KEYS = [
  "dealName", "assetClass", "preparedBy",
  "grossRev", "vacancy", "opexPct", "noiGrowth",
  "price", "acqCosts", "ltv", "intRate", "amortYrs", "ioYrs",
  "hold", "exitCap", "exitCosts",
  "capex", "leaseUpYrs", "entryVacancy",
  "refiYr", "refiLtv", "refiCap", "refiCosts", "targetIRR",
  "mezzOn", "mezzLtv", "mezzRate", "mezzPik",
];

/* Loadable example deals, grouped for the top-nav dropdown.
   "Iberian sectors" — one representative, fully-calibrated deal per asset class,
   forming a coherent risk-return ladder (Retail ~10% IRR → Development ~19%).
   "Risk strategy" — the same office asset underwritten across the risk spectrum. */
export const PRESETS = {
  // ── Iberian sectors ─────────────────────────────────────────────
  industrial: {
    group: "Iberian sectors", label: "Industrial / Logistics — big-box",
    inp: { ...DEF, dealName: "Big-Box Logistics — Industrial", assetClass: "industrial",
      grossRev: 600000, vacancy: 3, opexPct: 8, noiGrowth: 3.5,
      price: 9330000, acqCosts: 2, ltv: 58, intRate: 4.5, amortYrs: 30, ioYrs: 1,
      hold: 5, exitCap: 5.5, exitCosts: 1.5, capex: 0, leaseUpYrs: 0, entryVacancy: 3,
      refiYr: 0, mezzOn: false, targetIRR: 14 },
  },
  residential: {
    group: "Iberian sectors", label: "Residential / BTR — urban scheme",
    inp: { ...DEF, dealName: "Urban BTR — Residential", assetClass: "residential",
      grossRev: 520000, vacancy: 4, opexPct: 22, noiGrowth: 3.5,
      price: 9500000, acqCosts: 2, ltv: 62, intRate: 4.5, amortYrs: 30, ioYrs: 2,
      hold: 6, exitCap: 4.0, exitCosts: 1.5, capex: 0, leaseUpYrs: 0, entryVacancy: 4,
      refiYr: 0, mezzOn: false, targetIRR: 11 },
  },
  office: {
    group: "Iberian sectors", label: "Office — value-add (reference)",
    inp: { ...DEF },
  },
  hospitality: {
    group: "Iberian sectors", label: "Hospitality — resort hotel",
    inp: { ...DEF, dealName: "Resort Hotel — Hospitality", assetClass: "hospitality",
      grossRev: 2100000, vacancy: 2, opexPct: 70, noiGrowth: 3.0,
      price: 8820000, acqCosts: 2, ltv: 60, intRate: 5.0, amortYrs: 25, ioYrs: 1,
      hold: 5, exitCap: 7.0, exitCosts: 1.5, capex: 0, leaseUpYrs: 0, entryVacancy: 2,
      refiYr: 0, mezzOn: false, targetIRR: 13 },
  },
  retail: {
    group: "Iberian sectors", label: "Retail — dominant retail park",
    inp: { ...DEF, dealName: "Dominant Retail Park — Retail", assetClass: "retail",
      grossRev: 760000, vacancy: 6, opexPct: 18, noiGrowth: 1.5,
      price: 9400000, acqCosts: 2, ltv: 60, intRate: 4.75, amortYrs: 30, ioYrs: 0,
      hold: 6, exitCap: 6.25, exitCosts: 1.5, capex: 0, leaseUpYrs: 0, entryVacancy: 6,
      refiYr: 0, mezzOn: false, targetIRR: 9 },
  },
  student: {
    group: "Iberian sectors", label: "Student Housing / PBSA",
    inp: { ...DEF, dealName: "PBSA — Student Housing", assetClass: "student",
      grossRev: 720000, vacancy: 5, opexPct: 28, noiGrowth: 4.0,
      price: 9240000, acqCosts: 2, ltv: 58, intRate: 4.5, amortYrs: 30, ioYrs: 1,
      hold: 5, exitCap: 5.25, exitCosts: 1.5, capex: 0, leaseUpYrs: 0, entryVacancy: 5,
      refiYr: 0, mezzOn: false, targetIRR: 13 },
  },
  development: {
    group: "Iberian sectors", label: "Development / BTS — pre-let",
    inp: { ...DEF, dealName: "Pre-Let BTS — Development", assetClass: "development",
      grossRev: 800000, vacancy: 8, opexPct: 20, noiGrowth: 4.5,
      price: 8750000, acqCosts: 2, ltv: 68, intRate: 5.0, amortYrs: 25, ioYrs: 1,
      hold: 5, exitCap: 5.5, exitCosts: 1.5, capex: 800000, leaseUpYrs: 3, entryVacancy: 52,
      refiYr: 0, mezzOn: false, targetIRR: 18 },
  },

  // ── Risk strategy (office asset, full risk spectrum) ────────────
  core: {
    group: "Risk strategy", label: "Core — prime office",
    inp: { ...DEF, dealName: "Prime Office — Core", assetClass: "office",
      grossRev: 700000, vacancy: 4, opexPct: 18, noiGrowth: 2,
      price: 11500000, acqCosts: 2, ltv: 45, intRate: 4.0, amortYrs: 30, ioYrs: 2,
      hold: 7, exitCap: 4.85, exitCosts: 1.5, capex: 0, leaseUpYrs: 0, entryVacancy: 4,
      refiYr: 0, mezzOn: false, targetIRR: 8 },
  },
  corePlus: {
    group: "Risk strategy", label: "Core-Plus — light value-add",
    inp: { ...DEF, dealName: "Office — Core-Plus", assetClass: "office",
      grossRev: 700000, vacancy: 7, opexPct: 20, noiGrowth: 3.5,
      price: 10200000, acqCosts: 2, ltv: 58, intRate: 4.25, amortYrs: 30, ioYrs: 2,
      hold: 6, exitCap: 5.15, exitCosts: 1.5, capex: 150000, leaseUpYrs: 1, entryVacancy: 12,
      refiYr: 0, mezzOn: false, targetIRR: 11 },
  },
  valueAdd: {
    group: "Risk strategy", label: "Value-Add — reposition & lease-up",
    inp: { ...DEF, dealName: "Office Reposition — Value-Add", assetClass: "office",
      grossRev: 700000, vacancy: 8, opexPct: 20, noiGrowth: 4.5,
      price: 9000000, acqCosts: 2, ltv: 63, intRate: 4.5, amortYrs: 25, ioYrs: 2,
      hold: 5, exitCap: 5.25, exitCosts: 1.5, capex: 600000, leaseUpYrs: 2, entryVacancy: 20,
      refiYr: 0, mezzOn: false, targetIRR: 15 },
  },
  opportunistic: {
    group: "Risk strategy", label: "Opportunistic — reposition + PIK mezz",
    inp: { ...DEF, dealName: "Office Reposition — Opportunistic", assetClass: "office",
      grossRev: 800000, vacancy: 10, opexPct: 22, noiGrowth: 7,
      price: 9500000, acqCosts: 2, ltv: 70, intRate: 5.0, amortYrs: 25, ioYrs: 3,
      hold: 4, exitCap: 5.25, exitCosts: 1.5, capex: 1200000, leaseUpYrs: 3, entryVacancy: 35,
      refiYr: 2, refiLtv: 72, refiCap: 5.5, refiCosts: 1.0,
      mezzOn: true, mezzLtv: 15, mezzRate: 12, mezzPik: true, targetIRR: 20 },
  },
};

export const WF_KEYS = [
  "lpPct", "gpPct", "hurdle", "catchUp",
  "t1LP", "t1GP", "t2LP", "t2GP", "t2EMThreshold",
];
