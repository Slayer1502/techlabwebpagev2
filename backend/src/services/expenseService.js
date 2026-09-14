const { db, nowIso } = require("../../db");
const { makeId } = require("../../db");

const createExpense = ({ category, description, amount, paidTo, paymentMode, receiptUrl, relatedServiceId, relatedOrderId, expenseDate, user }) => {
  const id = makeId("expense");
  db.prepare(
    `INSERT INTO expenses (id, category, description, amount, paid_to, payment_mode, receipt_url, related_service_id, related_order_id, recorded_by, recorded_by_name, expense_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    category,
    description || null,
    amount,
    paidTo || null,
    paymentMode || "Cash",
    receiptUrl || null,
    relatedServiceId || null,
    relatedOrderId || null,
    user?.id || null,
    user?.name || null,
    expenseDate || nowIso().slice(0, 10),
    nowIso()
  );
  return getExpense(id);
};

const updateExpense = (id, updates) => {
  const existing = getExpense(id);
  if (!existing) return null;
  const okFields = ["category", "description", "amount", "paid_to", "payment_mode", "receipt_url", "related_service_id", "related_order_id", "expense_date"];
  const sets = [];
  const params = [];
  for (const f of okFields) {
    if (updates[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(updates[f]);
    }
  }
  if (sets.length) {
    params.push(id);
    db.prepare(`UPDATE expenses SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }
  return getExpense(id);
};

const deleteExpense = (id) => {
  db.prepare("DELETE FROM expenses WHERE id = ?").run(id);
};

const getExpense = (id) => db.prepare("SELECT * FROM expenses WHERE id = ?").get(id);

const listExpenses = ({ category, dateFrom, dateTo, search, page = 1, limit = 50 }) => {
  const where = [];
  const params = [];
  if (category) { where.push("category = ?"); params.push(category); }
  if (dateFrom) { where.push("expense_date >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("expense_date <= ?"); params.push(dateTo); }
  if (search) {
    where.push("(description LIKE ? OR paid_to LIKE ? OR category LIKE ?)");
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
  const offset = (page - 1) * limit;
  const total = db.prepare(`SELECT COUNT(*) as c FROM expenses ${whereSql}`).get(...params).c;
  const expenses = db.prepare(`SELECT * FROM expenses ${whereSql} ORDER BY expense_date DESC, created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return { expenses, total, page, limit };
};

const getSummary = ({ dateFrom, dateTo }) => {
  const where = [];
  const params = [];
  if (dateFrom) { where.push("expense_date >= ?"); params.push(dateFrom); }
  if (dateTo) { where.push("expense_date <= ?"); params.push(dateTo); }
  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
  const byCategory = db.prepare(`SELECT category, SUM(amount) as total, COUNT(*) as count FROM expenses ${whereSql} GROUP BY category ORDER BY total DESC`).all(...params);
  const total = byCategory.reduce((s, c) => s + Number(c.total || 0), 0);
  return { total, byCategory };
};

module.exports = { createExpense, updateExpense, deleteExpense, getExpense, listExpenses, getSummary };
