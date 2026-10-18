/* BacktestCard Pro licence check (MIT). Client-side Gumroad licence verification, same pattern as our extension.
   Honest note: a client-side check can be bypassed by a determined user; it exists to make paying easy, not to be DRM. */
(function (root, f) { if (typeof module === "object" && module.exports) module.exports = f(); else root.BTPro = f(); })(this, function () {
  "use strict";
  const GUMROAD_PRODUCT_ID = "rI9mFvmh86mXJ_9jaS41AA==";   // set after the Gumroad product exists
  const BUY_URL = "https://nidhiverse1.gumroad.com/l/backtestcard-pro"; // update to the real permalink
  const KEY = "btc_pro_v1", RECHECK_MS = 7 * 864e5;
  const FREE_CSV_LIMIT = 1;

  function okPurchase(j) {
    if (!j || j.success !== true || !j.purchase) return false;
    const p = j.purchase;
    return !p.refunded && !p.chargebacked && !p.disputed && !(p.subscription_ended_at || p.subscription_cancelled_at || p.subscription_failed_at);
  }
  async function verify(key, fetchImpl) {
    key = String(key || "").trim();
    if (!/^[A-Za-z0-9-]{8,64}$/.test(key)) return { ok: false, error: "That doesn't look like a Gumroad licence key." };
    if (GUMROAD_PRODUCT_ID.startsWith("REPLACE")) return { ok: false, error: "Pro isn't on sale yet." };
    try {
      const r = await (fetchImpl || fetch)("https://api.gumroad.com/v2/licenses/verify", { method: "POST",
        body: new URLSearchParams({ product_id: GUMROAD_PRODUCT_ID, license_key: key, increment_uses_count: "false" }) });
      const j = await r.json();
      return okPurchase(j) ? { ok: true } : { ok: false, error: j && j.message ? j.message : "Licence not valid (refunded or wrong key)." };
    } catch (e) { return { ok: false, network: true, error: "Couldn't reach Gumroad. Check your connection and try again." }; }
  }
  function load(store) { try { return JSON.parse((store || localStorage).getItem(KEY)) || null; } catch { return null; } }
  function save(rec, store) { (store || localStorage).setItem(KEY, JSON.stringify(rec)); }
  function clear(store) { (store || localStorage).removeItem(KEY); }
  async function activate(key, store, fetchImpl) { const r = await verify(key, fetchImpl); if (r.ok) save({ key: key.trim(), at: Date.now() }, store); return r; }
  // Pro is active if stored; re-verify weekly; on network failure keep Pro (don't punish offline buyers).
  async function status(store, fetchImpl, now) {
    const rec = load(store); if (!rec) return false;
    if ((now || Date.now()) - rec.at < RECHECK_MS) return true;
    const r = await verify(rec.key, fetchImpl);
    if (r.ok) { save({ key: rec.key, at: now || Date.now() }, store); return true; }
    if (r.network) return true;
    clear(store); return false;
  }
  return { GUMROAD_PRODUCT_ID, BUY_URL, FREE_CSV_LIMIT, verify, activate, status, load, clear, okPurchase };
});
