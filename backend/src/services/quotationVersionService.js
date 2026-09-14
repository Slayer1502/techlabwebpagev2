const { db, nowIso } = require("../../db");
const { makeId } = require("../../db");

const snapshotQuotation = (quotationId, actorName) => {
  try {
    const quo = db.prepare("SELECT * FROM sales_quotations WHERE id = ?").get(quotationId);
    if (!quo) return null;
    const items = db.prepare("SELECT * FROM sales_quotation_items WHERE quote_id = ?").all(quotationId);

    const version = db.prepare("SELECT COALESCE(MAX(version_number), 0) as v FROM quotation_versions WHERE quote_id = ?").get(quotationId).v + 1;

    db.prepare(
      `INSERT INTO quotation_versions (id, quote_id, version_number, data_snapshot, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      makeId("qver"),
      quotationId,
      version,
      JSON.stringify({ quotation: quo, items }),
      actorName || null,
      nowIso()
    );

    db.prepare("UPDATE sales_quotations SET current_version = ? WHERE id = ?").run(version, quotationId);
    return { version, quotation: quo, items };
  } catch (e) {
    console.error("Quotation snapshot failed:", e.message);
    return null;
  }
};

const listVersions = (quotationId) => {
  return db.prepare(
    "SELECT id, version_number, created_by, created_at FROM quotation_versions WHERE quote_id = ? ORDER BY version_number DESC"
  ).all(quotationId);
};

const getVersion = (quotationId, versionNumber) => {
  const v = db.prepare(
    "SELECT * FROM quotation_versions WHERE quote_id = ? AND version_number = ?"
  ).get(quotationId, versionNumber);
  if (!v) return null;
  try { v.data_snapshot = JSON.parse(v.data_snapshot); } catch (e) { v.data_snapshot = null; }
  return v;
};

module.exports = { snapshotQuotation, listVersions, getVersion };
