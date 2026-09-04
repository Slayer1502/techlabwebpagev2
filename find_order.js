const Database = require('better-sqlite3');
const db = new Database('techlab_v2.sqlite');

try {
    const orderId = '260816-001';
    const challan = db.prepare("SELECT * FROM delivery_challans WHERE linked_order_id = ?").get(orderId);
    console.log('Linked Challan:', JSON.stringify(challan, null, 2));
} catch (e) {
    console.error(e);
} finally {
    db.close();
}
