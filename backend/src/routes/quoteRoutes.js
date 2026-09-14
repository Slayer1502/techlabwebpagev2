const express = require("express");
const router = express.Router();
const quoteController = require("../controllers/quoteController");
const { authRequired } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const uploadsDir = path.join(__dirname, "../../../uploads");
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `sq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`),
});
const uploadPdf = multer({
  storage: pdfStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || /\.pdf$/i.test(file.originalname || "")) return cb(null, true);
    cb(new Error("Only PDF files are allowed"));
  },
});

router.get("/sales/quotes", authRequired(["sales", "admin"]), quoteController.getQuotes);
router.get("/sales/quotes/:id", authRequired(["sales", "admin"]), quoteController.getQuoteDetail);
router.get("/sales/service-requests/:id/supplier-quotes", authRequired(["sales", "admin"]), quoteController.getSupplierQuotesForService);
router.post("/sales/service-requests/:id/supplier-quote", authRequired(["sales", "admin"]), quoteController.createSupplierQuoteForService);
router.post("/sales/quotes", authRequired(["sales", "admin"]), quoteController.createQuote);
router.post("/sales/quotes/:id/approve", authRequired(["sales", "admin"]), quoteController.approveQuote);
router.post("/sales/quotes/:id/reject", authRequired(["sales", "admin"]), quoteController.rejectQuote);
router.delete("/sales/quotes/:id", authRequired(["sales", "admin"]), quoteController.deleteQuote);
router.post("/sales/quotes/:id/upload", authRequired(["sales", "admin"]), uploadPdf.single("pdf"), quoteController.uploadQuotePdfToQuote);
router.post("/sales/quotes/upload", authRequired(["sales", "admin"]), uploadPdf.single("pdf"), quoteController.uploadQuotePdf);
router.get("/sales/quotes/:id/pdf", authRequired(["sales", "admin"]), quoteController.downloadQuotePdf);

module.exports = router;
