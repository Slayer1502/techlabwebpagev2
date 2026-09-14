const auditService = require("../services/auditService");
const { log } = require("../services/auditService");

const getAuditLogs = async (req, res) => {
  try {
    const result = auditService.auditPage(req);
    res.json({
      logs: result.logs.map((l) => ({
        ...l,
        old_value: l.old_value ? safeParse(l.old_value) : null,
        new_value: l.new_value ? safeParse(l.new_value) : null,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const safeParse = (s) => {
  try { return JSON.parse(s); } catch (e) { return s; }
};

module.exports = { getAuditLogs };
