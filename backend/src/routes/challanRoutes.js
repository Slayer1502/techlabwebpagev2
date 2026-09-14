const express = require("express");
const router = express.Router();
const challanController = require("../controllers/challanController");
const { authRequired } = require("../middleware/auth");

router.get("/sales/challans", authRequired(["sales", "admin"]), challanController.getChallans);
router.post("/sales/challans", authRequired(["sales", "admin"]), challanController.createChallan);
router.post("/sales/challans/standalone", authRequired(["sales", "admin"]), challanController.createStandaloneChallan);
router.post("/sales/challans/consolidate-to-bill", authRequired(["sales", "admin"]), challanController.consolidateToBill);
router.post("/sales/challans/:id/return-items", authRequired(["sales", "admin"]), challanController.returnChallanItems);
router.post("/sales/challans/:id/mark-delivered", authRequired(["sales", "admin"]), challanController.markDelivered);
router.post("/sales/challans/:id/void", authRequired(["sales", "admin"]), challanController.voidChallan);
router.get("/sales/challans/:id", authRequired(["sales", "admin"]), challanController.getChallanDetail);

module.exports = router;
