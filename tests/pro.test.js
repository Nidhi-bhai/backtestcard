// node tests/pro.test.js  (licence logic with a mocked Gumroad API + PDF writer validity)
const assert = require("assert"), fs = require("fs"), path = require("path"), cp = require("child_process");
const src = fs.readFileSync(path.join(__dirname, "../pro.js"), "utf8").replace('"REPLACE_WITH_GUMROAD_PRODUCT_ID"', '"TESTPID=="');
const m = { exports: {} }; new Function("module", "exports", src)(m, m.exports); const P = m.exports;
const Store = () => { const d = {}; return { getItem: k => (k in d ? d[k] : null), setItem: (k, v) => (d[k] = String(v)), removeItem: k => delete d[k] }; };
const fake = body => async (url, opt) => { assert.strictEqual(url, "https://api.gumroad.com/v2/licenses/verify");
  const q = new URLSearchParams(opt.body); assert.strictEqual(q.get("product_id"), "TESTPID=="); assert.strictEqual(q.get("increment_uses_count"), "false");
  return { json: async () => (typeof body === "function" ? body(q) : body) }; };
const good = { success: true, purchase: { refunded: false, chargebacked: false } };
(async () => {
  let n = 0; const t = async (name, f) => { await f(); n++; console.log("ok  ", name); };
  await t("rejects malformed key without network", async () => { const r = await P.verify("x", () => { throw 1; }); assert(!r.ok); });
  await t("valid key activates and persists", async () => { const s = Store(); assert((await P.activate("ABCD1234-EF567890", s, fake(good))).ok); assert(await P.status(s, null, Date.now())); });
  await t("refunded / chargebacked / failure rejected", async () => {
    for (const b of [{ success: false, message: "That license does not exist for the provided product." }, { success: true, purchase: { refunded: true } }, { success: true, purchase: { chargebacked: true } }])
      assert(!(await P.activate("ABCD1234-EF567890", Store(), fake(b))).ok); });
  await t("weekly re-check revokes refunded key", async () => { const s = Store(); await P.activate("ABCD1234-EF567890", s, fake(good));
    assert.strictEqual(await P.status(s, fake({ success: true, purchase: { refunded: true } }), Date.now() + 8 * 864e5), false); assert.strictEqual(P.load(s), null); });
  await t("offline re-check keeps Pro", async () => { const s = Store(); await P.activate("ABCD1234-EF567890", s, fake(good));
    assert.strictEqual(await P.status(s, async () => { throw new Error("offline"); }, Date.now() + 8 * 864e5), true); });
  await t("placeholder product id refuses to unlock", async () => { const real = require("../pro.js"); assert(!(await real.verify("ABCD1234-EF567890", fake(good))).ok); });
  await t("PDF writer produces a valid PDF with text", async () => {
    const pdf = require("../pdf.js").build([{ items: [{ text: "BacktestCard report – (test) ₹", x: 50, y: 60, size: 20, bold: true }, { text: "Educational only", x: 50, y: 90 }] }]);
    const f = "/tmp/btc-test.pdf"; fs.writeFileSync(f, pdf);
    const txt = cp.execFileSync("pdftotext", [f, "-"]).toString(); assert(/BacktestCard report - \(test\) INR/.test(txt), txt); assert(/Educational only/.test(txt));
    const info = cp.execFileSync("pdfinfo", [f]).toString(); assert(/Pages:\s+1/.test(info)); });
  console.log(n + " pro tests passed");
})().catch(e => { console.error(e); process.exit(1); });
