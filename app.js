/* BacktestCard UI. MIT. */
(function () {
  "use strict";
  const E = window.BTEngine, $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search), EMBED = params.get("embed") === "1";
  if (EMBED) { document.body.classList.add("embed"); $("badge").style.display = "block"; }
  const DEFAULT = { weights: { us_eq: 40, in_eq: 40, gold: 10, us_bond: 10 }, start: "2000-01", base: "USD", rebalance: "A", feePct: 0, real: false };
  let DATA = null, custom = {}, last = null, PRO = false;
  const P = window.BTPro;
  function setPro(on) {
    PRO = on;
    $("prostate").textContent = on ? "Pro is active in this browser. Thank you for supporting the free tool." : $("prostate").textContent;
    $("probuy").style.display = on ? "none" : ""; $("crisiscta").style.display = on ? "none" : "";
    $("pdf").textContent = on ? "Download PDF report" : "PDF report (Pro)";
    renderSaved();
  }
  function needPro(what) { $("amsg").innerHTML = `${what} is a Pro feature. <a href="#propanel">Get Pro, $9 one-time</a>`; document.getElementById("propanel").scrollIntoView({ behavior: "smooth" }); }
  const pct = (x, d = 1) => x == null ? "–" : (x * 100).toFixed(d) + "%";
  const cls = x => x < 0 ? "neg" : "pos";

  function buildWeights(w) {
    const box = $("weights"); box.innerHTML = "";
    const ids = Object.keys(E.ASSETS).concat(Object.keys(custom));
    for (const id of ids) {
      const a = E.ASSETS[id] || { label: custom[id].name + " (your CSV, " + custom[id].cur + ")", note: "Your uploaded file. Stays in this browser." };
      const row = document.createElement("div"); row.className = "row";
      const lab = document.createElement("label"); lab.textContent = a.label; lab.title = a.note; lab.htmlFor = "w_" + id;
      const inp = document.createElement("input"); inp.type = "number"; inp.min = 0; inp.max = 100; inp.step = 5; inp.id = "w_" + id; inp.value = w[id] || 0;
      inp.addEventListener("input", sumW); row.append(lab, inp); box.append(row);
    }
    sumW();
  }
  function sumW() { let s = 0; document.querySelectorAll("#weights input").forEach(i => s += +i.value || 0); $("wsum").textContent = s + "%"; }
  function readOpts() {
    const weights = {}; document.querySelectorAll("#weights input").forEach(i => { const v = +i.value; if (v > 0) weights[i.id.slice(2)] = v; });
    return { weights, base: $("base").value, start: $("start").value || undefined, end: $("end").value || undefined,
      rebalance: $("reb").value, feePct: Math.min(Math.max(+$("fee").value || 0, 0), 5), real: $("real").checked, custom };
  }
  function applyOpts(o) {
    buildWeights(o.weights); $("base").value = o.base; $("start").value = o.start || ""; $("end").value = o.end || "";
    $("reb").value = o.rebalance; $("fee").value = o.feePct || 0; $("real").checked = !!o.real;
  }

  function run() {
    $("err").textContent = ""; $("amsg").textContent = "";
    const o = readOpts();
    try { last = E.backtest(DATA, o); last.opts = o; } catch (e) { $("err").textContent = e.message; return; }
    const s = last.stats, cur = last.base + (last.real ? " (real, after US inflation)" : "");
    $("curl").textContent = cur;
    const worst = last.crises.slice().sort((a, b) => a.maxDD - b.maxDD)[0];
    $("summary").innerHTML = `From <b>${last.dates[0]}</b> to <b>${last.dates.at(-1)}</b>, 1 ${last.base} became <b>${last.values.at(-1).toFixed(2)}</b> (${pct(s.cagr)} a year). ` +
      `The worst fall from a peak was <b class="neg">${pct(s.maxDD)}</b>` + (worst ? `, and the hardest replayed crisis was <b>${worst.name}</b> at <b class="neg">${pct(worst.maxDD)}</b>.` : ".");
    const tiles = [["Annual growth (CAGR)", pct(s.cagr), s.cagr], ["Worst fall (max drawdown)", pct(s.maxDD), s.maxDD], ["Worst 12 months", pct(s.worst12m), s.worst12m],
      ["Volatility (annual)", pct(s.vol), 0], ["Worst month", pct(s.worstMonth), s.worstMonth], ["Longest underwater", s.longestUnderwaterMonths + " mo", 0],
      ["Sharpe vs T-bills", s.sharpe == null ? "–" : s.sharpe.toFixed(2), 0], ["Months tested", String(s.months), 0]];
    $("tiles").innerHTML = tiles.map(([k, v, x]) => `<div class="tile"><b class="${x ? cls(x) : ""}">${v}</b><span>${k}</span></div>`).join("");
    $("crises").querySelector("tbody").innerHTML = E.CRISES.map(c => {
      const r = last.crises.find(x => x.id === c.id);
      if (!r) return `<tr><td>${c.name}</td><td>${c.start} to ${c.end}</td><td colspan="3" class="small">outside data range</td></tr>`;
      return `<tr><td>${r.name}</td><td>${r.start} to ${r.end}</td><td class="${cls(r.ret)}">${pct(r.ret)}</td><td class="neg">${pct(r.maxDD)}</td><td>${r.monthsToRecover == null ? "not yet" : r.monthsToRecover}</td></tr>`;
    }).join("");
    drawLine($("cg"), last.dates, last.values, { log: true, color: "#5eead4" });
    let pk = 0; drawLine($("cd"), last.dates, last.values.map(v => (pk = Math.max(pk, v), v / pk - 1)), { color: "#fb7185", fill: true, pctAxis: true });
    if (!EMBED) history.replaceState(null, "", "#" + E.encodeState(o));
  }

  function drawLine(cv, dates, ys, opt) {
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth || 600, H = cv.clientHeight || 240;
    cv.width = W * dpr; cv.height = H * dpr; const g = cv.getContext("2d"); g.scale(dpr, dpr); g.clearRect(0, 0, W, H);
    const tf = opt.log ? Math.log : x => x, v = ys.map(tf), lo = Math.min(...v), hi = Math.max(...v), L = 52, R = 8, T = 8, B = 22;
    const X = i => L + (W - L - R) * i / (ys.length - 1), Y = y => T + (H - T - B) * (1 - (y - lo) / ((hi - lo) || 1));
    g.strokeStyle = "#26305a"; g.fillStyle = "#9aa6c7"; g.font = "11px system-ui"; g.lineWidth = 1;
    for (let k = 0; k <= 4; k++) { const y = lo + (hi - lo) * k / 4, yy = Y(y); g.beginPath(); g.moveTo(L, yy); g.lineTo(W - R, yy); g.stroke();
      const raw = opt.log ? Math.exp(y) : y; g.fillText(opt.pctAxis ? (raw * 100).toFixed(0) + "%" : raw.toFixed(raw < 10 ? 2 : 0), 4, yy + 4); }
    const step = Math.max(1, Math.round(ys.length / 6));
    for (let i = 0; i < ys.length; i += step) g.fillText(dates[i].slice(0, 4), X(i) - 12, H - 6);
    g.beginPath(); v.forEach((y, i) => i ? g.lineTo(X(i), Y(y)) : g.moveTo(X(i), Y(y)));
    g.strokeStyle = opt.color; g.lineWidth = 2; g.stroke();
    if (opt.fill) { g.lineTo(X(ys.length - 1), Y(0)); g.lineTo(X(0), Y(0)); g.closePath(); g.globalAlpha = .2; g.fillStyle = opt.color; g.fill(); g.globalAlpha = 1; }
  }

  function card() {
    const W = 1200, H = 630, c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d");
    g.fillStyle = "#0b1020"; g.fillRect(0, 0, W, H);
    g.fillStyle = "#5eead4"; g.font = "bold 34px system-ui"; g.fillText("BacktestCard", 60, 80);
    g.fillStyle = "#e8ecf8"; g.font = "bold 40px system-ui";
    const mix = last.ids.map((id, i) => Math.round(last.weights[i] * 100) + "% " + (E.ASSETS[id] ? E.ASSETS[id].label.replace(/ \(.*\)/, "") : custom[id].name)).join(" · ");
    wrap(g, mix, 60, 140, W - 120, 48);
    g.font = "24px system-ui"; g.fillStyle = "#9aa6c7";
    g.fillText(`${last.dates[0]} to ${last.dates.at(-1)}, in ${last.base}${last.real ? " (real)" : ""}, rebalance ${({ A: "yearly", M: "monthly", N: "never" })[last.opts.rebalance]}`, 60, 250);
    const s = last.stats, big = [["CAGR", pct(s.cagr), s.cagr], ["Worst fall", pct(s.maxDD), s.maxDD], ["Worst 12m", pct(s.worst12m), s.worst12m]];
    big.forEach(([k, v, x], i) => { g.fillStyle = x < 0 ? "#fb7185" : "#86efac"; g.font = "bold 64px system-ui"; g.fillText(v, 60 + i * 360, 345); g.fillStyle = "#9aa6c7"; g.font = "22px system-ui"; g.fillText(k, 60 + i * 360, 378); });
    g.font = "24px system-ui"; let y = 430;
    for (const r of last.crises.slice(0, 4)) { g.fillStyle = "#e8ecf8"; g.fillText(r.name, 60, y); g.fillStyle = "#fb7185"; g.fillText(pct(r.maxDD), 520, y);
      g.fillStyle = "#9aa6c7"; g.fillText(r.monthsToRecover == null ? "not recovered yet" : `recovered in ${r.monthsToRecover} mo`, 680, y); y += 38; }
    g.fillStyle = "#fbbf24"; g.font = "18px system-ui"; g.fillText("Educational, past data, not advice. Price indices without dividends.", 60, H - 50); g.fillText("Data: Fed, BLS, OECD, World Bank.", 60, H - 26);
    if (!PRO) { g.fillStyle = "#121a33"; g.fillRect(W - 330, H - 74, 290, 44); g.fillStyle = "#5eead4"; g.font = "bold 18px system-ui"; g.textAlign = "right"; g.fillText("Made with BacktestCard", W - 58, H - 45); g.textAlign = "left"; }
    g.fillStyle = "#5eead4"; g.font = "bold 20px system-ui"; g.textAlign = "right"; g.fillText(location.host + location.pathname.replace(/index.html$/, ""), W - 60, 80); g.textAlign = "left";
    return c;
  }
  function wrap(g, t, x, y, w, lh) { let line = ""; for (const word of t.split(" ")) { const tst = line + word + " "; if (g.measureText(tst).width > w && line) { g.fillText(line, x, y); line = word + " "; y += lh; } else line = tst; } g.fillText(line, x, y); }

  function shareURL() { const o = readOpts(); return location.origin + location.pathname + "#" + E.encodeState(o); }
  async function copy(t, msg) { try { await navigator.clipboard.writeText(t); $("amsg").textContent = msg; } catch { prompt("Copy this:", t); } }

  async function onFile(ev) {
    const f = ev.target.files[0]; if (!f) return;
    if (!PRO && Object.keys(custom).length >= P.FREE_CSV_LIMIT) { $("cmsg").innerHTML = `The free version handles ${P.FREE_CSV_LIMIT} CSV file. <a href="#propanel">Pro</a> lets you upload as many as you like.`; ev.target.value = ""; return; }
    if (f.size > 5e6) { $("cmsg").textContent = "File is over 5 MB."; return; }
    try {
      const p = E.parseCSV(await f.text()), id = "custom" + (Object.keys(custom).length + 1);
      const name = ($("cname").value || f.name.replace(/\.\w+$/, "")).slice(0, 40);
      custom[id] = { name, cur: $("ccur").value, series: p.series };
      const ks = Object.keys(p.series); $("cmsg").textContent = `Loaded "${name}": ${ks.length} months, ${ks[0]} to ${ks.at(-1)}` + (p.skipped ? `, ${p.skipped} rows skipped` : "") + ". Give it a weight above.";
      const o = readOpts(); o.weights[id] = 0; buildWeights(o.weights);
    } catch (e) { $("cmsg").textContent = "Could not read file: " + e.message; }
  }

  function b64bytes(dataURL) { const b = atob(dataURL.split(",")[1]), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function reportBytes() {
    const s = last.stats, T = [], L = (text, y, o) => T.push(Object.assign({ text, x: 50, y }, o || {}));
    const mix = last.ids.map((id, i) => Math.round(last.weights[i] * 100) + "% " + (E.ASSETS[id] ? E.ASSETS[id].label : custom[id].name + " (your CSV)"));
    L("BacktestCard report", 60, { size: 22, bold: true }); L("Historical stress test. Educational only, not investment advice.", 80, { size: 10, color: [0.6, 0.35, 0] });
    L(`Generated ${new Date().toISOString().slice(0, 10)} - ${last.dates[0]} to ${last.dates.at(-1)} - measured in ${last.base}${last.real ? " (real, after US CPI)" : ""} - rebalance ${({ A: "yearly", M: "monthly", N: "never" })[last.opts.rebalance]} - annual cost ${last.opts.feePct || 0}%`, 100, { size: 9 });
    L("Portfolio", 128, { size: 13, bold: true }); mix.forEach((m, i) => L(m, 146 + i * 14));
    let y = 156 + mix.length * 14; L("Results", y, { size: 13, bold: true }); y += 18;
    [["Growth of 1 " + last.base, last.values.at(-1).toFixed(2)], ["Annual growth (CAGR)", pct(s.cagr, 2)], ["Worst fall (max drawdown)", pct(s.maxDD)], ["Worst 12 months", pct(s.worst12m)],
     ["Worst month", pct(s.worstMonth)], ["Volatility (annual)", pct(s.vol)], ["Sharpe vs US T-bills", s.sharpe == null ? "-" : s.sharpe.toFixed(2)], ["Longest time below a previous peak", s.longestUnderwaterMonths + " months"], ["Months tested", String(s.months)]]
      .forEach(([k, v]) => { L(k, y); L(v, y, { x: 300, bold: true }); y += 14; });
    y += 10; L("Crisis replays", y, { size: 13, bold: true }); y += 18;
    L("Event", y, { bold: true }); L("Window", y, { x: 210, bold: true }); L("Return", y, { x: 330, bold: true }); L("Worst fall", y, { x: 400, bold: true }); L("Recovered in", y, { x: 480, bold: true }); y += 14;
    for (const c of E.CRISES) { const r = last.crises.find(x => x.id === c.id); L(c.name, y); L(c.start + " to " + c.end, y, { x: 210 });
      if (r) { L(pct(r.ret), y, { x: 330 }); L(pct(r.maxDD), y, { x: 400 }); L(r.monthsToRecover == null ? "not yet" : r.monthsToRecover + " mo", y, { x: 480 }); } else L("outside data range", y, { x: 330 }); y += 14; }
    const cv = card(), img = { jpeg: b64bytes(cv.toDataURL("image/jpeg", 0.9)), w: cv.width, h: cv.height, x: 50, y: y + 16, dw: 495, dh: 260 };
    y += 290;
    const notes = ["Method and limits: monthly data. Equity series are price indices without dividends (roughly 1-2%/yr below total return).",
      "Monthly averages understate intra-month falls. Bond and cash returns are modelled from published yields. Past results do not predict the future.",
      "This report is an educational calculation of historical data. It is not investment advice, a recommendation, or a research report, and",
      "BacktestCard is not a SEBI-registered investment adviser or research analyst.",
      "Data: Federal Reserve Board (H.10, H.15); U.S. Bureau of Labor Statistics; OECD Financial market indicators; World Bank Pink Sheet (CC BY 4.0)."];
    notes.forEach((n, i) => L(n, y + i * 12, { size: 8, color: [0.35, 0.35, 0.4] }));
    return MiniPDF.build([{ items: T.concat([img]) }]);
  }
  function pdfReport() {
    if (!PRO) return needPro("The PDF report");
    if (!last) return;
    const bytes = reportBytes();
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })); a.download = "backtestcard-report.pdf"; a.click();
  }
  const SKEY = "btc_saved_v1";
  const getSaved = () => { try { return JSON.parse(localStorage.getItem(SKEY)) || []; } catch { return []; } };
  function renderSaved() {
    const box = $("savedlist"); box.innerHTML = "";
    if (!PRO) { box.innerHTML = 'Save portfolios to come back to them later. <a href="#propanel">Pro</a>'; return; }
    const list = getSaved(); if (!list.length) { box.textContent = "Nothing saved yet."; return; }
    list.forEach((it, i) => { const row = document.createElement("div"); row.className = "row";
      const a = document.createElement("a"); a.href = "#" + it.state; a.textContent = it.name; a.style.flex = "1";
      const del = document.createElement("button"); del.textContent = "Delete"; del.onclick = () => { const l = getSaved(); l.splice(i, 1); localStorage.setItem(SKEY, JSON.stringify(l)); renderSaved(); };
      row.append(a, del); box.append(row); });
  }
  $("savebtn").onclick = () => { if (!PRO) return needPro("Saved portfolios");
    const name = ($("savename").value || "Portfolio " + (getSaved().length + 1)).slice(0, 60), l = getSaved();
    l.unshift({ name, state: E.encodeState(readOpts()) }); localStorage.setItem(SKEY, JSON.stringify(l.slice(0, 200))); $("savename").value = ""; renderSaved(); };
  $("pdf").onclick = pdfReport;
  $("pro").href = P.BUY_URL;
  $("proact").onclick = async () => { $("promsg").textContent = "Checking with Gumroad…"; const r = await P.activate($("prokey").value);
    $("promsg").textContent = r.ok ? "Unlocked. Enjoy Pro." : r.error; if (r.ok) { setPro(true); if (last) run(); } };
  P.status().then(setPro).catch(() => setPro(false));
  $("run").onclick = run; $("cfile").onchange = onFile;
  $("share").onclick = () => copy(shareURL(), Object.keys(custom).length ? "Link copied. Your uploaded CSV is not included in links." : "Link copied. It reopens this exact test.");
  $("embed").onclick = () => copy(`<iframe src="${location.origin + location.pathname}?embed=1#${E.encodeState(readOpts())}" width="100%" height="900" style="border:0;max-width:760px" loading="lazy" title="BacktestCard portfolio stress test"></iframe>`, "Embed code copied.");
  $("png").onclick = () => { if (!last) return; const a = document.createElement("a"); a.download = "backtestcard.png"; a.href = card().toDataURL("image/png"); a.click(); };
  window.addEventListener("hashchange", () => { applyOpts(Object.assign({}, DEFAULT, E.decodeState(location.hash))); run(); });

  fetch("data/series.json").then(r => r.json()).then(d => {
    DATA = d; $("built").textContent = "Data built " + d.meta.built + (d.meta.cpi_interpolated.length ? `. US CPI interpolated for ${d.meta.cpi_interpolated.join(", ")} (BLS published no value).` : "");
    const st = location.hash.length > 3 ? E.decodeState(location.hash) : null;
    applyOpts(st && Object.keys(st.weights).length ? st : DEFAULT); run();
    if (params.get("card") === "1" && last) { const img = new Image(); img.src = card().toDataURL("image/png"); img.style.display = "block"; document.body.innerHTML = ""; document.body.style.margin = "0"; document.body.append(img); }
  }).catch(e => $("err").textContent = "Could not load data: " + e.message);
  window.__bt = { card: () => card(), reportBytes: () => reportBytes(), isPro: () => PRO };
})();
