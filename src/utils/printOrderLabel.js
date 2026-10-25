import JsBarcode from "jsbarcode";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";

function firstValue(...values) {
  return values.find((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "₱0.00";
}

function makeOrderBarcode(orderId) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, `GS-${orderId}`, {
    format: "CODE128",
    displayValue: false,
    lineColor: "#111827",
    background: "#ffffff",
    width: 2,
    height: 56,
    margin: 4,
  });
  return svg.outerHTML;
}

function makeOrderQr(orderId) {
  return renderToStaticMarkup(createElement(QRCodeSVG, {
    value: `GADGETSTORE:ORDER:${orderId}`,
    size: 128,
    level: "M",
    marginSize: 1,
  }));
}

export function printOrderLabel(order, items = []) {
  const printWindow = window.open("", "_blank", "width=520,height=760");
  if (!printWindow) return false;

  const orderId = firstValue(order.order_id, order.orderId, order.OrderId, "Unknown");
  const userId = firstValue(order.user_id, order.userId, order.UserId);
  const recipient = firstValue(
    order.recipient_name,
    order.recipientName,
    order.customer_name,
    order.customerName,
    order.user?.full_name,
    order.user?.fullName,
    order.user?.username,
    order.customer?.name,
    userId != null ? `Customer account #${userId}` : "Customer"
  );
  const phone = firstValue(order.phone_number, order.phoneNumber, order.phone, order.Phone, "Not provided");
  const address = firstValue(order.shipping_address, order.shippingAddress, order.ShippingAddress, "No delivery address on order");
  const dateValue = firstValue(order.order_date, order.orderDate, order.OrderDate);
  const date = dateValue ? new Date(dateValue).toLocaleString("en-PH") : "Date unavailable";
  const paymentMethod = firstValue(order.payment_method, order.paymentMethod, order.PaymentMethod, "Not specified");
  const paymentStatus = firstValue(order.payment_status, order.paymentStatus, order.PaymentStatus, "Status unavailable");
  const total = firstValue(order.total_amount, order.totalAmount, order.TotalAmount, 0);
  const courier = firstValue(order.courier_name, order.courierName, order.CourierName, "Not assigned");
  const tracking = firstValue(order.tracking_number, order.trackingNumber, order.TrackingNumber, "Not assigned");
  const isCod = String(paymentMethod).toUpperCase() === "COD";

  const visibleItems = items.slice(0, 4);
  const itemRows = visibleItems.length
    ? visibleItems.map((item) => {
      const product = item.product ?? item.Product ?? {};
      const productId = firstValue(item.product_id, item.productId, item.ProductId, "");
      const name = firstValue(product.product_name, product.productName, product.ProductName, item.product_name, item.productName, item.ProductName, productId ? `Product #${productId}` : "Gadget");
      const quantity = firstValue(item.quantity, item.Quantity, 1);
      const price = firstValue(item.price, item.Price, null);
      return `<tr><td>${escapeHtml(name)}</td><td class="qty">${escapeHtml(quantity)}</td><td class="price">${price == null ? "—" : escapeHtml(formatMoney(price))}</td></tr>`;
    }).join("") + (items.length > visibleItems.length
      ? `<tr><td colspan="3" class="muted">+ ${items.length - visibleItems.length} more item type(s)</td></tr>`
      : "")
    : '<tr><td colspan="3" class="muted">Item details were not loaded when this label was printed.</td></tr>';

  const barcode = makeOrderBarcode(orderId);
  const qrCode = makeOrderQr(orderId);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Order ${escapeHtml(orderId)} — GadgetStore parcel label</title>
<style>
  @page { size: 100mm 150mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; color: #111827; font-family: Arial, Helvetica, sans-serif; }
  body { width: 100mm; min-height: 150mm; }
  .label { width: 100mm; min-height: 150mm; padding: 3.5mm; border: 1px solid #1f2937; overflow: hidden; }
  .top { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #111827; padding-bottom:2.2mm; }
  .brand { font-size:19px; font-weight:900; letter-spacing:.3px; }
  .brand small { display:block; font-size:8px; letter-spacing:1.4px; margin-top:1mm; }
  .tag { border:1px solid #111827; padding:1.5mm 2mm; text-align:right; font-size:8px; font-weight:700; }
  .tag strong { display:block; font-size:14px; margin-top:1mm; }
  .meta { display:flex; justify-content:space-between; gap:3mm; padding:2mm 0; border-bottom:1px solid #6b7280; font-size:9px; }
  .barcode-wrap { display:flex; align-items:center; justify-content:space-between; gap:3mm; padding:2mm 0 1mm; border-bottom:2px solid #111827; }
  .barcode-bar { min-width:0; flex:1; text-align:center; }
  .barcode-bar svg { display:block; width:100%; max-height:20mm; }
  .qr-wrap { width:25mm; flex:0 0 25mm; text-align:center; font-size:6px; letter-spacing:.5px; font-weight:800; }
  .qr-wrap svg { display:block; width:24mm; height:24mm; margin:0 auto 1mm; }
  .barcode-caption { font-size:9px; letter-spacing:1px; margin-top:1mm; }
  .section { padding:2.3mm 0; border-bottom:1px solid #6b7280; }
  .eyebrow { font-size:8px; letter-spacing:1.2px; font-weight:800; color:#374151; margin-bottom:1mm; }
  .recipient { font-size:17px; font-weight:800; line-height:1.15; overflow-wrap:anywhere; }
  .phone { font-size:12px; font-weight:700; margin-top:1mm; }
  .address { font-size:14px; font-weight:700; line-height:1.28; overflow-wrap:anywhere; white-space:pre-wrap; }
  .route { display:grid; grid-template-columns:1fr 1fr; gap:2mm; }
  .route div { min-width:0; }
  .route span { display:block; font-size:7px; text-transform:uppercase; letter-spacing:.8px; color:#4b5563; }
  .route strong { display:block; font-size:10px; margin-top:.8mm; overflow-wrap:anywhere; }
  table { width:100%; border-collapse:collapse; font-size:9px; }
  th { text-align:left; font-size:7px; letter-spacing:.7px; text-transform:uppercase; border-bottom:1px solid #9ca3af; padding:1mm 0; }
  td { padding:1.2mm 0; vertical-align:top; border-bottom:1px solid #e5e7eb; }
  .qty { width:12mm; text-align:center; font-weight:700; }
  .price { width:23mm; text-align:right; white-space:nowrap; }
  .payment { display:grid; grid-template-columns:1fr 1fr; gap:2mm; }
  .payment .box { border:1px solid #374151; padding:2mm; }
  .payment span { display:block; font-size:7px; text-transform:uppercase; letter-spacing:.7px; }
  .payment strong { display:block; font-size:12px; margin-top:1mm; }
  .cod { background:#f3f4f6; }
  .footer { text-align:center; padding-top:2mm; font-size:7px; color:#4b5563; line-height:1.4; }
  .muted { color:#6b7280; font-style:italic; }
  @media screen { body { margin: 10px auto; } .label { box-shadow:0 2px 12px #0002; } }
  @media print { html, body { width:100mm; height:150mm; } .label { border:0; } }
</style>
</head>
<body>
<main class="label">
  <header class="top"><div class="brand">GADGETSTORE<small>STORE-GENERATED PARCEL LABEL</small></div><div class="tag">ORDER ID<strong>#${escapeHtml(orderId)}</strong></div></header>
  <div class="meta"><span>Placed: ${escapeHtml(date)}</span><span>Status: ${escapeHtml(firstValue(order.status, order.Status, "Pending"))}</span></div>
  <div class="barcode-wrap"><div class="barcode-bar">${barcode}<div class="barcode-caption">GS-${escapeHtml(orderId)}</div></div><div class="qr-wrap">${qrCode}<span>SCAN ORDER ID</span></div></div>
  <section class="section"><div class="eyebrow">DELIVER TO</div><div class="recipient">${escapeHtml(recipient)}</div><div class="phone">${escapeHtml(phone)}</div></section>
  <section class="section"><div class="eyebrow">DELIVERY ADDRESS</div><div class="address">${escapeHtml(address)}</div></section>
  <section class="section route"><div><span>Courier</span><strong>${escapeHtml(courier)}</strong></div><div><span>Tracking number</span><strong>${escapeHtml(tracking)}</strong></div></section>
  <section class="section"><div class="eyebrow">ORDER CONTENTS</div><table><thead><tr><th>Product</th><th class="qty">Qty</th><th class="price">Unit price</th></tr></thead><tbody>${itemRows}</tbody></table></section>
  <section class="section payment"><div class="box"><span>Payment</span><strong>${escapeHtml(paymentMethod)}</strong><span>${escapeHtml(paymentStatus)}</span></div><div class="box ${isCod ? "cod" : ""}"><span>${isCod ? "COD amount to collect" : "Order total"}</span><strong>${escapeHtml(formatMoney(total))}</strong></div></section>
  <footer class="footer">Internal store label for order identification. Not a carrier-issued waybill.<br>Confirm the courier's required format before handing over the parcel.</footer>
</main>
<script>window.addEventListener('load',()=>setTimeout(()=>{window.focus();window.print()},250));</script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
