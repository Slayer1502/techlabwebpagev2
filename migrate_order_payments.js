const Database = require('better-sqlite3');
const path = require('path');
const db = new Database('techlab_v2.sqlite');

try {
    // 1. Ensure table exists (just in case initializeDatabase hasn't run)
    db.exec(`
        CREATE TABLE IF NOT EXISTS order_payments (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL,
            amount INTEGER NOT NULL DEFAULT 0,
            payment_mode TEXT,
            paid_at TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(order_id) REFERENCES product_orders(id)
        )
    `);

    // 2. Find all orders marked as 'paid' that don't have a payment record yet
    const paidOrders = db.prepare(`
        SELECT * FROM product_orders
        WHERE payment_status = 'paid'
        AND id NOT IN (SELECT order_id FROM order_payments)
    `).all();

    console.log(`Migrating ${paidOrders.length} paid orders to order_payments table...`);

    const insertPayment = db.prepare(`
        INSERT INTO order_payments (id, order_id, amount, payment_mode, paid_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const migrate = db.transaction(() => {
        for (const order of paidOrders) {
            const paymentId = 'pay_' + Math.random().toString(36).substr(2, 9);
            const paidAt = order.payment_date || order.created_at;
            insertPayment.run(paymentId, order.id, order.total_amount, order.payment_mode || 'Cash', paidAt, order.created_at);
        }
    });

    migrate();
    console.log("Migration successful.");
} catch (e) {
    console.error("Migration failed:", e.message);
} finally {
    db.close();
}
