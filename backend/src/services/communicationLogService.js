const { db, nowIso } = require("../../db");
const { makeId } = require("../../db");

const logCommunication = ({ entityType, entityId, channel, direction, subject, body, user }) => {
  const id = makeId("comm");
  db.prepare(
    `INSERT INTO communication_log (id, entity_type, entity_id, channel, direction, subject, body, sent_by, sent_by_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    entityType,
    entityId,
    channel || "note",
    direction || "outgoing",
    subject || null,
    body || null,
    user?.id || null,
    user?.name || null,
    nowIso()
  );
  return getById(id);
};

const getById = (id) => db.prepare("SELECT * FROM communication_log WHERE id = ?").get(id);

const listForEntity = ({ entityType, entityId, limit = 100 }) => {
  return db.prepare(
    `SELECT * FROM communication_log
     WHERE entity_type = ? AND entity_id = ?
     ORDER BY created_at DESC
     LIMIT ?`
  ).all(entityType, entityId, limit);
};

const listByMobile = (mobile, limit = 100) => {
  if (!mobile) return [];
  return db.prepare(
    `SELECT * FROM communication_log
     WHERE entity_id = ? OR entity_type = 'party' AND entity_id IN (
       SELECT id FROM parties WHERE mobile = ?
     )
     ORDER BY created_at DESC
     LIMIT ?`
  ).all(mobile, mobile, mobile);
};

const removeCommunication = (id) => {
  db.prepare("DELETE FROM communication_log WHERE id = ?").run(id);
};

module.exports = { logCommunication, listForEntity, listByMobile, removeCommunication };
