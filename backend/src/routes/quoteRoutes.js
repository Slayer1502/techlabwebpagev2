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

router.use("/sales", authRequired(["sales", "admin"]));

router.get("/sales/quotes", quoteController.getQuotes);
router.get("/sales/quotes/:id", quoteController.getQuoteDetail);
router.post("/sales/quotes", quoteController.createQuote);
router.post("/sales/quotes/:id/approve", quoteController.approveQuote);
router.post("/sales/quotes/:id/reject", quoteController.rejectQuote);
router.delete("/sales/quotes/:id", quoteController.deleteQuote);
router.post("/sales/quotes/upload", uploadPdf.single("pdf"), quoteController.uploadQuotePdf);
router.get("/sales/quotes/:id/pdf", quoteController.downloadQuotePdf);

module.exports = router;
