# Inflation hub merge note (from the attention worker, for whoever publishes this repo)
- Added: `hub/` (5,311 static pages, ~59 MB), `scripts/build_hub.py`, `data/wb_cpi.json`, `tests/hub_check.py`. No existing file modified.
- Rebuild: `python3 scripts/build_hub.py`. Verify: `python3 tests/hub_check.py` (US vs independent World Bank/IMF CPI: worst diff 0.106%).
- URLs assume https://Nidhi-bhai.github.io/backtestcard/hub/. If the Pages URL differs, change BASE and the widget/snippet URLs in build_hub.py, then rebuild.
- Optional requests for the publisher: 1) link `hub/` from the index.html footer; 2) add India CPI (World Bank FP.CPI.TOTL, CC BY 4.0, attribution required, already shown on every page) to DATA_SOURCES.md; 3) after deploy, submit hub/sitemap.xml in Search Console.
- Commit together: `hub/ scripts/build_hub.py data/wb_cpi.json tests/hub_check.py HUB_MERGE.md`.
