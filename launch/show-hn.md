**Title:** Show HN: BacktestCard – stress-test an India+US portfolio in USD, in the browser

**URL:** https://Nidhi-bhai.github.io/backtestcard/

**First comment:**
I'm an Indian investor, and the comparison I always wanted was the one US backtesters don't show: what my rupee portfolio did *in dollars*.

The rupee's slide changes the picture a lot. On the bundled data (OECD India share price index, Jan 2000 to Sep 2026, price only):
- In INR: 10.8%/yr
- In USD: 7.6%/yr
- 2013 taper tantrum: −0.9% in INR, but −14.2% in USD

BacktestCard is a static page (vanilla JS, no deps, no backend, no tracking):
- Mix US and India stocks, gold, US T-bills and 10y Treasuries, and India rates and G-secs.
- Measure in USD or INR, set rebalancing and an annual cost.
- See CAGR, max drawdown, worst 12 months and crisis replays (2000, 2008, 2013, 2020, 2022) with months to recover.
- The state lives in the URL hash, cards export as 1200×630 PNG, and there's an iframe embed mode.

The data part was the hard bit. I only ship data I'm allowed to redistribute: Fed H.10/H.15 and BLS (public domain), OECD (open terms with citation) and World Bank gold (CC BY 4.0). That rules out Yahoo, Stooq, FRED-hosted copies (FRED's ToS bars caching) and NIFTY (NSE licenses it). So NIFTY TRI or fund NAVs come in through a CSV upload that never leaves your browser.

Honest limits:
- Equity series are price-only, about 1–2%/yr below total return.
- Monthly averages make crashes look shallower.
- Bonds are modelled from yields (par bond, dirty-price repricing).

The engine has a second, independent pandas implementation in CI that has to match every stat to 1e-9. It caught a real accrued-coupon double count while I was building it.

It's educational only, not advice. Code is MIT: https://github.com/Nidhi-bhai/backtestcard. I'd love critiques of the method.
