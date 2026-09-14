const { db, nowIso } = require("../../db");
const { makeId } = require("../../db");

const log = ({ userId, userName, userRole, action, entityType, entityId, oldValue, newValue, ipAddress }) => {
  try {
    db.prepare(
      `INSERT INTO audit_logs (id, user_id, user_name, user_role, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      makeId("audit"),
      userId || null,
      userName || null,
      userRole || null,
      action,
      entityType,
      entityId || null,
      oldValue != null ? JSON.stringify(oldValue) : null,
      newValue != null ? JSON.stringify(newValue) : null,
      ipAddress || null,
      nowIso()
    );
  } catch (e) {
    console.error("Audit log write failed:", e.message);
  }
};

const auditPage = (req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];

  if (req.query.entityType) { where.push("entity_type = ?"); params.push(req.query.entityType); }
  if (req.query.entityId) { where.push("entity_id = ?"); params.push(req.query.entityId); }
  if (req.query.userId) { where.push("user_id = ?"); params.push(req.query.userId); }
  if (req.query.action) { where.push("action = ?"); params.push(req.query.action); }
  if (req.query.dateFrom) { where.push("created_at >= ?"); params.push(req.query.dateFrom); }
  if (req.query.dateTo) { where.push("created_at <= ?"); params.push(req.query.dateTo); }

  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
  const total = db.prepare(`SELECT COUNT(*) as c FROM audit_logs ${whereSql}`).get(...params).c;
  const logs = db.prepare(
    `SELECT * FROM audit_logs ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { logs, total, page, limit };
};

module.exports = { log, auditPage };
