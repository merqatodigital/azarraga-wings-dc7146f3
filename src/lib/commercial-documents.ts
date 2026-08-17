export type CommercialLine = {
  description: string;
  quantity: number;
  unit?: string | null;
  unit_price_centavos: number;
  amount_centavos: number;
  system?: string | null;
  glass?: string | null;
  frame?: string | null;
  width_mm?: number | null;
  height_mm?: number | null;
};
export type CommercialDocument = {
  number: string;
  kind: "QUOTATION" | "INVOICE";
  customer: string;
  project: string;
  location?: string | null;
  status: string;
  currency?: string;
  terms?: string | null;
  leadTime?: string | null;
  subtotalCentavos: number;
  taxCentavos?: number;
  totalCentavos: number;
  balanceCentavos?: number;
  lines: CommercialLine[];
};
const money = (c: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format((c || 0) / 100);
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]!,
  );
export function commercialDocumentHtml(d: CommercialDocument) {
  const rows = d.lines
    .map(
      (l, i) =>
        `<tr><td>${i + 1}</td><td><b>${esc(l.description)}</b>${[l.system, l.glass, l.frame].filter(Boolean).length ? `<small>${[l.system, l.glass, l.frame].filter(Boolean).map(esc).join(" · ")}</small>` : ""}${l.width_mm || l.height_mm ? `<small>${l.width_mm || "—"} × ${l.height_mm || "—"} mm</small>` : ""}</td><td>${esc(l.quantity)} ${esc(l.unit || "pc")}</td><td class="num">${money(l.unit_price_centavos)}</td><td class="num">${money(l.amount_centavos)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(d.number)} · Azarraga Glass & Aluminum</title><style>@page{size:A4;margin:15mm}*{box-sizing:border-box}body{font:13px Arial,sans-serif;color:#14263d;margin:0}header{border-bottom:3px solid #0F4C81;padding-bottom:16px;margin-bottom:22px;display:flex;justify-content:space-between}h1{font-size:25px;margin:0;color:#0F4C81}h2{font-size:15px;margin:3px 0}.muted,small{color:#66788a}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.box{border:1px solid #dbe3ea;border-radius:8px;padding:12px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#0F4C81;color:#fff;text-align:left;padding:9px}td{border-bottom:1px solid #e5e9ee;padding:9px;vertical-align:top}td small{display:block;margin-top:3px}.num{text-align:right;white-space:nowrap}.totals{margin:18px 0 0 auto;width:310px}.totals div{display:flex;justify-content:space-between;padding:5px 0}.totals .grand{font-size:17px;font-weight:bold;border-top:2px solid #0F4C81;margin-top:5px;padding-top:9px}.terms{margin-top:24px;border-top:1px solid #dbe3ea;padding-top:14px}footer{margin-top:30px;color:#66788a;font-size:11px}</style></head><body><header><div><h1>Azarraga Glass & Aluminum</h1><div class="muted">Puerto Princesa · Palawan</div></div><div style="text-align:right"><h2>${d.kind}</h2><b>${esc(d.number)}</b><div class="muted">${esc(d.status)}</div></div></header><div class="meta"><div class="box"><small>CUSTOMER</small><h2>${esc(d.customer)}</h2><div>${esc(d.project)}</div>${d.location ? `<div class="muted">${esc(d.location)}</div>` : ""}</div><div class="box"><small>COMMERCIAL RECORD</small><div>Currency: ${esc(d.currency || "PHP")}</div>${d.leadTime ? `<div>Lead time: ${esc(d.leadTime)}</div>` : ""}</div></div><table><thead><tr><th>#</th><th>Description / specification</th><th>Qty</th><th style="text-align:right">Unit price</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div><span>Subtotal</span><b>${money(d.subtotalCentavos)}</b></div>${d.taxCentavos ? `<div><span>Tax</span><b>${money(d.taxCentavos)}</b></div>` : ""}<div class="grand"><span>Total</span><span>${money(d.totalCentavos)}</span></div>${d.kind === "INVOICE" && d.balanceCentavos != null ? `<div><span>Balance due</span><b>${money(d.balanceCentavos)}</b></div>` : ""}</div>${d.terms ? `<div class="terms"><b>Terms</b><p>${esc(d.terms)}</p></div>` : ""}<footer>Generated from the Azarraga commercial workspace. Financial values are sourced from approved commercial records.</footer></body></html>`;
}
export function printCommercialDocument(d: CommercialDocument) {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) throw new Error("Allow pop-ups to print this document");
  w.document.open();
  w.document.write(commercialDocumentHtml(d));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}

export function downloadCommercialDocumentPdf(d: CommercialDocument) {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setTextColor(15, 76, 129);
  pdf.setFontSize(18);
  pdf.text("Azarraga Glass & Aluminum", 14, 17);
  pdf.setTextColor(20, 38, 61);
  pdf.setFontSize(12);
  pdf.text(`${d.kind} ${d.number}`, 14, 25);
  pdf.setFontSize(9);
  pdf.text(`Customer: ${d.customer || "—"}`, 14, 32);
  pdf.text(`Project: ${d.project || "—"}`, 14, 37);
  pdf.text(`Status: ${d.status}  |  Currency: ${d.currency || "PHP"}`, 14, 42);
  autoTable(pdf, {
    startY: 48,
    head: [["#", "Description / specification", "Qty", "Unit price", "Amount"]],
    body: d.lines.map((line, index) => [
      String(index + 1),
      [
        line.description,
        [line.system, line.glass, line.frame].filter(Boolean).join(" · "),
        line.width_mm || line.height_mm
          ? `${line.width_mm || "—"} × ${line.height_mm || "—"} mm`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
      `${line.quantity} ${line.unit || "pc"}`,
      money(line.unit_price_centavos),
      money(line.amount_centavos),
    ]),
    theme: "grid",
    headStyles: { fillColor: [15, 76, 129] },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 9 },
      1: { cellWidth: 85 },
      2: { cellWidth: 22 },
      3: { halign: "right" },
      4: { halign: "right" },
    },
  });
  const finalY = (pdf as any).lastAutoTable?.finalY || 55;
  const totals = [
    ["Subtotal", money(d.subtotalCentavos)],
    ...(d.taxCentavos ? [["Tax", money(d.taxCentavos)]] : []),
    ["Total", money(d.totalCentavos)],
    ...(d.kind === "INVOICE" && d.balanceCentavos != null
      ? [["Balance due", money(d.balanceCentavos)]]
      : []),
  ];
  autoTable(pdf, {
    startY: finalY + 5,
    body: totals,
    margin: { left: 115 },
    theme: "plain",
    styles: { fontSize: 9 },
    columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
  });
  if (d.terms) {
    const termsY = (pdf as any).lastAutoTable?.finalY + 7;
    pdf.setFontSize(9);
    pdf.text("Terms", 14, termsY);
    pdf.setFont("helvetica", "normal");
    pdf.text(pdf.splitTextToSize(d.terms, 180), 14, termsY + 5);
  }
  const safeNumber = d.number.replace(/[^a-zA-Z0-9._-]/g, "_");
  pdf.save(`${d.kind.toLowerCase()}-${safeNumber}.pdf`);
}
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
