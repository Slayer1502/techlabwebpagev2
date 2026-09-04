const express = require("express");
const router = express.Router();
const supplierController = require("../controllers/supplierController");
const { authRequired } = require("../middleware/auth");

router.get("/sales/suppliers", authRequired(["sales", "admin"]), supplierController.getSuppliers);
router.get("/sales/suppliers/:id", authRequired(["sales", "admin"]), supplierController.getSupplierDetail);
router.post("/sales/suppliers", authRequired(["sales", "admin"]), supplierController.createSupplier);
router.patch("/sales/suppliers/:id", authRequired(["sales", "admin"]), supplierController.updateSupplier);
router.delete("/sales/suppliers/:id", authRequired(["sales", "admin"]), supplierController.deleteSupplier);

router.get("/sales/purchases", authRequired(["sales", "admin"]), supplierController.getPurchases);
router.get("/sales/purchases/pending", authRequired(["sales", "admin"]), supplierController.getPendingPurchases);
router.get("/sales/suppliers/:id/purchases", authRequired(["sales", "admin"]), supplierController.getSupplierDetail);
router.post("/sales/suppliers/:id/purchases", authRequired(["sales", "admin"]), supplierController.createPurchase);
router.patch("/sales/purchases/:id/payment", authRequired(["sales", "admin"]), supplierController.updatePurchasePayment);
router.delete("/sales/purchases/:id", authRequired(["sales", "admin"]), supplierController.deletePurchase);

module.exports = router;
