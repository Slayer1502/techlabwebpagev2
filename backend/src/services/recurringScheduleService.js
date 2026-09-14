const { db, nowIso } = require("../../db");
const { makeId } = require("../../db");

const getTechnicianName = (technicianId) => {
  if (!technicianId) return null;
  const tech = db.prepare("SELECT name FROM users WHERE id = ? AND role = ?").get(technicianId, "technician");
  return tech ? tech.name : null;
};

const createSchedule = ({ serviceRequestId, customerName, customerMobile, deviceType, description, frequency, amount, startDate, endDate, technicianId, nextDueDate, user }) => {
  const id = makeId("recur");
  db.prepare(
    `INSERT INTO recurring_schedules (id, service_request_id, customer_name, customer_mobile, device_type, description, frequency, amount, start_date, end_date, technician_id, technician_name, next_due_date, active, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
  ).run(
    id,
    serviceRequestId || null,
    customerName || null,
    customerMobile || null,
    deviceType || null,
    description || null,
    frequency || "quarterly",
    amount != null ? Number(amount) || 0 : 0,
    startDate || null,
    endDate || null,
    technicianId || null,
    getTechnicianName(technicianId),
    nextDueDate || addMonths(nowIso().slice(0, 10), 3),
    user?.id || null,
    nowIso()
  );
  return getById(id);
};

const addMonths = (dateStr, months) => {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
};

const nextDueFromFrequency = (frequency, fromDate) => {
  const base = fromDate || nowIso().slice(0, 10);
  switch (frequency) {
    case "weekly": return addMonths(base, 0);
    case "monthly": return addMonths(base, 1);
    case "quarterly": return addMonths(base, 3);
    case "half-yearly": return addMonths(base, 6);
    case "yearly": return addMonths(base, 12);
    default: return addMonths(base, 3);
  }
};

const getById = (id) => db.prepare("SELECT * FROM recurring_schedules WHERE id = ?").get(id);

const listSchedules = ({ active = null, customerMobile, page = 1, limit = 100 }) => {
  const where = [];
  const params = [];
  if (active !== null) { where.push("active = ?"); params.push(active ? 1 : 0); }
  if (customerMobile) { where.push("customer_mobile = ?"); params.push(customerMobile); }
  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
  const offset = (page - 1) * limit;
  const schedules = db.prepare(`SELECT * FROM recurring_schedules ${whereSql} ORDER BY next_due_date ASC LIMIT ? OFFSET ?`).all(...params, limit, offset);
  return schedules;
};

const updateSchedule = (id, updates) => {
  const existing = getById(id);
  if (!existing) return null;
  const okFields = ["frequency", "next_due_date", "device_type", "description", "active", "customer_name", "customer_mobile", "start_date", "end_date", "technician_id"];
  const sets = [];
  const params = [];
  for (const f of okFields) {
    if (updates[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(typeof updates[f] === "boolean" ? (updates[f] ? 1 : 0) : updates[f]);
    }
  }
  if (updates.technician_id !== undefined) {
    sets.push("technician_name = ?");
    params.push(getTechnicianName(updates.technician_id));
  }
  if (updates.amount !== undefined) {
    sets.push("amount = ?");
    params.push(Number(updates.amount) || 0);
  }
  if (sets.length) {
    params.push(id);
    db.prepare(`UPDATE recurring_schedules SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  }
  return getById(id);
};

const markCompleted = (id, completedDate) => {
  const existing = getById(id);
  if (!existing) return null;
  const completed = completedDate || nowIso().slice(0, 10);
  const next = nextDueFromFrequency(existing.frequency, completed);
  db.prepare("UPDATE recurring_schedules SET last_completed = ?, next_due_date = ?, visits_completed = visits_completed + 1 WHERE id = ?").run(completed, next, id);
  return getById(id);
};

const deleteSchedule = (id) => {
  db.prepare("DELETE FROM recurring_schedules WHERE id = ?").run(id);
};

const getDueSchedules = () => {
  const today = nowIso().slice(0, 10);
  return db.prepare("SELECT * FROM recurring_schedules WHERE active = 1 AND next_due_date <= ? ORDER BY next_due_date ASC").all(today);
};

module.exports = {
  createSchedule,
  getById,
  listSchedules,
  updateSchedule,
  markCompleted,
  deleteSchedule,
  getDueSchedules,
  nextDueFromFrequency,
};
