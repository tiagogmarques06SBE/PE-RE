import { DEF, WF_DEF, AC, INP_KEYS, WF_KEYS } from "./config";

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(bin);
}

function base64ToUtf8(str) {
  const bin = atob(str);
  const bytes = Uint8Array.from(bin, (m) => m.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeAppState({ inp, wf, tab }) {
  const payload = {
    v: 1,
    tab: tab || "underwriter",
    inp: INP_KEYS.reduce((o, k) => { o[k] = inp[k]; return o; }, {}),
    wf: WF_KEYS.reduce((o, k) => { o[k] = wf[k]; return o; }, {}),
  };
  return utf8ToBase64(JSON.stringify(payload));
}

export function decodeAppState(encoded) {
  if (!encoded) return null;
  try {
    const payload = JSON.parse(base64ToUtf8(encoded));
    if (!payload || payload.v !== 1) return null;

    const inp = { ...DEF };
    INP_KEYS.forEach((k) => { if (payload.inp?.[k] !== undefined) inp[k] = payload.inp[k]; });
    if (payload.inp?.assetClass && AC[payload.inp.assetClass]) inp.assetClass = payload.inp.assetClass;

    const wf = { ...WF_DEF };
    WF_KEYS.forEach((k) => { if (payload.wf?.[k] !== undefined) wf[k] = payload.wf[k]; });

    const tab = ["underwriter", "analysis", "waterfall", "memo"].includes(payload.tab)
      ? payload.tab
      : "underwriter";

    return { inp, wf, tab };
  } catch {
    return null;
  }
}

export function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return decodeAppState(params.get("d"));
}

export function writeStateToUrl({ inp, wf, tab }) {
  const encoded = encodeAppState({ inp, wf, tab });
  const url = new URL(window.location.href);
  url.searchParams.set("d", encoded);
  window.history.replaceState(null, "", url.toString());
}
