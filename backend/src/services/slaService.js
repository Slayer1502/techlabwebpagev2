const { db } = require("../../db");

const getSlaForDeviceType = (deviceType) => {
  const row = db.prepare(
    "SELECT * FROM sla_definitions WHERE (device_type = ? OR device_type = 'General Support') AND active = 1 ORDER BY (device_type = ?) DESC LIMIT 1"
  ).get(deviceType, deviceType);
  return row || db.prepare("SELECT * FROM sla_definitions WHERE device_type = 'General Support' LIMIT 1").get() || {
    response_hours: 48,
    resolution_hours: 120,
  };
};

const addHours = (dateStr, hours) => {
  const d = new Date(dateStr);
  if (isNaN(d)) d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
};

const calculateDeadlines = ({ deviceType, createdAt }) => {
  const sla = getSlaForDeviceType(deviceType);
  const created = createdAt || new Date().toISOString();
  return {
    slaTypeId: sla.id,
    response_hours: sla.response_hours,
    resolution_hours: sla.resolution_hours,
    slaResponseDeadline: addHours(created, sla.response_hours),
    slaResolutionDeadline: addHours(created, sla.resolution_hours),
  };
};

const applySlaOnCreate = (id, { deviceType, createdAt }) => {
  try {
    const d = calculateDeadlines({ deviceType, createdAt });
    db.prepare(
      "UPDATE service_requests SET sla_response_deadline = ?, sla_resolution_deadline = ? WHERE id = ?"
    ).run(d.slaResponseDeadline, d.slaResolutionDeadline, id);
    return d;
  } catch (e) {
    console.error("SLA apply failed:", e.message);
    return null;
  }
};

const checkBreaches = () => {
  const nowIso = new Date().toISOString();
  const result = db.prepare(
    `UPDATE service_requests
     SET sla_breached = 1
     WHERE sla_breached = 0 AND status NOT IN ('Completed', 'Cancelled', 'Canceled')
       AND (sla_response_deadline IS NOT NULL AND sla_response_deadline < ?)`
  ).run(nowIso);
  return result.changes;
};

const getSlaStatus = ({ status = "all", deviceType } = {}) => {
  const nowIso = new Date().toISOString();
  const where = [];
  const params = [];
  if (deviceType) { where.push("device_type = ?"); params.push(deviceType); }
  if (status === "open") { where.push("status NOT IN ('Completed','Cancelled','Canceled')"); }
  if (status === "breached") { where.push("sla_breached = 1"); }
  if (status === "at-risk") {
    where.push("status NOT IN ('Completed','Cancelled','Canceled') AND sla_breached = 0 AND sla_resolution_deadline IS NOT NULL AND sla_resolution_deadline < ?");
    params.push(new Date(Date.now() + 24 * 3600 * 1000).toISOString());
  }
  if (status === "ontrack") { where.push("status NOT IN ('Completed','Cancelled','Canceled') AND sla_breached = 0 AND (sla_resolution_deadline IS NULL OR sla_resolution_deadline >= ?)"); params.push(nowIso); }
  const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";

  const rows = db.prepare(`SELECT * FROM service_requests ${whereSql} ORDER BY sla_resolution_deadline ASC LIMIT 500`).all(...params);
  const summary = {
    open: db.prepare("SELECT COUNT(*) as c FROM service_requests WHERE status NOT IN ('Completed','Cancelled','Canceled')").get().c,
    breached: db.prepare("SELECT COUNT(*) as c FROM service_requests WHERE sla_breached = 1 AND status NOT IN ('Completed','Cancelled','Canceled')").get().c,
    atRisk: db.prepare("SELECT COUNT(*) as c FROM service_requests WHERE status NOT IN ('Completed','Cancelled','Canceled') AND sla_breached = 0 AND sla_resolution_deadline IS NOT NULL AND sla_resolution_deadline < ?").get(new Date(Date.now() + 24 * 3600 * 1000).toISOString()).c,
    onTrack: db.prepare("SELECT COUNT(*) as c FROM service_requests WHERE status NOT IN ('Completed','Cancelled','Canceled') AND sla_breached = 0 AND (sla_resolution_deadline IS NULL OR sla_resolution_deadline >= ?)").get(nowIso).c,
    total: db.prepare("SELECT COUNT(*) as c FROM service_requests").get().c,
  };
  return { status, requests: rows, summary };
};

const getSlaDefinitions = () => db.prepare("SELECT * FROM sla_definitions ORDER BY active DESC, device_type ASC").all();

const upsertSlaDefinition = ({ id, deviceType, responseHours, resolutionHours, active }) => {
  if (id) {
    db.prepare("UPDATE sla_definitions SET device_type = ?, response_hours = ?, resolution_hours = ?, active = ? WHERE id = ?")
      .run(deviceType, responseHours, resolutionHours, active ? 1 : 0, id);
    return db.prepare("SELECT * FROM sla_definitions WHERE id = ?").get(id);
  }
  const newId = `sla-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare("INSERT INTO sla_definitions (id, device_type, response_hours, resolution_hours, active, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(newId, deviceType, responseHours, resolutionHours, active ? 1 : 0, new Date().toISOString());
  return db.prepare("SELECT * FROM sla_definitions WHERE id = ?").get(newId);
};

module.exports = {
  getSlaForDeviceType,
  calculateDeadlines,
  applySlaOnCreate,
  checkBreaches,
  getSlaStatus,
  getSlaDefinitions,
  upsertSlaDefinition,
  addHours,
};
