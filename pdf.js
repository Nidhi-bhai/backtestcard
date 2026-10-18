/* Minimal dependency-free PDF writer (MIT). Pages of Helvetica text lines + optional JPEG images. */
(function (root, f) { if (typeof module === "object" && module.exports) module.exports = f(); else root.MiniPDF = f(); })(this, function () {
  "use strict";
  const esc = s => String(s).replace(/[^\x20-\x7e]/g, c => ({ "–": "-", "—": "-", "·": "-", "→": "->", "’": "'", "“": '"', "”": '"', "₹": "INR " }[c] || "?")).replace(/([\\()])/g, "\\$1");
  // pages: [{ items: [{text, x, y, size, bold, color:[r,g,b]} | {jpeg: Uint8Array, w, h, x, y, dw, dh}] }], A4 portrait 595x842pt
  function build(pages) {
    const objs = [], add = s => (objs.push(s), objs.length);
    const enc = new TextEncoder();
    const cat = add(null), pagesId = add(null), f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"),
      f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const kids = [];
    for (const pg of pages) {
      let content = "", xo = "", n = 0;
      for (const it of pg.items) {
        if (it.jpeg) {
          const id = add({ head: `<< /Type /XObject /Subtype /Image /Width ${it.w} /Height ${it.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${it.jpeg.length} >>`, bin: it.jpeg });
          const name = "Im" + (++n); xo += `/${name} ${id} 0 R `;
          content += `q ${it.dw} 0 0 ${it.dh} ${it.x} ${842 - it.y - it.dh} cm /${name} Do Q\n`;
        } else {
          const c = it.color || [0.07, 0.09, 0.15];
          content += `BT ${c.map(v => v.toFixed(3)).join(" ")} rg /${it.bold ? "F2" : "F1"} ${it.size || 10} Tf ${it.x} ${842 - it.y} Td (${esc(it.text)}) Tj ET\n`;
        }
      }
      const cs = add({ head: `<< /Length ${enc.encode(content).length} >>`, bin: enc.encode(content) });
      kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> /XObject << ${xo}>> >> /Contents ${cs} 0 R >>`));
    }
    objs[cat - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + " 0 R").join(" ")}] /Count ${kids.length} >>`;
    const parts = [], offs = []; let len = 0;
    const push = b => { const u = typeof b === "string" ? enc.encode(b) : b; parts.push(u); len += u.length; };
    push("%PDF-1.4\n");
    objs.forEach((o, i) => {
      offs.push(len); push(`${i + 1} 0 obj\n`);
      if (typeof o === "string") push(o); else { push(o.head + "\nstream\n"); push(o.bin); push("\nendstream"); }
      push("\nendobj\n");
    });
    const xref = len;
    push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, "0") + " 00000 n \n").join(""));
    push(`trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(len); let p = 0; for (const u of parts) { out.set(u, p); p += u.length; } return out;
  }
  return { build };
});
