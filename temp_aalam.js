const db = require('G:/Techlab_webpage/backend/db.js').db;

console.log('== Enquiry = enquiry-v8bl (AALAM TEX) ==');
const e = db.prepare("SELECT * FROM enquiries WHERE id='enquiry-v8bl'").get();
console.log('status:', e?.status, '| quote:', e?.quoted_price, '| qty:', e?.quantity, '| po:', e?.po_id, '| pos:', e?.po_ids, '| product:', e?.product_interest);
console.log('quote_options:', e?.quote_options);

console.log('\n== sales_quotations for enquiry-v8bl ==');
db.prepare("SELECT id, quote_number, customer_name, total_amount, status, enquiry_id FROM sales_quotations WHERE enquiry_id='enquiry-v8bl'").all().forEach(q => console.log(JSON.stringify(q)));

console.log('\n== delivery_challans for enquiry-v8bl ==');
db.prepare("SELECT id, challan_number, source_type, source_id, total_value, billing_status, linked_order_id, created_at FROM delivery_challans WHERE source_type='enquiry' AND source_id='enquiry-v8bl'").all().forEach(c => console.log(JSON.stringify(c)));

console.log('\n== purchase_orders linked ==');
db.prepare("SELECT id, po_number, supplier_id, total_amount, status, payment_status, amount_paid FROM purchase_orders WHERE id IN (?) OR ? = 1").all(e?.po_id, 1).forEach(p => console.log(JSON.stringify(p)));

console.log('\n== Any order for AALAM ==');
db.prepare("SELECT id, bill_number, total_amount, status, payment_status FROM product_orders WHERE LOWER(customer_name) LIKE '%aalam%'").all().forEach(o => console.log(JSON.stringify(o)));
db.prepare("SELECT id, bill_number, bill_amount, status, payment_status FROM service_requests WHERE LOWER(customer_name) LIKE '%aalam%'").all().forEach(o => console.log(JSON.stringify(o)));

console.log('\n== parties AALAM ==');
db.prepare("SELECT * FROM parties WHERE name LIKE '%AALAM%'").all().forEach(p => console.log(JSON.stringify(p)));