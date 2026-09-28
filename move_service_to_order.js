const Database = require('better-sqlite3');
const db = new Database('techlab_v2.sqlite');

try {
  const reqs = db.prepare("SELECT * FROM service_requests WHERE bill_status = 'billed'").all();
  const toMove = reqs.filter(r => !r.bill_details.toLowerCase().includes('service') && !r.bill_details.toLowerCase().includes('config') && !r.bill_details.toLowerCase().includes('installation'));

  console.log(`Found ${toMove.length} requests to migrate.`);

  const insertOrder = db.prepare(`
    INSERT INTO product_orders (id, customer_mobile, customer_name, customer_address, total_amount, taxable_amount, cgst_total, sgst_total, igst_total, gst_total, status, created_at, payment_status, payment_mode, payment_date, is_gst_bill)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'Delivered', ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, product_name, price, hsn_code, gst_rate, taxable_amount, cgst_amount, sgst_amount, qty)
    VALUES (?, ?, 'product-manual', ?, ?, null, 0, ?, 0, 0, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO order_payments (id, order_id, amount, payment_mode, paid_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    toMove.forEach(r => {
      const orderId = r.bill_number; // Use the bill number to keep it consistent

      console.log(`Migrating: ${orderId} - ${r.customer_name}`);

      insertOrder.run(
        orderId,
        r.customer_mobile,
        r.customer_name,
        "",
        r.bill_amount,
        r.taxable_amount,
        r.cgst_total,
        r.sgst_total,
        r.gst_total,
        r.bill_date || r.created_at,
        r.payment_status || 'paid',
        r.payment_mode || 'Cash',
        r.payment_date || r.bill_date || r.created_at,
        r.gst_total > 0 ? 1 : 0
      );

      const items = JSON.parse(r.bill_details || "[]");
      items.forEach((item, index) => {
        insertOrderItem.run(
          `${orderId}-item-${index}`,
          orderId,
          item.desc || "Item",
          item.rate || 0,
          item.amount || 0,
          item.qty || 1
        );
      });

      if (r.amount_paid > 0) {
        insertPayment.run(
          `pay-${orderId}`,
          orderId,
          r.amount_paid,
          r.payment_mode || 'Cash',
          r.payment_date || r.created_at,
          r.payment_date || r.created_at
        );
      }

      db.prepare("DELETE FROM service_requests WHERE id = ?").run(r.id);
      db.prepare("DELETE FROM service_payments WHERE service_request_id = ?").run(r.id);
    });
  })();

  console.log("Migration complete!");
} catch (error) {
  console.error("Migration failed:", error);
}
