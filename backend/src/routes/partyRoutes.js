const express = require("express");
const router = express.Router();
const partyController = require("../controllers/partyController");
const { authRequired } = require("../middleware/auth");

router.get("/parties", authRequired(["sales", "admin"]), partyController.getParties);
router.get("/sales/customers", authRequired(["sales", "admin"]), partyController.getCustomers);
router.post("/sales/customers", authRequired(["sales", "admin"]), partyController.createCustomer);
router.get("/parties/:id", authRequired(["sales", "admin"]), partyController.getPartyDetail);
router.post("/parties", authRequired(["sales", "admin"]), partyController.createParty);
router.patch("/parties/:id", authRequired(["sales", "admin"]), partyController.updateParty);
router.delete("/parties/:id", authRequired(["sales", "admin"]), partyController.deleteParty);

module.exports = router;
