/* BacktestCard engine. MIT. Pure functions, runs in browser and Node.
   All maths is monthly. Educational tool only, not investment advice. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BTEngine = factory();
})(this, function () {
  "use strict";

  const ASSETS = {
    us_eq:   { label: "US stocks (price index)", cur: "USD", kind: "px",   key: "US_EQ_PX", note: "OECD share price index, USA. Price only, no dividends." },
    in_eq:   { label: "India stocks (price index)", cur: "INR", kind: "px", key: "IN_EQ_PX", note: "OECD share price index, India. Price only, no dividends." },
    gold:    { label: "Gold", cur: "USD", kind: "px", key: "GOLD_USD", note: "World Bank Pink Sheet, USD/oz, monthly average." },
    us_cash: { label: "US T-bills (cash)", cur: "USD", kind: "cash", key: "US_TB3M", note: "Fed H.15 3-month T-bill yield, earned monthly." },
    us_bond: { label: "US 10y Treasury (modelled)", cur: "USD", kind: "bond", key: "US_10Y", note: "Fed H.15 10y yield; return modelled as a constant-maturity par bond." },
    in_cash: { label: "India 3m rate (cash)", cur: "INR", kind: "cash", key: "IN_3M", note: "OECD India 3-month interbank/T-bill rate." },
    in_bond: { label: "India 10y G-sec (modelled)", cur: "INR", kind: "bond", key: "IN_10Y", note: "OECD India long-term yield; modelled par bond return." },
  };

  const CRISES = [
    { id: "dotcom", name: "Dot-com bust", start: "2000-03", end: "2002-09" },
    { id: "gfc", name: "2008 crash", start: "2007-10", end: "2009-02" },
    { id: "taper", name: "2013 taper tantrum (INR)", start: "2013-05", end: "2013-08" },
    { id: "covid", name: "2020 COVID crash", start: "2020-01", end: "2020-03" },
    { id: "rates22", name: "2022 rate shock", start: "2021-12", end: "2022-09" },
  ];

  function nextMonth(m) { let y = +m.slice(0, 4), mo = +m.slice(5, 7) + 1; if (mo > 12) { mo = 1; y++; } return y + "-" + String(mo).padStart(2, "0"); }
  function prevMonth(m) { let y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1; if (mo < 1) { mo = 12; y--; } return y + "-" + String(mo).padStart(2, "0"); }

  // Monthly total return of a constant-maturity 10y par bond (semiannual coupons): buy at par with
  // coupon y0, one month later value all remaining cash flows (dirty price, i.e. incl. accrued coupon)
  // at the new yield y1. Remaining flows fall at j/2 - 1/12 years, j = 1..2n, so
  // dirty = (1+y1/2)^(1/6) * P_2n(y1), with P_2n the standard price of a 2n-period bond.
  function bondReturn(y0pct, y1pct, n) {
    n = n || 10;
    const c = y0pct / 100, y = y1pct / 100, k = 2 * n, v = 1 / (1 + y / 2), vk = Math.pow(v, k);
    const p = y === 0 ? 1 + c / 2 * k : (c / y) * (1 - vk) + vk;
    return Math.pow(1 + y / 2, 1 / 6) * p - 1;
  }

  // Native-currency monthly returns keyed by month (return earned during that month).
  function nativeReturns(series, kind) {
    const months = Object.keys(series).sort(), out = {};
    for (let i = 1; i < months.length; i++) {
      const m = months[i], p = months[i - 1];
      if (p !== prevMonth(m)) continue; // never bridge gaps
      const a = series[p], b = series[m];
      if (kind === "px") out[m] = b / a - 1;
      else if (kind === "cash") out[m] = a / 100 / 12;
      else if (kind === "bond") out[m] = bondReturn(a, b, 10);
    }
    return out;
  }

  // Convert a return series from its currency into base currency using INR per USD.
  function convert(rets, from, to, fx) {
    if (from === to) return rets;
    const out = {};
    for (const m in rets) {
      const p = prevMonth(m);
      if (fx[m] == null || fx[p] == null) continue;
      const usdPerInrChange = fx[p] / fx[m];               // >1 if INR strengthened
      const g = from === "INR" ? usdPerInrChange : 1 / usdPerInrChange;
      out[m] = (1 + rets[m]) * g - 1;
    }
    return out;
  }

  function assetReturns(data, id, base, custom) {
    const fx = data.series.INRUSD;
    if (custom && custom[id]) {
      const c = custom[id];
      return convert(nativeReturns(c.series, "px"), c.cur, base, fx);
    }
    const a = ASSETS[id];
    if (!a) throw new Error("unknown asset " + id);
    return convert(nativeReturns(data.series[a.key], a.kind), a.cur, base, fx);
  }

  function commonRange(retMaps, start, end) {
    let lo = "0000-00", hi = "9999-99";
    for (const r of retMaps) { const k = Object.keys(r).sort(); if (!k.length) return []; if (k[0] > lo) lo = k[0]; if (k[k.length - 1] < hi) hi = k[k.length - 1]; }
    if (start && start > lo) lo = start;
    if (end && end < hi) hi = end;
    const months = [];
    for (let m = lo; m <= hi; m = nextMonth(m)) { if (retMaps.every(r => r[m] != null)) months.push(m); else if (months.length) break; }
    return months;
  }

  /* opts: {weights:{id:pct}, base:'USD'|'INR', start, end, rebalance:'M'|'A'|'N', feePct, real:bool, custom} */
  function backtest(data, opts) {
    const ids = Object.keys(opts.weights).filter(k => opts.weights[k] > 0);
    const tot = ids.reduce((s, k) => s + opts.weights[k], 0);
    if (!ids.length || tot <= 0) throw new Error("Add at least one asset with a weight above 0.");
    const w = ids.map(k => opts.weights[k] / tot);
    const base = opts.base || "USD";
    const R = ids.map(id => assetReturns(data, id, base, opts.custom));
    let months = commonRange(R, opts.start, opts.end);
    if (months.length < 2) throw new Error("Not enough overlapping data for these assets and dates.");
    const cpi = data.series.US_CPI, cash = convert(nativeReturns(data.series.US_TB3M, "cash"), "USD", base, data.series.INRUSD);
    const realOk = opts.real && base === "USD";
    if (realOk) months = months.filter(m => cpi[m] != null && cpi[prevMonth(m)] != null);
    const fee = (opts.feePct || 0) / 100 / 12, reb = opts.rebalance || "A";
    let hold = w.slice(), V = 1;
    const values = [1], rets = [], dates = [prevMonth(months[0])];
    for (const m of months) {
      let nv = 0;
      for (let i = 0; i < ids.length; i++) { hold[i] *= 1 + R[i][m]; nv += hold[i]; }
      nv *= 1 - fee; hold = hold.map(h => h * (1 - fee));
      let r = nv / V - 1;
      if (realOk) r = (1 + r) / (cpi[m] / cpi[prevMonth(m)]) - 1;
      V = V * (1 + r); values.push(V); rets.push(r); dates.push(m);
      if (realOk) { const s = V / nv; hold = hold.map(h => h * s); }
      if (reb === "M" || (reb === "A" && m.slice(5) === "12")) hold = w.map(x => x * V);
    }
    const stats = metrics(values, rets, months.map(m => cash[m] != null ? cash[m] : 0));
    const crises = CRISES.map(c => crisis(dates, values, c)).filter(Boolean);
    return { ids, weights: w, base, real: realOk, dates, values, rets, stats, crises };
  }

  function metrics(values, rets, rf) {
    const n = rets.length, years = n / 12, last = values[values.length - 1];
    const cagr = Math.pow(last, 1 / years) - 1;
    const mean = rets.reduce((a, b) => a + b, 0) / n;
    const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1));
    const ex = rets.map((r, i) => r - (rf[i] || 0)), exm = ex.reduce((a, b) => a + b, 0) / n;
    const exsd = Math.sqrt(ex.reduce((a, b) => a + (b - exm) ** 2, 0) / (n - 1));
    let peak = values[0], mdd = 0, peakI = 0, ddStart = 0, ddTrough = 0, longest = 0, uw = 0;
    for (let i = 0; i < values.length; i++) {
      if (values[i] >= peak) { peak = values[i]; peakI = i; uw = 0; } else { uw++; if (uw > longest) longest = uw; }
      const dd = values[i] / peak - 1;
      if (dd < mdd) { mdd = dd; ddStart = peakI; ddTrough = i; }
    }
    let worst12 = null;
    for (let i = 12; i < values.length; i++) { const r = values[i] / values[i - 12] - 1; if (worst12 === null || r < worst12) worst12 = r; }
    return { totalReturn: last - 1, cagr, vol: sd * Math.sqrt(12), sharpe: exsd > 0 ? exm / exsd * Math.sqrt(12) : null,
      maxDD: mdd, ddPeakIdx: ddStart, ddTroughIdx: ddTrough, longestUnderwaterMonths: longest,
      worstMonth: Math.min(...rets), bestMonth: Math.max(...rets), worst12m: worst12, months: n };
  }

  function crisis(dates, values, c) {
    const i0 = dates.indexOf(prevMonth(c.start)), i1 = dates.indexOf(c.end);
    if (i0 < 0 || i1 < 0) return null;
    let peak = values[i0], mdd = 0;
    for (let i = i0; i <= i1; i++) { peak = Math.max(peak, values[i]); mdd = Math.min(mdd, values[i] / peak - 1); }
    let rec = null;
    for (let i = i1; i < values.length; i++) if (values[i] >= values[i0]) { rec = i - i0; break; }
    return { id: c.id, name: c.name, start: c.start, end: c.end, ret: values[i1] / values[i0] - 1, maxDD: mdd, monthsToRecover: rec };
  }

  // Parse user CSV: first column date (YYYY-MM-DD, YYYY-MM, DD-MM-YYYY, DD/MM/YYYY), last numeric column = value.
  // Keeps the last observation of each month (month-end).
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean), out = {};
    let bad = 0;
    for (const line of lines) {
      const cells = line.split(/[,;\t]/).map(s => s.replace(/^"|"$/g, "").trim());
      const m = toMonth(cells[0]);
      let v = null;
      for (let j = cells.length - 1; j >= 1; j--) { const x = parseFloat(cells[j].replace(/,/g, "")); if (isFinite(x) && x > 0) { v = x; break; } }
      if (!m || v == null) { bad++; continue; }
      out[m] = v;
    }
    const n = Object.keys(out).length;
    if (n < 13) throw new Error("Need at least 13 months of positive values; found " + n + ".");
    return { series: Object.fromEntries(Object.entries(out).sort()), skipped: bad };
  }
  function toMonth(s) {
    let r;
    if ((r = /^(\d{4})[-/.](\d{1,2})/.exec(s))) return r[1] + "-" + r[2].padStart(2, "0");
    if ((r = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s))) return r[3] + "-" + r[2].padStart(2, "0");
    if ((r = /^(\d{1,2})[- ]([A-Za-z]{3})[a-z]*[- ](\d{4})/.exec(s))) {
      const i = "janfebmaraprmayjunjulaugsepoctnovdec".indexOf(r[2].toLowerCase()) / 3;
      if (i >= 0) return r[3] + "-" + String(i + 1).padStart(2, "0");
    }
    return null;
  }

  // URL state <-> options
  function encodeState(o) {
    const p = new URLSearchParams();
    p.set("p", Object.entries(o.weights).filter(([, v]) => v > 0).map(([k, v]) => k + ":" + v).join(","));
    if (o.start) p.set("s", o.start); if (o.end) p.set("e", o.end);
    p.set("c", o.base || "USD"); p.set("r", o.rebalance || "A");
    if (o.feePct) p.set("f", String(o.feePct)); if (o.real) p.set("real", "1");
    return p.toString();
  }
  function decodeState(str) {
    const p = new URLSearchParams(str.replace(/^[#?]/, "")), weights = {};
    for (const part of (p.get("p") || "").split(",")) {
      const [k, v] = part.split(":");
      if (ASSETS[k] && isFinite(+v) && +v > 0 && +v <= 100) weights[k] = +v;
    }
    const mm = x => (/^\d{4}-\d{2}$/.test(x || "") ? x : undefined);
    return { weights, start: mm(p.get("s")), end: mm(p.get("e")), base: p.get("c") === "INR" ? "INR" : "USD",
      rebalance: ["M", "A", "N"].includes(p.get("r")) ? p.get("r") : "A",
      feePct: Math.min(Math.max(+p.get("f") || 0, 0), 5), real: p.get("real") === "1" };
  }

  return { ASSETS, CRISES, backtest, metrics, bondReturn, nativeReturns, convert, assetReturns, parseCSV, encodeState, decodeState, prevMonth, nextMonth };
});
