const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { authRequired } = require("../middleware/auth");

router.get("/settings/business", authRequired(["admin", "sales", "employee"]), settingsController.getBusiness);
router.put("/settings/business", authRequired(["admin"]), settingsController.updateBusiness);

router.get("/settings/bank-accounts", authRequired(["admin", "sales"]), settingsController.getBankAccounts);
router.post("/settings/bank-accounts", authRequired(["admin"]), settingsController.createBankAccount);
router.patch("/settings/bank-accounts/:id/toggle-qr", authRequired(["admin"]), settingsController.toggleBankQr);
router.delete("/settings/bank-accounts/:id", authRequired(["admin"]), settingsController.deleteBankAccount);
router.patch("/settings/bank-accounts/:id/primary", authRequired(["admin"]), settingsController.setPrimaryBankAccount);

module.exports = router;
