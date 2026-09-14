const quotationVersionService = require("../services/quotationVersionService");

const listVersions = async (req, res) => {
  try {
    const versions = quotationVersionService.listVersions(req.params.id);
    res.json({ versions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getVersion = async (req, res) => {
  try {
    const version = quotationVersionService.getVersion(req.params.id, req.params.version);
    if (!version) return res.status(404).json({ error: "Version not found" });
    res.json({ version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const snapshot = async (req, res) => {
  try {
    const result = quotationVersionService.snapshotQuotation(req.params.id, req.user?.name);
    if (!result) return res.status(404).json({ error: "Quotation not found" });
    res.json({ version: result.version });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { listVersions, getVersion, snapshot };
