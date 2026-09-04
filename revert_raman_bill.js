const Database = require('better-sqlite3');
const db = new Database('techlab_v2.sqlite');

const orderId = '260822-001';

try {
    const revert = db.transaction(() => {
        // 1. Unlink and reset DCs
        db.prepare("UPDATE delivery_challans SET billing_status = 'pending', linked_order_id = NULL WHERE linked_order_id = ?").run(orderId);

        // 2. Remove items
        db.prepare("DELETE FROM order_items WHERE order_id = ?").run(orderId);

        // 3. Remove order
        db.prepare("DELETE FROM product_orders WHERE id = ?").run(orderId);
    });

    revert();
    console.log("Successfully reverted Raman's bill " + orderId + " and restored DCs.");
} catch (e) {
    console.error(e.message);
} finally {
    db.close();
}
