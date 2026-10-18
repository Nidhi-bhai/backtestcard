#!/usr/bin/env python3
"""Build data/series.json from PRIMARY, redistributable sources only.

Sources (see DATA_SOURCES.md for licence notes):
  Fed Board H.10 (INR per USD, monthly avg)       - US Gov work, public domain
  Fed Board H.15 (3-mo T-bill, 10y Treasury CMT)  - US Gov work, public domain
  BLS CPI-U (CUSR0000SA0)                          - US Gov work, public domain
  OECD Financial market dataflow (India/US share prices, India 10y & 3m rates)
                                                   - OECD terms: any use incl. commercial, with citation
  World Bank Pink Sheet (gold USD/oz)              - CC BY 4.0
Deliberately NOT used: Yahoo, Stooq, FRED-hosted copies (FRED ToS bars caching), NSE/NIFTY.
Usage: python3 scripts/build_data.py [--offline]  (--offline reuses raw/ files)
"""
import io, json, re, sys, zipfile, datetime as dt, urllib.request
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "raw"; RAW.mkdir(exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (BacktestCard open-source data build; contact: nidhi69n@gmail.com)"}
OFFLINE = "--offline" in sys.argv

URLS = {
 "H10.zip": "https://www.federalreserve.gov/datadownload/Output.aspx?rel=H10&filetype=zip",
 "H15.zip": "https://www.federalreserve.gov/datadownload/Output.aspx?rel=H15&filetype=zip",
 "cpi.txt": "https://download.bls.gov/pub/time.series/cu/cu.data.1.AllItems",
 "oecd.csv": "https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_FINMARK,/IND+USA.M.SHARE+IRLT+IR3TIB......?startPeriod=1955-01&format=csv",
 "cmo.xlsx": "https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Monthly.xlsx",
}

def get(name):
    p = RAW / name
    if not OFFLINE or not p.exists():
        req = urllib.request.Request(URLS[name], headers=UA)
        p.write_bytes(urllib.request.urlopen(req, timeout=180).read())
    return p.read_bytes()

def ym(s): return str(s)[:7]

def frb_series(zipbytes, member, series):
    xml = zipfile.ZipFile(io.BytesIO(zipbytes)).read(member).decode()
    i = xml.index(f'SERIES_NAME="{series}"'); j = xml.find("</kf:Series>", i)
    out = {}
    for m in re.finditer(r'OBS_VALUE="([^"]+)" TIME_PERIOD="([^"]+)"', xml[i:j]):
        try: out[ym(m.group(2))] = float(m.group(1))
        except ValueError: pass   # ND / NA
    return out

def main():
    h10, h15 = get("H10.zip"), get("H15.zip")
    S = {}
    S["INRUSD"] = frb_series(h10, "H10_data.xml", "RXI_N.M.IN")       # INR per USD, monthly avg
    S["US_TB3M"] = frb_series(h15, "H15_data.xml", "RIFSGFSM03_N.M")  # % p.a., discount basis
    S["US_10Y"] = frb_series(h15, "H15_data.xml", "RIFLGFCY10_N.M")   # % p.a.
    cpi = pd.read_csv(io.BytesIO(get("cpi.txt")), sep=r"\s*\t\s*", engine="python")
    cpi.columns = [c.strip() for c in cpi.columns]
    cpi = cpi[(cpi.series_id.str.strip() == "CUSR0000SA0") & (cpi.period.str.startswith("M")) & (cpi.period != "M13")]
    S["US_CPI"] = {f"{y}-{p[1:]}": float(v) for y, p, v in zip(cpi.year, cpi.period, cpi.value) if re.match(r"^[0-9.]+$", str(v).strip())}
    # BLS published no CPI for some months (e.g. Oct 2025, US government shutdown). Fill single-month
    # gaps by geometric interpolation and record them so the app can disclose it.
    filled = []
    ks = sorted(S["US_CPI"]); allm = pd.period_range(ks[0], ks[-1], freq="M").strftime("%Y-%m")
    for i, m in enumerate(allm):
        if m not in S["US_CPI"]:
            a, b = S["US_CPI"].get(allm[i-1]), S["US_CPI"].get(allm[i+1])
            assert a and b, f"multi-month CPI gap at {m}"
            S["US_CPI"][m] = (a * b) ** 0.5; filled.append(m)
    o = pd.read_csv(io.BytesIO(get("oecd.csv")))
    o = o[(o.ADJUSTMENT == "_Z") & (o.TRANSFORMATION == "_Z")]
    for (area, meas), key in {("IND","SHARE"):"IN_EQ_PX", ("USA","SHARE"):"US_EQ_PX",
                              ("IND","IRLT"):"IN_10Y", ("IND","IR3TIB"):"IN_3M"}.items():
        d = o[(o.REF_AREA == area) & (o.MEASURE == meas)].dropna(subset=["OBS_VALUE"])
        S[key] = {ym(t): float(v) for t, v in zip(d.TIME_PERIOD, d.OBS_VALUE)}
    w = pd.read_excel(io.BytesIO(get("cmo.xlsx")), "Monthly Prices", header=None)
    col = [i for i, v in enumerate(w.iloc[4]) if str(v).strip() == "Gold"][0]
    g = w.iloc[6:, [0, col]].dropna()
    S["GOLD_USD"] = {f"{str(a)[:4]}-{str(a)[5:7]}": float(b) for a, b in g.values if re.match(r"\d{4}M\d\d", str(a))}
    for k, v in S.items():
        S[k] = dict(sorted(v.items()))
        assert len(v) > 100, (k, len(v))
        print(f"{k:10s} {min(v)}..{max(v)} n={len(v)}")
    meta = {"built": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),
            "cpi_interpolated": filled, "note": "Monthly. Equity series are PRICE indices (no dividends). Bonds/cash are modelled from yields in the app."}
    (ROOT / "data" / "series.json").write_text(json.dumps({"meta": meta, "series": S}, separators=(",", ":")))
    print("wrote data/series.json")

if __name__ == "__main__":
    main()
