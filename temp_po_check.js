const db = require('G:/Techlab_webpage/backend/db.js').db;

console.log('== purchase_orders ==');
db.prepare("SELECT id, po_number, supplier_id, total_amount, amount_paid, payment_status, status FROM purchase_orders ORDER BY created_at").all().forEach(r => {
  console.log(r.po_number, '|', r.id, '| status:', r.status, '| total:', r.total_amount, '| paid:', (r.amount_paid||0), '|', r.payment_status, '| supplier:', r.supplier_id);
});

console.log('\n== purchases (item records) linked by invoice_number ==');
db.prepare("SELECT id, invoice_number, product_name, quantity, unit_cost, total_cost, amount_paid, payment_status FROM purchases ORDER BY invoice_number").all().forEach(r => {
  console.log(r.invoice_number, '|', r.id, '|', r.product_name, '| qty:', r.quantity, '| total:', r.total_cost, '| paid:', (r.amount_paid||0), '|', r.payment_status);
});

console.log('\n== PO item purchases (via invoice_number = po_number) ==');
db.prepare(`
  SELECT po.po_number, po.status,
    COUNT(pp.id) as item_count,
    COALESCE(SUM(pp.total_cost),0) as item_total,
    COALESCE(SUM(pp.amount_paid),0) as item_paid,
    COALESCE(SUM(pp.total_cost - pp.amount_paid),0) as item_due
  FROM purchase_orders po
  LEFT JOIN purchases pp ON pp.invoice_number = po.po_number
  GROUP BY po.po_number
`).all().forEach(r => console.log(r.po_number, r.status, 'items:', r.item_count, 'total:', r.item_total, 'paid:', r.item_paid, 'due:', r.item_due));