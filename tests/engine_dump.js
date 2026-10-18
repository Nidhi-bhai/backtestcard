// Emits engine results for the cases in tests/cases.json (consumed by tests/test_independent.py)
const E = require("../engine.js"), d = require("../data/series.json"), cases = require("./cases.json");
console.log(JSON.stringify(cases.map(c => { const r = E.backtest(d, c); return { dates: r.dates, values: r.values, stats: r.stats, crises: r.crises }; })));
