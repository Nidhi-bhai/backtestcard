<!-- Read https://www.bogleheads.org/forum/ rules first. The forum restricts self-promotion and commercial links. Post ONLY if allowed, as a free, open-source research tool. NO Pro or Gumroad link. Suggested subforum: Investing - Theory, News & General. Disclose that you made it. -->
**Subject:** Ex-US (India) equity returns in USD vs local currency, 2000–2026: free open-source calculator (I'm the author)

Disclosure: I wrote this tool. It's free, MIT-licensed, has no ads, no sign-up and no tracking.

For anyone who looks at home-country bias from the other side, here is what the currency did to Indian equities on public data (OECD share price index, price only, monthly):
- 2000-01 → 2026-09: **10.8%/yr in INR vs 7.6%/yr in USD**
- 2013 taper tantrum: −0.9% in INR, −14.2% in USD
- 50% US / 50% India, rebalanced yearly, in USD: 6.8%/yr with a −58% max drawdown (monthly data)

Method notes:
- price indices (no dividends)
- monthly averages
- 10y bonds modelled from Fed H.15 yields
- FX from Fed H.10

The source code and the data sources are listed here: https://github.com/Nidhi-bhai/backtestcard. The calculator is here: https://Nidhi-bhai.github.io/backtestcard/.

Critiques of the method are welcome, especially on the bond model and on whether to add dividends from an open source.
