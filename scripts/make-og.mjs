import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sharp = require("sharp");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0f172a"/>
  <rect x="0" y="0" width="1200" height="5" fill="#0ea5e9"/>
  <rect x="100" y="560" width="1000" height="1" fill="#1e293b"/>
  <text x="100" y="230" font-family="Georgia, serif" font-size="108" font-weight="700" fill="#f8fafc" letter-spacing="-2">Praça</text>
  <rect x="100" y="252" width="160" height="4" fill="#0ea5e9" rx="2"/>
  <text x="100" y="320" font-family="Arial, sans-serif" font-size="38" font-weight="400" fill="#0ea5e9">Real Estate Underwriting · IC-grade</text>
  <text x="100" y="390" font-family="Arial, sans-serif" font-size="24" fill="#475569">Levered IRR · LP/GP Waterfall · IRR Sensitivity · IC Memo</text>
  <text x="100" y="530" font-family="Arial, sans-serif" font-size="22" fill="#334155">Tiago Marques · Nova SBE</text>
  <rect x="820" y="360" width="50" height="140" fill="#059669" opacity="0.7" rx="4"/>
  <rect x="890" y="300" width="50" height="200" fill="#0ea5e9" opacity="0.5" rx="4"/>
  <rect x="960" y="320" width="50" height="180" fill="#059669" opacity="0.85" rx="4"/>
  <rect x="1030" y="280" width="50" height="220" fill="#0ea5e9" opacity="0.7" rx="4"/>
</svg>`;

const outPath = resolve(__dirname, "../public/og-cover.png");

await sharp(Buffer.from(svg))
  .resize(1200, 630)
  .png()
  .toFile(outPath);

console.log("og-cover.png written to", outPath);
