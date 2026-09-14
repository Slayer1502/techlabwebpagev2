const communicationLogService = require("../services/communicationLogService");

const createLog = async (req, res) => {
  try {
    const entry = communicationLogService.logCommunication({ ...req.body, user: req.user });
    res.json({ communication: entry });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listForEntity = async (req, res) => {
  try {
    const entries = communicationLogService.listForEntity({ entityType: req.params.entityType, entityId: req.params.entityId });
    res.json({ communications: entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const removeCommunication = async (req, res) => {
  try {
    communicationLogService.removeCommunication(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createLog, listForEntity, removeCommunication };
