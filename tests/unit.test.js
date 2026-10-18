// node tests/unit.test.js
const assert = require("assert"), E = require("../engine.js"), d = require("../data/series.json");
let n = 0; const t = (name, f) => { f(); n++; console.log("ok  ", name); };
t("bond at unchanged yield earns ~coupon/12", () => { const r = E.bondReturn(6, 6); assert(Math.abs(r - 0.005) < 2e-4, r); });
t("bond loses when yields rise 1pt (~ -7% for 10y)", () => { const r = E.bondReturn(4, 5); assert(r < -0.07 && r > -0.085, r); });
t("FX conversion: INR asset flat, rupee falls 10% -> USD -9.09%", () => {
  const r = E.convert({ "2020-02": 0 }, "INR", "USD", { "2020-01": 100, "2020-02": 110 }); assert(Math.abs(r["2020-02"] + 1 / 11) < 1e-12); });
t("FX round trip USD->INR->USD identity", () => {
  const fx = d.series.INRUSD, r = E.nativeReturns(d.series.US_EQ_PX, "px");
  const back = E.convert(E.convert(r, "USD", "INR", fx), "INR", "USD", fx);
  for (const m in back) assert(Math.abs(back[m] - r[m]) < 1e-12); });
t("100% cash, no rebalance, matches compounding of yields", () => {
  const b = E.backtest(d, { weights: { us_cash: 100 }, start: "2010-01", end: "2010-12", rebalance: "N" });
  let v = 1; for (const m of b.dates.slice(1)) v *= 1 + d.series.US_TB3M[E.prevMonth(m)] / 1200; assert(Math.abs(b.values.at(-1) - v) < 1e-12); });
t("weights normalise (50/50 == 1/1)", () => {
  const a = E.backtest(d, { weights: { us_eq: 50, gold: 50 }, start: "2000-01" }), b = E.backtest(d, { weights: { us_eq: 1, gold: 1 }, start: "2000-01" });
  assert.strictEqual(a.stats.cagr, b.stats.cagr); });
t("fee lowers CAGR by ~fee", () => {
  const a = E.backtest(d, { weights: { us_eq: 100 }, start: "2000-01", rebalance: "N" }), b = E.backtest(d, { weights: { us_eq: 100 }, start: "2000-01", rebalance: "N", feePct: 1 });
  const diff = a.stats.cagr - b.stats.cagr; assert(diff > 0.008 && diff < 0.012, diff); });
t("crisis windows present and negative for stocks in 2008", () => {
  const b = E.backtest(d, { weights: { us_eq: 100 }, start: "2000-01" }); const g = b.crises.find(c => c.id === "gfc"); assert(g && g.ret < -0.35, g); });
t("CSV parsing: formats, month-end, junk rows", () => {
  const rows = ["Date,Close", "garbage"]; for (let i = 0; i < 30; i++) { const y = 2020 + Math.floor(i / 12), m = (i % 12) + 1; rows.push(`${String(15).padStart(2,"0")}/${String(m).padStart(2,"0")}/${y},1,000.5`); rows.push(`${y}-${String(m).padStart(2,"0")}-28,"${100 + i}"`); }
  const p = E.parseCSV(rows.join("\n")); assert.strictEqual(Object.keys(p.series).length, 30); assert.strictEqual(p.series["2020-01"], 100); assert(p.skipped >= 1); });
t("CSV too short throws", () => assert.throws(() => E.parseCSV("2020-01-01,1\n2020-02-01,2")));
t("custom uploaded INR series converts to USD", () => {
  const series = {}; for (const m of Object.keys(d.series.IN_EQ_PX)) series[m] = d.series.IN_EQ_PX[m];
  const a = E.backtest(d, { weights: { in_eq: 100 }, start: "2005-01" }), b = E.backtest(d, { weights: { in_eq: 100 }, start: "2005-01", custom: { in_eq: { series, cur: "INR" } } });
  assert.strictEqual(a.stats.cagr, b.stats.cagr); });
t("URL state round trip + sanitising", () => {
  const o = { weights: { us_eq: 60, in_eq: 40 }, start: "2005-01", end: "2020-12", base: "INR", rebalance: "M", feePct: 0.2, real: false };
  const x = E.decodeState(E.encodeState(o)); assert.deepStrictEqual(x, o);
  const evil = E.decodeState("p=__proto__:5,us_eq:999,gold:30&s=<script>&f=99"); assert.deepStrictEqual(evil.weights, { gold: 30 }); assert.strictEqual(evil.start, undefined); assert.strictEqual(evil.feePct, 5); });
t("no lookahead: changing a future price doesn't change earlier values", () => {
  const d2 = JSON.parse(JSON.stringify(d)); d2.series.US_EQ_PX["2015-06"] *= 2;
  const a = E.backtest(d, { weights: { us_eq: 100 }, start: "2000-01" }), b = E.backtest(d2, { weights: { us_eq: 100 }, start: "2000-01" });
  const i = a.dates.indexOf("2015-05"); assert.deepStrictEqual(a.values.slice(0, i + 1), b.values.slice(0, i + 1)); });
console.log(n + " unit tests passed");
