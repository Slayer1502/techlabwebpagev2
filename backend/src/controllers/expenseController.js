const expenseService = require("../services/expenseService");
const auditService = require("../services/auditService");

const createExpense = async (req, res) => {
  try {
    const expense = expenseService.createExpense({ ...req.body, user: req.user });
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "CREATE expense", entityType: "expense", entityId: expense.id,
      newValue: req.body, ipAddress: req.ip,
    });
    res.json({ expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const listExpenses = async (req, res) => {
  try {
    const result = expenseService.listExpenses(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getExpense = async (req, res) => {
  try {
    const expense = expenseService.getExpense(req.params.id);
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    res.json({ expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = expenseService.updateExpense(req.params.id, req.body);
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "UPDATE expense", entityType: "expense", entityId: expense.id,
      newValue: req.body, ipAddress: req.ip,
    });
    res.json({ expense });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    expenseService.deleteExpense(req.params.id);
    auditService.log({
      userId: req.user.id, userName: req.user.name, userRole: req.user.role,
      action: "DELETE expense", entityType: "expense", entityId: req.params.id,
      ipAddress: req.ip,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const getSummary = async (req, res) => {
  try {
    res.json(expenseService.getSummary(req.query));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createExpense, listExpenses, getExpense, updateExpense, deleteExpense, getSummary };
