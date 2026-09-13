import type { StorefrontConfig } from "./config.ts";
import { formatDate, formatMoney } from "./format.ts";
import type { AdminOrder } from "./types.ts";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ] ?? character,
  );
}

/** Builds the next invoice number from the format the admin configured. */
export function invoiceNumber(
  config: StorefrontConfig,
  order: AdminOrder,
): string {
  return config.invoice.numberFormat
    .replace(
      "{year}",
      String(new Date(order.placedAt || Date.now()).getFullYear()),
    )
    .replace("{number}", String(config.invoice.nextNumber).padStart(5, "0"))
    .replace("{order}", order.number);
}

const DOCUMENT_STYLE = `
body{font:13px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;color:#212121;padding:28px;max-width:820px;margin:0 auto}
header{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;border-bottom:3px solid var(--accent);padding-bottom:14px;margin-bottom:18px}
h1{font-size:20px;margin:0 0 2px}h2{font-size:13px;margin:18px 0 6px;text-transform:uppercase;letter-spacing:.04em;color:#757575}
.muted{color:#757575}.right{text-align:right}
img.logo{max-height:52px}
table{border-collapse:collapse;width:100%;margin-top:6px}
th,td{border-bottom:1px solid #eaeaea;padding:7px 6px;text-align:left}
th{background:#fafafa;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#757575}
tfoot td{border:none;padding:3px 6px}
tfoot tr.total td{border-top:2px solid var(--accent);font-weight:700;font-size:15px;padding-top:8px}
.grid{display:flex;gap:24px;flex-wrap:wrap}.grid>div{flex:1;min-width:200px}
footer{margin-top:24px;border-top:1px solid #eaeaea;padding-top:12px;font-size:11px;color:#757575}
.label{border:2px solid #212121;border-radius:8px;padding:16px;margin-top:10px}
.big{font-size:22px;font-weight:700;letter-spacing:.06em}
@media print{body{padding:0}}
`;

function shell(title: string, accent: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><style>:root{--accent:${escapeHtml(accent)}}${DOCUMENT_STYLE}</style></head>
<body>${body}</body></html>`;
}

function addressBlock(address: AdminOrder["shippingAddress"]): string {
  return [
    address.fullName,
    address.line1,
    address.line2,
    [address.city, address.district].filter(Boolean).join(", "),
    [address.province, address.postalCode].filter(Boolean).join(" "),
    address.country,
    address.phone,
  ]
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join("<br>");
}

/** A printable invoice. On web the browser's print dialog saves it as a PDF. */
export function invoiceHtml(
  order: AdminOrder,
  config: StorefrontConfig,
): string {
  const { invoice, localisation } = config;
  const money = (value: unknown) =>
    escapeHtml(formatMoney(value, localisation));
  const rows = (order.lines ?? [])
    .map(
      (line) => `<tr>
<td>${escapeHtml(line.name)}<br><span class="muted">${escapeHtml(line.sku)}</span></td>
<td class="right">${escapeHtml(line.quantity)}</td>
<td class="right">${money(line.unitPrice)}</td>
<td class="right">${money(line.unitPrice * line.quantity - (Number(line.discount) || 0))}</td>
</tr>`,
    )
    .join("");

  return shell(
    `Invoice ${order.number}`,
    invoice.accentColor,
    `<header>
<div>
${invoice.showLogo && config.branding.invoiceLogo ? `<img class="logo" src="${escapeHtml(config.branding.invoiceLogo)}" alt="">` : ""}
<h1>${escapeHtml(invoice.companyName || config.branding.companyName)}</h1>
<div class="muted">${escapeHtml(invoice.address)}</div>
<div class="muted">${escapeHtml(invoice.phone)}</div>
${invoice.panVat ? `<div class="muted">PAN/VAT: ${escapeHtml(invoice.panVat)}</div>` : ""}
</div>
<div class="right">
<h1>Invoice</h1>
<div class="muted">${escapeHtml(invoiceNumber(config, order))}</div>
<div class="muted">Order ${escapeHtml(order.number)}</div>
<div class="muted">${escapeHtml(formatDate(order.placedAt, localisation))}</div>
</div>
</header>
<div class="grid">
<div><h2>Billed to</h2>${addressBlock(order.billingAddress)}</div>
<div><h2>Delivered to</h2>${addressBlock(order.shippingAddress)}</div>
<div><h2>Payment</h2>${escapeHtml(order.paymentMethod)}<br><span class="muted">${escapeHtml(order.paymentStatus)}</span></div>
</div>
<h2>Items</h2>
<table><thead><tr><th>Item</th><th class="right">Qty</th><th class="right">Price</th><th class="right">Amount</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot>
<tr><td colspan="3" class="right muted">Subtotal</td><td class="right">${money(order.subtotal)}</td></tr>
${order.discountTotal ? `<tr><td colspan="3" class="right muted">Discount${order.couponCode ? ` (${escapeHtml(order.couponCode)})` : ""}</td><td class="right">-${money(order.discountTotal)}</td></tr>` : ""}
<tr><td colspan="3" class="right muted">Shipping</td><td class="right">${money(order.shippingTotal)}</td></tr>
${order.taxTotal ? `<tr><td colspan="3" class="right muted">${escapeHtml(config.invoice.panVat ? "VAT" : "Tax")}</td><td class="right">${money(order.taxTotal)}</td></tr>` : ""}
${order.refundedTotal ? `<tr><td colspan="3" class="right muted">Refunded</td><td class="right">-${money(order.refundedTotal)}</td></tr>` : ""}
<tr class="total"><td colspan="3" class="right">Total</td><td class="right">${money((Number(order.total) || 0) - (Number(order.refundedTotal) || 0))}</td></tr>
</tfoot></table>
${invoice.terms ? `<h2>Terms</h2><div class="muted">${escapeHtml(invoice.terms)}</div>` : ""}
<footer>${escapeHtml(invoice.footer)}</footer>`,
  );
}

export function packingSlipHtml(
  order: AdminOrder,
  config: StorefrontConfig,
): string {
  const rows = (order.lines ?? [])
    .map(
      (line) =>
        `<tr><td>${escapeHtml(line.name)}</td><td>${escapeHtml(line.sku)}</td><td class="right">${escapeHtml(line.quantity)}</td><td style="width:70px"></td></tr>`,
    )
    .join("");
  return shell(
    `Packing slip ${order.number}`,
    config.invoice.accentColor,
    `<header>
<div><h1>${escapeHtml(config.branding.companyName)}</h1><div class="muted">Packing slip</div></div>
<div class="right"><div class="big">${escapeHtml(order.number)}</div><div class="muted">${escapeHtml(formatDate(order.placedAt, config.localisation))}</div></div>
</header>
<div class="grid"><div><h2>Deliver to</h2>${addressBlock(order.shippingAddress)}</div>
<div><h2>Notes</h2><div class="muted">${escapeHtml(order.customerNote || "None")}</div></div></div>
<h2>Items to pack</h2>
<table><thead><tr><th>Item</th><th>SKU</th><th class="right">Qty</th><th>Packed</th></tr></thead><tbody>${rows}</tbody></table>
<footer>Packed by ______________________ &nbsp; Checked by ______________________</footer>`,
  );
}

export function shippingLabelHtml(
  order: AdminOrder,
  config: StorefrontConfig,
): string {
  return shell(
    `Shipping label ${order.number}`,
    config.invoice.accentColor,
    `<div class="label">
<div class="muted">FROM</div>
<div><strong>${escapeHtml(config.branding.companyName)}</strong><br>${escapeHtml(config.contact.address)}<br>${escapeHtml(config.contact.phone)}</div>
<hr style="margin:14px 0;border:none;border-top:1px dashed #212121">
<div class="muted">DELIVER TO</div>
<div style="font-size:16px;line-height:1.5">${addressBlock(order.shippingAddress)}</div>
<hr style="margin:14px 0;border:none;border-top:1px dashed #212121">
<div style="display:flex;justify-content:space-between;align-items:flex-end">
<div><div class="muted">ORDER</div><div class="big">${escapeHtml(order.number)}</div></div>
<div class="right"><div class="muted">COURIER</div><div><strong>${escapeHtml(order.courier || "Unassigned")}</strong></div>
<div class="muted">${escapeHtml(order.trackingNumber || "")}</div></div>
</div>
<div style="margin-top:12px;padding:8px;border:1px solid #212121;text-align:center">
<strong>${escapeHtml(order.paymentMethod)}</strong>
${order.paymentStatus === "paid" ? " — PAID" : ` — COLLECT ${escapeHtml(formatMoney(order.total, config.localisation))}`}
</div>
</div>`,
  );
}
