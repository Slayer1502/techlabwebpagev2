const express = require("express");
const { authRequired } = require("./middleware/auth");

const serviceRequestRoutes = require("./routes/serviceRequestRoutes");
const productRoutes = require("./routes/productRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const enquiryRoutes = require("./routes/enquiryRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const orderRoutes = require("./routes/orderRoutes");
const surveyRoutes = require("./routes/surveyRoutes");
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const reportRoutes = require("./routes/reportRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const partyRoutes = require("./routes/partyRoutes");
const purchaseOrderRoutes = require("./routes/purchaseOrderRoutes");
const quoteRoutes = require("./routes/quoteRoutes");
const salesQuotationRoutes = require("./routes/salesQuotationRoutes");
const exportRoutes = require("./routes/exportRoutes");
const appRoutes = require("./routes/appRoutes");
const challanRoutes = require("./routes/challanRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const coreRoutes = require("./routes/coreRoutes");
const auditRoutes = require("./routes/auditRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const slaRoutes = require("./routes/slaRoutes");
const stockAlertRoutes = require("./routes/stockAlertRoutes");
const recurringScheduleRoutes = require("./routes/recurringScheduleRoutes");
const communicationLogRoutes = require("./routes/communicationLogRoutes");
const splitPaymentRoutes = require("./routes/splitPaymentRoutes");
const quotationVersionRoutes = require("./routes/quotationVersionRoutes");
const locationRoutes = require("./routes/locationRoutes");

const router = express.Router();

// 1. PUBLIC ROUTES (No Auth)
router.use("/api", authRoutes);
router.use("/api", appRoutes);
router.use("/", coreRoutes);    // Health

// 2. PROTECTED ROUTES (Requires Token)
router.use("/api", serviceRequestRoutes);
router.use("/api", productRoutes);
router.use("/api", supplierRoutes);
router.use("/api", enquiryRoutes);
router.use("/api", settingsRoutes);
router.use("/api", orderRoutes);
router.use("/api", surveyRoutes);
router.use("/api", adminRoutes);
router.use("/api", pdfRoutes);
router.use("/api", reportRoutes);
router.use("/api", dashboardRoutes);
router.use("/api", partyRoutes);
router.use("/api", purchaseOrderRoutes);
router.use("/api", quoteRoutes);
router.use("/api", salesQuotationRoutes);
router.use("/api", exportRoutes);
router.use("/api", challanRoutes);
router.use("/api", analyticsRoutes);
router.use("/api", notificationRoutes);

// Phase 3: New feature routes
router.use("/api", auditRoutes);
router.use("/api", expenseRoutes);
router.use("/api", slaRoutes);
router.use("/api", stockAlertRoutes);
router.use("/api", recurringScheduleRoutes);
router.use("/api", communicationLogRoutes);
router.use("/api", splitPaymentRoutes);
router.use("/api", quotationVersionRoutes);
router.use("/api", locationRoutes);

module.exports = router;
