// One-off correction: convert product order 260915-001 (INV-26-27-0015, Poornima ChitFunds)
// from a non-GST bill to a GST (18%) tax invoice, IN PLACE.
// Keeps total_amount unchanged; recomputes taxable/CGST/SGST the same way orderService does
// (GST-inclusive pricing: taxable = round(total / 1.18)).
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "techlab_v2.sqlite"));
const ORDER_ID = "260915-001";

const order = db.prepare("SELECT * FROM product_orders WHERE id = ?").get(ORDER_ID);
if (!order) {
  console.error("Order not found:", ORDER_ID);
  process.exit(1);
}
if (order.is_gst_bill === 1) {
  console.log("Order is already GST; nothing to do.");
  db.close();
  process.exit(0);
}

const items = db.prepare("SELECT id, product_name, price, qty FROM order_items WHERE order_id = ?").all(ORDER_ID);
if (!items.length) {
  console.error("No items on order:", ORDER_ID);
  process.exit(1);
}

const round = Math.round;
const floor = Math.floor;

const total = Number(order.total_amount);
const taxable = round(total / 1.18);
const gstTotal = total - taxable;
const cgstTotal = floor(gstTotal / 2);
const sgstTotal = gstTotal - cgstTotal;

const tx = db.transaction(() => {
  const updItem = db.prepare("UPDATE order_items SET gst_rate = ?, taxable_amount = ?, cgst_amount = ?, sgst_amount = ? WHERE id = ?");
  items.forEach((it) => {
    const lineTotal = Number(it.price) * Number(it.qty);
    const lineTaxable = round(lineTotal / 1.18);
    const lineGst = lineTotal - lineTaxable;
    updItem.run(18, lineTaxable, floor(lineGst / 2), lineGst - floor(lineGst / 2), it.id);
  });

  db.prepare(`
    UPDATE product_orders
    SET is_gst_bill = 1, taxable_amount = ?, cgst_total = ?, sgst_total = ?, gst_total = ?, igst_total = 0
    WHERE id = ?
  `).run(taxable, cgstTotal, sgstTotal, gstTotal, ORDER_ID);
});

tx();

const after = db.prepare("SELECT total_amount, taxable_amount, cgst_total, sgst_total, gst_total, is_gst_bill FROM product_orders WHERE id = ?").get(ORDER_ID);
console.log("BEFORE:", {
  total_amount: order.total_amount,
  taxable_amount: order.taxable_amount,
  cgst_total: order.cgst_total,
  sgst_total: order.sgst_total,
  gst_total: order.gst_total,
  is_gst_bill: order.is_gst_bill,
});
console.log("AFTER:", after);
console.log("Check taxable+CGST+SGST =", (after.taxable_amount + after.cgst_total + after.sgst_total), "| total stays", after.total_amount);
db.close();