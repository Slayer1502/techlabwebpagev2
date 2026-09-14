const express = require("express");
const router = express.Router();
const quotationVersionController = require("../controllers/quotationVersionController");
const { authRequired } = require("../middleware/auth");

router.get("/sales/quotations/:id/versions", authRequired(["sales", "admin"]), quotationVersionController.listVersions);
router.get("/sales/quotations/:id/versions/:version", authRequired(["sales", "admin"]), quotationVersionController.getVersion);
router.post("/sales/quotations/:id/versions", authRequired(["sales", "admin"]), quotationVersionController.snapshot);

module.exports = router;
