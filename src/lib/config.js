export const AC = {
  office:      { name: "Office",                 rev: "Passing Rent",        vac: "Void Allowance",        opx: "Non-Recoverable Costs" },
  residential: { name: "Residential / BTR",      rev: "Gross Rent Roll",     vac: "Vacancy & Bad Debt",    opx: "Operating Expenses"     },
  hospitality: { name: "Hospitality",            rev: "Total Hotel Revenue", vac: "Mgmt & Franchise Fees", opx: "Hotel Operating Costs"  },
  retail:      { name: "Retail / Mixed-Use",     rev: "Gross Passing Rent",  vac: "Vacancy Allowance",     opx: "Non-Recoverable OpEx"   },
  industrial:  { name: "Industrial / Logistics", rev: "Contracted Rent",     vac: "Void Allowance",        opx: "Property Running Costs" },
  development: { name: "Development (BTS/BTR)",  rev: "GDV / End Value",     vac: "Stabilisation Disc.",   opx: "Construction Costs"     },
};

export const DEF = {
  dealName: "Lisbon Office – Value Add",
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

export const WF_KEYS = [
  "lpPct", "gpPct", "hurdle", "catchUp",
  "t1LP", "t1GP", "t2LP", "t2GP", "t2EMThreshold",
];
