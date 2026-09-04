const express = require("express");
const router = express.Router();
const enquiryController = require("../controllers/enquiryController");
const { authRequired } = require("../middleware/auth");

router.get("/sales/enquiries", authRequired(["sales", "admin"]), enquiryController.getEnquiries);
router.post("/sales/enquiries", authRequired(["sales", "admin"]), enquiryController.createEnquiry);
router.patch("/sales/enquiries/:id", authRequired(["sales", "admin"]), enquiryController.updateEnquiry);
router.post("/sales/enquiries/:id/quote", authRequired(["sales", "admin"]), enquiryController.updateEnquiry);
router.post("/sales/enquiries/:id/confirm", authRequired(["sales", "admin"]), enquiryController.confirmEnquiry);
router.post("/sales/enquiries/:id/deliver", authRequired(["sales", "admin"]), enquiryController.deliverEnquiry);
router.delete("/sales/enquiries/:id", authRequired(["sales", "admin"]), enquiryController.deleteEnquiry);

module.exports = router;
