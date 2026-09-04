const express = require("express");
const router = express.Router();
const challanController = require("../controllers/challanController");
const { authRequired } = require("../middleware/auth");

router.use("/sales/challans", authRequired(["sales", "admin"]));

router.get("/sales/challans", challanController.getChallans);
router.post("/sales/challans", challanController.createChallan);
router.post("/sales/challans/standalone", challanController.createStandaloneChallan);
router.post("/sales/challans/consolidate-to-bill", challanController.consolidateToBill);
router.post("/sales/challans/:id/return-items", challanController.returnChallanItems);
router.get("/sales/challans/:id", challanController.getChallanDetail);

module.exports = router;
