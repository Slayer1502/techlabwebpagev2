const { db } = require("../../db");

const getAnalyticsData = () => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }

  const revenue = months.map(m => {
    const sales = db.prepare("SELECT SUM(total_amount) as t FROM product_orders WHERE created_at LIKE ? AND status != 'Cancelled'").get(`${m}%`).t || 0;
    const services = db.prepare("SELECT SUM(bill_amount) as t FROM service_requests WHERE (bill_date LIKE ? OR (bill_date IS NULL AND created_at LIKE ?)) AND bill_status = 'billed'").get(`${m}%`, `${m}%`).t || 0;
    return { month: m, sales, services };
  });

  const techPerf = db.prepare(`
    SELECT service_person as name, COUNT(*) as count
    FROM service_requests
    WHERE status = 'Completed' AND service_person IS NOT NULL AND service_person != ''
    GROUP BY service_person
    ORDER BY count DESC
    LIMIT 10
  `).all();

  const inventory = db.prepare(`
    SELECT type, SUM(stock) as stock
    FROM products
    WHERE active = 1
    GROUP BY type
    ORDER BY stock DESC
  `).all();

  return { revenue, techPerf, inventory };
};

module.exports = {
  getAnalyticsData
};
