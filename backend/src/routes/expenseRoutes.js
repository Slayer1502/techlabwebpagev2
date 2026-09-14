const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const { authRequired } = require("../middleware/auth");
const { getFuelPrices } = require("../services/fuelPriceService");
const { getBusinessSettings } = require("../services/settingsService");

router.get("/admin/expenses", authRequired(["admin", "sales", "auditor"]), expenseController.listExpenses);
router.post("/admin/expenses", authRequired(["admin", "sales"]), expenseController.createExpense);
router.get("/admin/expenses/summary", authRequired(["admin", "sales", "auditor"]), expenseController.getSummary);

router.get("/admin/fuel-prices", authRequired(["admin", "sales", "auditor"]), async (req, res) => {
  try {
    const settings = getBusinessSettings();
    const city = req.query.city || settings.fuel_city || "Karur";
    const prices = await getFuelPrices(city);
    res.json({ city, ...prices });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch fuel prices" });
  }
});

router.get("/admin/expenses/:id", authRequired(["admin", "sales", "auditor"]), expenseController.getExpense);
router.patch("/admin/expenses/:id", authRequired(["admin", "sales"]), expenseController.updateExpense);
router.delete("/admin/expenses/:id", authRequired(["admin", "sales"]), expenseController.deleteExpense);

module.exports = router;
