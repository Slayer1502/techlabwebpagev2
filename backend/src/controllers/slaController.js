const slaService = require("../services/slaService");

const getSlaStatus = async (req, res) => {
  try {
    slaService.checkBreaches();
    const result = slaService.getSlaStatus(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSlaDefinitions = async (req, res) => {
  try {
    res.json({ definitions: slaService.getSlaDefinitions() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const upsertSlaDefinition = async (req, res) => {
  try {
    const def = slaService.upsertSlaDefinition(req.body);
    res.json({ definition: def });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getSlaStatus, getSlaDefinitions, upsertSlaDefinition };
