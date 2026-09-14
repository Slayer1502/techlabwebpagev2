const { db, nowIso } = require("../../db");

const reportLocation = ({ requestId, lat, lng, accuracy, note }) => {
  const reqRow = db.prepare("SELECT id FROM service_requests WHERE id = ?").get(requestId);
  if (!reqRow) return null;
  const location = JSON.stringify({
    lat,
    lng,
    accuracy: accuracy || null,
    note: note || null,
    timestamp: nowIso(),
  });
  db.prepare("UPDATE service_requests SET technician_location = ? WHERE id = ?").run(location, requestId);
  return getLocation(requestId);
};

const getLocation = (requestId) => {
  const row = db.prepare("SELECT technician_location, scheduled_date, customer_address FROM service_requests WHERE id = ?").get(requestId);
  if (!row) return null;
  let parsed = null;
  try { parsed = row.technician_location ? JSON.parse(row.technician_location) : null; } catch (e) { parsed = null; }
  return { requestId, location: parsed, scheduledDate: row.scheduled_date, customerAddress: row.customer_address };
};

module.exports = { reportLocation, getLocation };
