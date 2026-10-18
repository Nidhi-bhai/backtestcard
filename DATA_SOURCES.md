# Data sources and licence status

Every bundled series is fetched from its **original publisher** by `scripts/build_data.py`. Nothing comes from FRED, Yahoo Finance, Stooq or NSE.
Checked 18 Oct 2026.

| Series key | What | Publisher (primary URL) | Licence / terms | Status |
|---|---|---|---|---|
| INRUSD | INR per USD, monthly average (H.10 `RXI_N.M.IN`) | Federal Reserve Board, Data Download Program | US federal government work. FRED marks this series "Public Domain: Citation Requested" | ✅ OK, cite source |
| US_TB3M | 3-month T-bill, secondary market (H.15 `RIFSGFSM03_N.M`) | Federal Reserve Board | US government work, public domain | ✅ OK |
| US_10Y | 10y Treasury constant maturity (H.15 `RIFLGFCY10_N.M`) | Federal Reserve Board | US government work, public domain | ✅ OK |
| US_CPI | CPI-U, SA (`CUSR0000SA0`) | US Bureau of Labor Statistics, download.bls.gov | US government work, public domain | ✅ OK. Oct 2025 is missing at source (shutdown) and filled by geometric interpolation; this is disclosed in the app |
| US_EQ_PX, IN_EQ_PX | OECD share price indices, USA and India (monthly, 2015=100) | OECD Data Explorer, `DSD_STES@DF_FINMARK` | OECD Terms §3: "extract, download, copy, adapt, … distribute … for any purpose, even for commercial use", with citation, **unless third parties have ownership interests** | ⚠️ Permitted under OECD terms, and the dataflow metadata flags no third-party restriction. However, the underlying national indices are likely compiled from exchange data. For certainty, email OECD (stat.contact@oecd.org) before monetising. Fallback: user CSV upload |
| IN_10Y, IN_3M | India long-term and 3-month rates (start Dec 2011) | OECD, same dataflow | Same as above | ⚠️ Same as above |
| GOLD_USD | Gold, USD/troy oz, monthly average | World Bank Commodity Price Data (Pink Sheet) | CC BY 4.0 plus World Bank dataset terms | ✅ OK, attribution required |

## Deliberately excluded
- **FRED-hosted copies.** FRED's ToS prohibits caching or storing FRED content in a database, and redistributing third-party content commercially. The same public-domain data is therefore pulled straight from the Fed and BLS.
- **Yahoo Finance and Stooq.** Their terms bar redistribution.
- **NIFTY 50 / NSE indices.** NSE Indices says "use of NSE Indices data or name or indices requires a license or subscription", and the NSE data policy bars redistribution. NIFTY is supported **only through user upload**: users bring a file they are entitled to use, it is processed in their browser and never leaves the device, and the app converts it to USD with the Fed H.10 rate.
- **S&P 500 values** (S&P Dow Jones Indices, licensed) and MSCI. Not included.

## Required attribution (shown in the app footer)
Board of Governors of the Federal Reserve System (H.10, H.15) · U.S. Bureau of Labor Statistics · OECD (2026), Financial market indicators, OECD Data Explorer · The World Bank: Commodity Price Data (The Pink Sheet), CC BY 4.0, https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets

## Known data limitations
- Equity indices are **price-only** (no dividends), roughly 1–2%/yr below total return.
- OECD share prices and the H.10 FX rate are **monthly averages**, so drawdowns look shallower than daily closes.
- Bond and cash returns are **modelled** from yields: a constant-maturity 10-year par bond with semiannual coupons, repriced monthly, and cash earning last month's yield divided by 12.
