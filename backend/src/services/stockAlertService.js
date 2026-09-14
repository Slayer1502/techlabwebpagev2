const { db, nowIso } = require("../../db");
const { makeId } = require("../../db");
const { broadcastToRole } = require("../ws");

const scanForAlerts = () => {
  let created = 0;
  const newAlerts = [];

  const lowStock = db.prepare(
    "SELECT id, name, stock, loose_stock, min_stock, unit_type FROM products WHERE active = 1 AND type != 'Service'"
  ).all();

  for (const p of lowStock) {
    const effective = (p.unit_type === 'measurement' && p.loose_stock > 0) ? (p.min_stock || 0) : (p.stock || 0);
    const threshold = p.min_stock || 0;
    const isLow = (p.unit_type === 'measurement') ? ((p.stock || 0) <= threshold) : ((p.stock || 0) <= threshold);

    if (isLow) {
      const existing = db.prepare(
        "SELECT id, current_stock, dismissed_at FROM stock_alerts WHERE product_id = ? AND alert_type = 'low_stock' AND active = 1"
      ).get(p.id);
      if (existing && !existing.dismissed_at) {
        if (existing.current_stock !== p.stock) {
          db.prepare("UPDATE stock_alerts SET current_stock = ? WHERE id = ?").run(p.stock || 0, existing.id);
        }
        continue;
      }
      const id = makeId("alert");
      db.prepare(
        `INSERT INTO stock_alerts (id, product_id, alert_type, threshold, current_stock, active, dismissed_at, last_notified, created_at)
         VALUES (?, ?, 'low_stock', ?, ?, 1, NULL, ?, ?)`
      ).run(id, p.id, threshold, p.stock || 0, nowIso(), nowIso());
      created++;
      newAlerts.push({ id, product_id: p.id, product_name: p.name, threshold, current_stock: p.stock || 0 });
    } else {
      db.prepare("DELETE FROM stock_alerts WHERE product_id = ? AND alert_type = 'low_stock' AND active = 1").run(p.id);
    }
  }

  if (newAlerts.length) {
    broadcastToRole("admin", "stock-alert", { alerts: newAlerts });
    broadcastToRole("sales", "stock-alert", { alerts: newAlerts });
  }

  return { created, alerts: newAlerts };
};

const getAlerts = ({ active = true } = {}) => {
  const rows = db.prepare(
    `SELECT sa.*, p.name as product_name, p.stock, p.min_stock, p.unit_type
     FROM stock_alerts sa JOIN products p ON p.id = sa.product_id
     WHERE sa.alert_type = 'low_stock'
     ORDER BY sa.created_at DESC LIMIT 200`
  ).all();
  const filtered = active ? rows.filter(r => r.active === 1 && !r.dismissed_at) : rows;
  return filtered;
};

const dismissAlert = (id) => {
  db.prepare("UPDATE stock_alerts SET active = 0, dismissed_at = ? WHERE id = ?").run(nowIso(), id);
};

module.exports = { scanForAlerts, getAlerts, dismissAlert };
