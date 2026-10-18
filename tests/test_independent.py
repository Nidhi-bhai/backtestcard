"""Independent re-implementation in pandas (written separately from engine.js) and comparison.
Run: python3 tests/test_independent.py"""
import json, subprocess, sys, math
from pathlib import Path
import numpy as np, pandas as pd

ROOT = Path(__file__).resolve().parents[1]
S = json.loads((ROOT / "data/series.json").read_text())["series"]
CASES = json.loads((ROOT / "tests/cases.json").read_text())
META = {"us_eq": ("US_EQ_PX", "px", "USD"), "in_eq": ("IN_EQ_PX", "px", "INR"), "gold": ("GOLD_USD", "px", "USD"),
        "us_cash": ("US_TB3M", "cash", "USD"), "us_bond": ("US_10Y", "bond", "USD"),
        "in_cash": ("IN_3M", "cash", "INR"), "in_bond": ("IN_10Y", "bond", "INR")}

def ser(key):
    s = pd.Series(S[key]); s.index = pd.PeriodIndex(s.index, freq="M"); return s.sort_index()

def par_bond(y0, y1, n=10.0):
    # cash-flow discounting (different method from engine's closed-form annuity formula)
    c, y = y0 / 100, y1 / 100
    times = np.arange(1, int(2 * n) + 1) / 2 - 1 / 12
    pv = sum(c / 2 / (1 + y / 2) ** (2 * t) for t in times) + 1 / (1 + y / 2) ** (2 * times[-1])
    return pv - 1   # dirty value already includes the accrued coupon

def native(aid):
    key, kind, cur = META[aid]; s = ser(key).asfreq("M")   # gaps become NaN, never bridged
    if kind == "px": r = s / s.shift(1) - 1
    elif kind == "cash": r = s.shift(1) / 1200
    else: r = pd.Series([par_bond(a, b) if pd.notna(a) and pd.notna(b) else np.nan for a, b in zip(s.shift(1), s)], index=s.index)
    return r, cur

def to_base(r, cur, base):
    if cur == base: return r
    fx = ser("INRUSD").asfreq("M"); g = fx.shift(1) / fx      # USD per INR growth
    if cur == "USD": g = 1 / g
    return (1 + r) * g.reindex(r.index) - 1

def reference(c):
    base = c.get("base", "USD"); w = {k: v for k, v in c["weights"].items() if v > 0}
    tot = sum(w.values()); w = {k: v / tot for k, v in w.items()}
    R = pd.DataFrame({k: to_base(*native(k), base) for k in w})
    R = R[R.index >= pd.Period(c["start"], "M")] if c.get("start") else R
    first = R.dropna().index[0]; R = R[R.index >= first]
    stop = R.isna().any(axis=1); R = R[: stop.values.argmax()] if stop.any() else R
    real = c.get("real") and base == "USD"
    infl = (ser("US_CPI") / ser("US_CPI").shift(1)).reindex(R.index) if real else None
    if real: R = R[infl.notna()]; infl = infl[R.index]
    fee = c.get("feePct", 0) / 1200; reb = c.get("rebalance", "A")
    pos = pd.Series(w); V = 1.0; vals = [1.0]
    for m, row in R.iterrows():
        pos = pos * (1 + row[pos.index]) * (1 - fee)
        nv = pos.sum()
        if real: pos *= (nv / infl[m]) / nv; nv = pos.sum()
        V = nv; vals.append(V)
        if reb == "M" or (reb == "A" and m.month == 12): pos = pd.Series(w) * V
    v = pd.Series(vals); r = v.pct_change().dropna()
    cash = to_base(*native("us_cash"), base).reindex(R.index).fillna(0).values
    ex = r.values - cash
    return {"months": len(r), "totalReturn": v.iloc[-1] - 1, "cagr": v.iloc[-1] ** (12 / len(r)) - 1,
            "vol": r.std(ddof=1) * math.sqrt(12), "maxDD": (v / v.cummax() - 1).min(),
            "sharpe": ex.mean() / ex.std(ddof=1) * math.sqrt(12),
            "worstMonth": r.min(), "worst12m": (v / v.shift(12) - 1).min(),
            "first": str(R.index[0]), "last": str(R.index[-1])}

def main():
    out = json.loads(subprocess.check_output(["node", str(ROOT / "tests/engine_dump.js")]))
    fails = 0
    for c, e in zip(CASES, out):
        ref = reference(c); s = e["stats"]
        checks = [("months", s["months"], ref["months"]), ("first", e["dates"][1], ref["first"]), ("last", e["dates"][-1], ref["last"])]
        checks += [(k, s[k], ref[k]) for k in ("totalReturn", "cagr", "vol", "maxDD", "sharpe", "worstMonth", "worst12m")]
        for k, a, b in checks:
            ok = a == b if isinstance(b, (str, int)) and not isinstance(b, float) else abs(a - b) <= 1e-9 * max(1, abs(b))
            if not ok: fails += 1; print("FAIL", c["weights"], c.get("base"), k, a, b)
        print(f"ok   {json.dumps(c['weights']):45s} {c.get('base','USD')} {ref['first']}..{ref['last']} CAGR {ref['cagr']*100:6.2f}%  maxDD {ref['maxDD']*100:6.1f}%  Sharpe {ref['sharpe']:.2f}")
    # sanity anchors against well-known history (loose, catches unit/sign errors)
    us = reference({"weights": {"us_eq": 100}, "start": "2007-10", "rebalance": "N"})
    assert -0.60 < us["maxDD"] < -0.40, us["maxDD"]          # S&P-type fall 2007-09 ~ -50% (monthly avg)
    inr = ser("INRUSD"); assert 38 < inr["2008-01"] < 41 and 80 < inr["2024-01"] < 85
    print("anchors ok"); print("FAILS:", fails); sys.exit(1 if fails else 0)

if __name__ == "__main__": main()
