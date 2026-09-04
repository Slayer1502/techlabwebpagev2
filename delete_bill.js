const Database = require('better-sqlite3');
const db = new Database('techlab_v2.sqlite');

const orderId = '260816-001';

try {
    const perform = db.transaction(() => {
        // 1. Delete order items
        const itemRes = db.prepare("DELETE FROM order_items WHERE order_id = ?").run(orderId);
        console.log(`Deleted ${itemRes.changes} items.`);

        // 2. Reset the linked Delivery Challan
        const dcRes = db.prepare("UPDATE delivery_challans SET billing_status = 'pending', linked_order_id = NULL WHERE linked_order_id = ?").run(orderId);
        console.log(`Reset ${dcRes.changes} Delivery Challans to pending.`);

        // 3. Delete the order
        const orderRes = db.prepare("DELETE FROM product_orders WHERE id = ?").run(orderId);
        console.log(`Deleted order ${orderId}: ${orderRes.changes} change(s).`);
    });

    perform();
    console.log("Deletion and Reset successful.");

} catch (e) {
    console.error("FAILED:", e.message);
} finally {
    db.close();
}
