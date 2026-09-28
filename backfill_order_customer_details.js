// Backfill customer_gstin column + fill address/gstin on all existing orders from parties
const path = require("path");
const Database = require("better-sqlite3");
const db = new Database(path.join(__dirname, "techlab_v2.sqlite"));

const hasCol = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='product_orders'").get();
const cols = hasCol ? db.prepare("PRAGMA table_info(product_orders)").all().map(c => c.name) : [];
if (!cols.includes("customer_gstin")) {
  db.prepare("ALTER TABLE product_orders ADD COLUMN customer_gstin TEXT").run();
  console.log("Added customer_gstin column");
}

const orders = db.prepare(`
  SELECT id, customer_name, customer_mobile, customer_address, customer_gstin
  FROM product_orders
  ORDER BY created_at
`).all();

let updated = 0;
for (const o of orders) {
  const party = o.customer_mobile
    ? db.prepare("SELECT address, gst_number FROM parties WHERE mobile = ? AND is_customer = 1 ORDER BY created_at DESC LIMIT 1").get(o.customer_mobile)
    : db.prepare("SELECT address, gst_number FROM parties WHERE name = ? AND is_customer = 1 ORDER BY created_at DESC LIMIT 1").get(o.customer_name);
  if (!party) continue;
  db.prepare(`
    UPDATE product_orders
    SET customer_address = COALESCE(NULLIF(?, ''), customer_address),
        customer_gstin   = COALESCE(?, customer_gstin)
    WHERE id = ?
  `).run(party.address || "", party.gst_number || null, o.id);
  updated++;
}

console.log("Backfilled", updated, "orders (customer_address / customer_gstin)");
db.close();