const settingsService = require("../services/settingsService");

const getBusiness = async (req, res) => {
  const settings = settingsService.getBusinessSettings();
  res.json({ settings });
};

const updateBusiness = async (req, res) => {
  settingsService.updateBusinessSettings(req.body);
  res.json({ message: "Business settings updated" });
};

const getBankAccounts = async (req, res) => {
  const accounts = settingsService.getBankAccounts();
  res.json({ accounts });
};

const createBankAccount = async (req, res) => {
  const { bankName, accountHolder, accountNumber, ifsc } = req.body || {};
  if (!bankName || !accountHolder || !accountNumber || !ifsc) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const id = settingsService.createBankAccount(req.body);
  res.json({ message: "Bank account added", id });
};

const toggleBankQr = async (req, res) => {
  const showQr = (req.body && req.body.showQr !== undefined) ? req.body.showQr : undefined;
  settingsService.toggleBankQr(req.params.id, showQr);
  res.json({ message: "QR printing preference updated" });
};

const deleteBankAccount = async (req, res) => {
  settingsService.deleteBankAccount(req.params.id);
  res.json({ message: "Bank account deleted" });
};

const setPrimaryBankAccount = async (req, res) => {
  settingsService.setPrimaryBankAccount(req.params.id);
  res.json({ message: "Primary bank account updated" });
};

module.exports = {
  getBusiness,
  updateBusiness,
  getBankAccounts,
  createBankAccount,
  toggleBankQr,
  deleteBankAccount,
  setPrimaryBankAccount
};
