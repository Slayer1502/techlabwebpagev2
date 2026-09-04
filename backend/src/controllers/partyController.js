const partyService = require("../services/partyService");

const getParties = async (req, res) => {
  const data = partyService.getParties(req.query.type);
  res.json(data);
};

const getCustomers = async (req, res) => {
    const customers = partyService.getCustomers();
    res.json({ customers });
};

const createCustomer = async (req, res) => {
    const { name, mobile } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ error: "Name and mobile required" });
    }
    const customer = partyService.createCustomer(req.body);
    res.json({ message: "Customer added", customer });
};

const getPartyDetail = async (req, res) => {
  const data = partyService.getPartyDetail(req.params.id);
  if (!data) return res.status(404).json({ error: "Party not found" });
  res.json(data);
};

const createParty = async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  try {
    const id = partyService.createParty(req.body);
    res.status(201).json({ message: "Party created", id });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: "A party with this mobile already exists" });
    throw e;
  }
};

const updateParty = async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Name is required" });
  }
  try {
    partyService.updateParty(req.params.id, req.body);
    res.json({ message: "Party updated and records cascaded" });
  } catch (e) {
    if (e.message === "Party not found") return res.status(404).json({ error: e.message });
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: "A party with this mobile already exists" });
    throw e;
  }
};

const deleteParty = async (req, res) => {
    partyService.deleteParty(req.params.id);
    res.json({ message: "Party deleted" });
};

module.exports = {
  getParties,
  getCustomers,
  createCustomer,
  getPartyDetail,
  createParty,
  updateParty,
  deleteParty
};
