---
title: "Building a $0, no-backend portfolio backtester and the data-licensing rabbit hole"
tags: javascript, opensource, finance, webdev
---
I built [BacktestCard](https://Nidhi-bhai.github.io/backtestcard/), a static-site backtester for Indian investors who measure in USD. It has no framework, no backend and no dependencies. Three things were more interesting than I expected.

## 1. Data licensing decides your architecture
- Yahoo, Stooq and NSE all forbid redistribution.
- FRED was the surprise. Its ToS bars storing or caching FRED content, even for public-domain series.
- So the build script fetches from the publishers themselves:
  - Federal Reserve DDP for H.10 and H.15
  - BLS flat files
  - the OECD SDMX API
  - the World Bank Pink Sheet (CC BY 4.0)
- The result is a 108 KB JSON file, refreshed monthly by a GitHub Action.
- Licensed indices such as NIFTY come only through a user CSV upload. It's parsed with `FileReader` and never sent anywhere.

## 2. Test your maths with a second implementation
The engine is about 200 lines of plain JS. The tests include a separate pandas implementation that must match every statistic to 1e-9. On day one it disagreed on bond returns.

Bond returns are modelled from yields. Each month you buy a 10-year par bond and reprice it at the new yield. I had added coupon/12 *on top of* a dirty price that already included accrued interest, which added 1.4%/yr of phantom return to a 60/40 mix. The fix uses a closed form:

```js
// remaining flows at j/2 - 1/12 years => dirty = (1+y/2)^(1/6) * P_20(y)
return Math.pow(1 + y / 2, 1 / 6) * price20 - 1;
```

## 3. Share state belongs in the URL
- The whole portfolio state is in the hash, e.g. `#p=us_eq:60,in_eq:40&s=2000-01&c=USD`.
- It's whitelisted on decode, so `__proto__:5` gets dropped.
- The share card is a 1200×630 canvas exported with `toDataURL`.
- `?embed=1` gives a compact iframe with a badge, which is the growth loop.

Code (MIT): https://github.com/Nidhi-bhai/backtestcard. It's educational only, not investment advice.
