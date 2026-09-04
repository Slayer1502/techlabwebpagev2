const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { db, nowIso } = require("../../db");
const config = require("../../config");
const { PDF_COLORS, getBusinessSettingsMap, drawPdfHeader, drawPdfFooter, drawPdfSummaryCards, drawPdfTable } = require("../utils/pdfHelpers");
const { fetchQrCode } = require("../utils/qrHelper");
const { formatDateValue, formatCurrencyValue } = require("../utils/helpers");

const reportsDir = path.join(__dirname, "../../../reports");

const generateOrderInvoice = async (orderId) => {
  let order = db.prepare("SELECT * FROM product_orders WHERE id = ?").get(orderId);
  if (!order) {
    order = db.prepare("SELECT * FROM product_orders WHERE id LIKE ?").get(`%${orderId}`);
  }
  if (!order) {
    // Fallback: check if this is actually a Service Request!
    const serviceReq = db.prepare("SELECT * FROM service_requests WHERE id = ? OR bill_number = ?").get(orderId, orderId);
    if (serviceReq) {
      return generateServiceBill(serviceReq.id);
    }
    throw new Error(`Order or Service Request '${orderId}' not found`);
  }

  const items = db.prepare("SELECT product_name, price, hsn_code, gst_rate, taxable_amount, cgst_amount, sgst_amount, qty FROM order_items WHERE order_id = ?").all(order.id);
  const settings = getBusinessSettingsMap();

  const bizName = settings.business_name || 'TECHLAB';
  const bizAddr = settings.business_address || 'Casa Layout, Karur - 639001, TN';
  const bizPhone = settings.business_phone || '+91 94888-0-9897';
  const bizEmail = settings.business_email || 'service@techlab.in';
  const bizGstin = settings.gstin || '';

  const primaryBank = db.prepare("SELECT * FROM bank_accounts WHERE is_primary = 1 LIMIT 1").get();
  let qrBuffer = null;
  if (primaryBank && primaryBank.upi_id && primaryBank.show_qr && order.payment_status !== 'paid') {
    const upiUrl = `upi://pay?pa=${primaryBank.upi_id}&pn=${encodeURIComponent(bizName)}&am=${order.total_amount}&cu=INR`;
    qrBuffer = await fetchQrCode(upiUrl);
  }

  let reviewQrBuffer = null;
  if (settings.google_review_url) {
    reviewQrBuffer = await fetchQrCode(settings.google_review_url);
  }

  const isGst = !!order.is_gst_bill;
  const docTitle = isGst ? "TAX INVOICE" : "ESTIMATE / BILL";

  const doc = new PDFDocument({ size: "A4", margin: 48 });

  doc.fillColor(PDF_COLORS.NAVY).fontSize(24).font("Helvetica-Bold").text(bizName, 48, 50);
  doc.fillColor(PDF_COLORS.TEXT_SOFT).fontSize(9).font("Helvetica").text("Computers, Laptops, CCTV & IT Solutions", 48, 75);
  doc.text(bizAddr, 48, 87);
  doc.text(`Ph: ${bizPhone} | Email: ${bizEmail}`, 48, 99);

  if (isGst && bizGstin) {
    doc.fillColor(PDF_COLORS.TEXT).fontSize(9).font("Helvetica-Bold").text(`GSTIN: ${bizGstin}`, 48, 111);
  }

  doc.fillColor(PDF_COLORS.BLUE).fontSize(16).font("Helvetica-Bold").text(docTitle, 48, 50, { align: "right" });
  doc.fillColor(PDF_COLORS.TEXT).fontSize(10).font("Helvetica").text(`No: ${order.id.slice(-6).toUpperCase()}`, 48, 75, { align: "right" });
  doc.text(`Date: ${formatDateValue(order.created_at)}`, 48, 87, { align: "right" });

  const headerBottom = (isGst && bizGstin) ? 130 : 120;
  doc.strokeColor(PDF_COLORS.NAVY).lineWidth(2).moveTo(48, headerBottom).lineTo(547, headerBottom).stroke();

  doc.moveDown(3);
  const customerStartY = doc.y;
  doc.rect(48, customerStartY, 250, 70).fill(PDF_COLORS.LIGHT_GRAY).stroke(PDF_COLORS.GRAY);
  doc.fillColor(PDF_COLORS.NAVY).fontSize(10).font("Helvetica-Bold").text("BILL TO:", 58, customerStartY + 10);
  doc.fillColor(PDF_COLORS.TEXT).fontSize(11).text(order.customer_name, 58, customerStartY + 25);
  doc.fontSize(10).font("Helvetica").text(`Mobile: ${order.customer_mobile}`, 58, customerStartY + 40);
  if (order.customer_address) doc.fontSize(9).text(order.customer_address, 58, customerStartY + 53);

  doc.rect(305, customerStartY, 242, 70).fill(PDF_COLORS.LIGHT_GRAY).stroke(PDF_COLORS.GRAY);
  doc.fillColor(PDF_COLORS.NAVY).fontSize(10).font("Helvetica-Bold").text("ORDER DETAILS:", 315, customerStartY + 10);
  doc.fillColor(PDF_COLORS.TEXT).fontSize(9).font("Helvetica").text(`Status: ${order.status}`, 315, customerStartY + 25);
  doc.text(`Payment: ${order.payment_status === 'paid' ? 'Paid' + (order.payment_mode ? ` (${order.payment_mode})` : '') : 'Pending'}`, 315, customerStartY + 37);
  if (order.payment_mode && order.payment_date) doc.text(`Paid on: ${formatDateValue(order.payment_date)}`, 315, customerStartY + 49);

  doc.moveDown(5);
  const tableTop = doc.y;
  doc.rect(48, tableTop, 500, 25).fill(PDF_COLORS.NAVY);
  doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text("#", 58, tableTop + 8, { width: 25 });
  doc.text("Description of Goods / Services", 85, tableTop + 8, { width: 260 });
  doc.text("Qty", 345, tableTop + 8, { width: 35, align: "right" });
  doc.text("Rate", 385, tableTop + 8, { width: 65, align: "right" });
  doc.text("Amount (INR)", 457, tableTop + 8, { width: 90, align: "right" });

  let itemY = tableTop + 40;
  const pageHeight = doc.page.height - 150;

  items.forEach((it, idx) => {
    if (itemY > pageHeight) {
      doc.addPage();
      itemY = 50;
      doc.rect(48, itemY, 500, 25).fill(PDF_COLORS.NAVY);
      doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text("#", 58, itemY + 8, { width: 25 });
      doc.text("Description of Goods / Services", 85, itemY + 8, { width: 260 });
      doc.text("Qty", 345, itemY + 8, { width: 35, align: "right" });
      doc.text("Rate", 385, itemY + 8, { width: 65, align: "right" });
      doc.text("Amount (INR)", 457, itemY + 8, { width: 90, align: "right" });
      itemY += 40;
    }

    let desc = String(it.product_name || "-");
    if (isGst && it.hsn_code) desc += ` (HSN: ${it.hsn_code})`;
    const lineTotal = it.price * it.qty;

    doc.fillColor(PDF_COLORS.TEXT).fontSize(9).font("Helvetica").text(String(idx + 1), 58, itemY, { width: 25 });
    doc.text(desc, 85, itemY, { width: 260 });
    doc.text(String(it.qty), 345, itemY, { width: 35, align: "right" });
    doc.text(formatCurrencyValue(it.price).replace("Rs. ", ""), 385, itemY, { width: 65, align: "right" });
    doc.font("Helvetica-Bold").text(formatCurrencyValue(lineTotal).replace("Rs. ", ""), 457, itemY, { width: 90, align: "right" });
    itemY += 22;
  });
  doc.y = itemY;

  const taxableValue = order.taxable_amount || order.total_amount;
  const cgst = order.cgst_total || 0;
  const sgst = order.sgst_total || 0;

  const totalNeededHeight = (cgst || sgst) ? 100 : 60;
  if (doc.y + totalNeededHeight > pageHeight + 50) {
    doc.addPage();
    doc.y = 50;
  }

  if (cgst || sgst) {
    const taxY = doc.y + 20;
    doc.fontSize(10).font("Helvetica");
    const colX = 350;
    const valX = 447;
    doc.fillColor(PDF_COLORS.TEXT).text("Taxable Value:", colX, taxY);
    doc.text(formatCurrencyValue(taxableValue), valX, taxY, { width: 90, align: "right" });
    doc.text("CGST:", colX, taxY + 16);
    doc.text(formatCurrencyValue(cgst), valX, taxY + 16, { width: 90, align: "right" });
    doc.text("SGST:", colX, taxY + 32);
    doc.text(formatCurrencyValue(sgst), valX, taxY + 32, { width: 90, align: "right" });
    doc.strokeColor(PDF_COLORS.GRAY).lineWidth(1).moveTo(colX, taxY + 46).lineTo(547, taxY + 46).stroke();
    doc.fillColor(PDF_COLORS.NAVY).fontSize(12).font("Helvetica-Bold").text("Total Amount:", colX, taxY + 55);
    doc.text(formatCurrencyValue(order.total_amount), valX, taxY + 55, { width: 90, align: "right" });
  } else {
    const totalY = doc.y + 20;
    doc.strokeColor(PDF_COLORS.GRAY).lineWidth(1).moveTo(350, totalY).lineTo(547, totalY).stroke();
    doc.fillColor(PDF_COLORS.NAVY).fontSize(12).font("Helvetica-Bold").text("Total Amount:", 350, totalY + 15);
    doc.text(formatCurrencyValue(order.total_amount), 447, totalY + 15, { width: 90, align: "right" });
  }

  const footerY = 640;
  if (qrBuffer) {
    try {
      doc.image(qrBuffer, 48, footerY, { width: 75 });
      doc.fillColor(PDF_COLORS.NAVY).fontSize(8).font("Helvetica-Bold").text("SCAN TO PAY VIA UPI", 48, footerY + 80);
      doc.fontSize(7).font("Helvetica").text(primaryBank.upi_id, 48, footerY + 90);
    } catch (qrErr) {
      console.warn("[PDF] Unable to render UPI QR image:", qrErr.message);
    }
  }

  if (reviewQrBuffer) {
    try {
      doc.image(reviewQrBuffer, 175, footerY, { width: 75 });
      doc.fillColor(PDF_COLORS.BLUE).fontSize(8).font("Helvetica-Bold").text("REVIEW US ON GOOGLE", 165, footerY + 80, { width: 95, align: "center" });
      doc.fontSize(7).font("Helvetica").text("Scan to leave 5 stars!", 165, footerY + 90, { width: 95, align: "center" });
    } catch (qrErr) {
      console.warn("[PDF] Unable to render Review QR image:", qrErr.message);
    }
  }

  doc.fontSize(9).font("Helvetica-Oblique").fillColor(PDF_COLORS.TEXT_SOFT).text("Terms: Goods once sold cannot be returned or cancelled. Warranty as per manufacturer norms.", 48, footerY + 110);
  doc.strokeColor(PDF_COLORS.GRAY).lineWidth(0.5).dash(5, { space: 10 }).moveTo(400, footerY + 60).lineTo(547, footerY + 60).stroke();
  doc.undash().fontSize(10).font("Helvetica-Bold").fillColor(PDF_COLORS.NAVY).text("Authorized Signatory", 400, footerY + 65, { width: 147, align: "center" });

  return doc;
};

const generateServiceBill = async (requestId) => {
  let request = db.prepare("SELECT * FROM service_requests WHERE id = ? OR bill_number = ?").get(requestId, requestId);
  if (!request) {
    request = db.prepare("SELECT * FROM service_requests WHERE id LIKE ?").get(`%${requestId}`);
  }
  if (!request) {
    // Fallback: check if this is actually a Product Order!
    const order = db.prepare("SELECT * FROM product_orders WHERE id = ? OR id LIKE ?").get(requestId, `%${requestId}`);
    if (order) {
      return generateOrderInvoice(order.id);
    }
    throw new Error(`Service Request or Order '${requestId}' not found`);
  }

  if (request.bill_status !== "billed" && !request.bill_amount) {
    let used = [];
    try { used = JSON.parse(request.used_items || '[]'); } catch (e) {}
    const usedTotal = used.reduce((sum, i) => sum + ((Number(i.price) || 0) * (Number(i.qty) || 1)), 0);
    request.bill_amount = usedTotal || request.estimated_cost || 0;
    request.bill_number = request.bill_number || `EST-${request.id.slice(-6).toUpperCase()}`;
  }

  let billItems = [];
  try {
    if (request.bill_details) {
      const parsed = JSON.parse(request.bill_details);
      if (Array.isArray(parsed) && parsed.length && parsed[0] && typeof parsed[0] === "object") {
        billItems = parsed;
      } else if (Array.isArray(parsed)) {
        billItems = parsed.map(l => ({ desc: String(l), qty: 1, rate: 0, amount: request.bill_amount }));
      } else {
        billItems = [{ desc: String(parsed), qty: 1, rate: 0, amount: request.bill_amount }];
      }
    }
  } catch (e) {
    billItems = [{ desc: String(request.bill_details || ""), qty: 1, rate: 0, amount: request.bill_amount }];
  }
  if (!billItems.length) {
    billItems = [{ desc: "General Service & Labor Charges", qty: 1, rate: 0, amount: request.bill_amount }];
  }

  const settings = getBusinessSettingsMap();
  const bizName = settings.business_name || 'TECHLAB';
  const bizAddr = settings.business_address || 'Casa Layout, Karur - 639001, TN';
  const bizPhone = settings.business_phone || '+91 94888-0-9897';
  const bizEmail = settings.business_email || 'service@techlab.in';
  const bizGstin = settings.gstin || '';

  const primaryBank = db.prepare("SELECT * FROM bank_accounts WHERE is_primary = 1 LIMIT 1").get();
  let qrBuffer = null;
  if (primaryBank && primaryBank.upi_id && primaryBank.show_qr && request.payment_status !== 'paid') {
    const upiUrl = `upi://pay?pa=${primaryBank.upi_id}&pn=${encodeURIComponent(bizName)}&am=${request.bill_amount}&cu=INR`;
    qrBuffer = await fetchQrCode(upiUrl);
  }

  let reviewQrBuffer = null;
  if (settings.google_review_url) {
    reviewQrBuffer = await fetchQrCode(settings.google_review_url);
  }

  const doc = new PDFDocument({ size: "A4", margin: 48 });

  doc.fillColor(PDF_COLORS.NAVY).fontSize(24).font("Helvetica-Bold").text(bizName, 48, 50);
  doc.fillColor(PDF_COLORS.TEXT_SOFT).fontSize(9).font("Helvetica").text("Computers, Laptops, CCTV & IT Solutions", 48, 75);
  doc.text(bizAddr, 48, 87);
  doc.text(`Ph: ${bizPhone} | Email: ${bizEmail}`, 48, 99);

  const isGst = (request.gst_total || 0) > 0;
  const showGstin = (isGst || request.bill_status === 'billed') && bizGstin;
  if (showGstin) {
    doc.fillColor(PDF_COLORS.TEXT).fontSize(9).font("Helvetica-Bold").text(`GSTIN: ${bizGstin}`, 48, 111);
  }

  const docTitle = isGst ? "TAX INVOICE" : "ESTIMATE / BILL";
  doc.fillColor(PDF_COLORS.BLUE).fontSize(16).font("Helvetica-Bold").text(docTitle, 48, 50, { align: "right" });
  doc.fillColor(PDF_COLORS.TEXT).fontSize(10).font("Helvetica").text(`No: ${request.bill_number}`, 48, 75, { align: "right" });
  doc.text(`Date: ${request.bill_date || nowIso().slice(0,10)}`, 48, 87, { align: "right" });

  const headerBottom = showGstin ? 130 : 120;
  doc.strokeColor(PDF_COLORS.NAVY).lineWidth(2).moveTo(48, headerBottom).lineTo(547, headerBottom).stroke();

  doc.moveDown(3);
  const customerStartY = doc.y;
  doc.rect(48, customerStartY, 250, 70).fill(PDF_COLORS.LIGHT_GRAY).stroke(PDF_COLORS.GRAY);
  doc.fillColor(PDF_COLORS.NAVY).fontSize(10).font("Helvetica-Bold").text("BILL TO:", 58, customerStartY + 10);
  doc.fillColor(PDF_COLORS.TEXT).fontSize(11).text(request.customer_name, 58, customerStartY + 25);
  doc.fontSize(10).font("Helvetica").text(`Mobile: ${request.customer_mobile}`, 58, customerStartY + 40);

  doc.rect(305, customerStartY, 242, 70).fill(PDF_COLORS.LIGHT_GRAY).stroke(PDF_COLORS.GRAY);
  doc.fillColor(PDF_COLORS.NAVY).fontSize(10).font("Helvetica-Bold").text("JOB DETAILS:", 315, customerStartY + 10);
  doc.fillColor(PDF_COLORS.TEXT).fontSize(9).font("Helvetica").text(`Type: ${request.device_type}`, 315, customerStartY + 25);
  doc.text(`Issue: ${request.issue.substring(0, 40)}${request.issue.length > 40 ? '...' : ''}`, 315, customerStartY + 37);
  doc.text(`Tech: ${request.service_person || 'N/A'}`, 315, customerStartY + 49);

  doc.moveDown(5);
  const tableTop = doc.y;
  doc.rect(48, tableTop, 500, 25).fill(PDF_COLORS.NAVY);
  doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text("Description of Service / Parts", 58, tableTop + 8);
  doc.text("Amount (INR)", 447, tableTop + 8, { width: 90, align: "right" });

  let itemY = tableTop + 40;
  billItems.forEach((it) => {
    const qty = Number(it.qty) || 1;
    const rate = Number(it.rate) || 0;
    const amount = Number(it.amount) || 0;
    let desc = String(it.desc || it.description || "");
    if (rate > 0) desc += (desc ? " " : "") + `(${qty} x Rs.${rate})`;
    else if (qty > 1) desc += (desc ? " " : "") + `(${qty} x)`;
    doc.fillColor(PDF_COLORS.TEXT).fontSize(10).font("Helvetica").text(desc || "-", 58, itemY, { width: 380 });
    doc.font("Helvetica-Bold").text(formatCurrencyValue(amount), 447, itemY, { width: 90, align: "right" });
    itemY += 22;
  });
  doc.y = itemY;

  const taxableValue = request.taxable_amount || request.bill_amount;
  const cgst = request.cgst_total || 0;
  const sgst = request.sgst_total || 0;

  if (cgst || sgst) {
    const taxY = doc.y + 30;
    doc.fontSize(10).font("Helvetica");
    const colX = 350;
    const valX = 447;

    doc.fillColor(PDF_COLORS.TEXT).text("Taxable Value:", colX, taxY);
    doc.text(formatCurrencyValue(taxableValue), valX, taxY, { width: 90, align: "right" });
    doc.text(`CGST @ ${cgst > 0 && taxableValue > 0 ? Math.round(cgst * 100 / taxableValue * 2) + '%' : '0%'}:`, colX, taxY + 16);
    doc.text(formatCurrencyValue(cgst), valX, taxY + 16, { width: 90, align: "right" });
    doc.text(`SGST @ ${sgst > 0 && taxableValue > 0 ? Math.round(sgst * 100 / taxableValue * 2) + '%' : '0%'}:`, colX, taxY + 32);
    doc.text(formatCurrencyValue(sgst), valX, taxY + 32, { width: 90, align: "right" });
    doc.strokeColor(PDF_COLORS.GRAY).lineWidth(1).moveTo(colX, taxY + 46).lineTo(547, taxY + 46).stroke();
    doc.fillColor(PDF_COLORS.NAVY).fontSize(12).font("Helvetica-Bold").text("Total Amount:", colX, taxY + 55);
    doc.text(formatCurrencyValue(request.bill_amount), valX, taxY + 55, { width: 90, align: "right" });
  } else {
    const totalY = doc.y + 40;
    doc.strokeColor(PDF_COLORS.GRAY).lineWidth(1).moveTo(350, totalY).lineTo(547, totalY).stroke();
    doc.fillColor(PDF_COLORS.NAVY).fontSize(12).font("Helvetica-Bold").text("Total Amount:", 350, totalY + 15);
    doc.text(formatCurrencyValue(request.bill_amount), 447, totalY + 15, { width: 90, align: "right" });
  }

  const amountPaid = Number(request.amount_paid) || 0;
  const discountApplied = Number(request.discount_amount) || 0;
  if (amountPaid > 0 || discountApplied > 0) {
    const balance = Math.max(0, request.bill_amount - amountPaid - discountApplied);
    const boxH = discountApplied > 0 ? 72 : 58;
    const payY = 495;
    doc.rect(48, payY, 250, boxH).fill(PDF_COLORS.LIGHT_GRAY).stroke(PDF_COLORS.GRAY);
    doc.fillColor(PDF_COLORS.NAVY).fontSize(10).font("Helvetica-Bold").text("PAYMENT STATUS", 58, payY + 10);
    doc.fillColor(PDF_COLORS.TEXT).fontSize(10).font("Helvetica").text(`Paid: ${formatCurrencyValue(amountPaid)}${request.payment_mode ? ` (${request.payment_mode})` : ''}`, 58, payY + 27);
    if (discountApplied > 0) {
      doc.text(`Discount: ${formatCurrencyValue(discountApplied)}`, 58, payY + 40);
      doc.font("Helvetica-Bold").text(`Balance Due: ${formatCurrencyValue(balance)}`, 58, payY + 53);
    } else {
      doc.font("Helvetica-Bold").text(`Balance Due: ${formatCurrencyValue(balance)}`, 58, payY + 40);
    }
  }

  const footerY = 640;
  if (qrBuffer) {
    try {
      doc.image(qrBuffer, 48, footerY, { width: 75 });
      doc.fillColor(PDF_COLORS.NAVY).fontSize(8).font("Helvetica-Bold").text("SCAN TO PAY VIA UPI", 48, footerY + 80);
      doc.fontSize(7).font("Helvetica").text(primaryBank.upi_id, 48, footerY + 90);
    } catch (qrErr) {
      console.warn("[PDF] Unable to render UPI QR image:", qrErr.message);
    }
  }

  if (reviewQrBuffer) {
    try {
      doc.image(reviewQrBuffer, 175, footerY, { width: 75 });
      doc.fillColor(PDF_COLORS.BLUE).fontSize(8).font("Helvetica-Bold").text("REVIEW US ON GOOGLE", 165, footerY + 80, { width: 95, align: "center" });
      doc.fontSize(7).font("Helvetica").text("Scan to leave 5 stars!", 165, footerY + 90, { width: 95, align: "center" });
    } catch (qrErr) {
      console.warn("[PDF] Unable to render Review QR image:", qrErr.message);
    }
  }

  doc.fontSize(9).font("Helvetica-Oblique").fillColor(PDF_COLORS.TEXT_SOFT).text("Notes: Thank you for choosing our service. Professional IT and security solutions.", 48, footerY + 110);
  doc.strokeColor(PDF_COLORS.GRAY).lineWidth(0.5).dash(5, { space: 10 }).moveTo(400, footerY + 60).lineTo(547, footerY + 60).stroke();
  doc.undash().fontSize(10).font("Helvetica-Bold").fillColor(PDF_COLORS.NAVY).text("Authorized Signatory", 400, footerY + 65, { width: 147, align: "center" });

  return doc;
};

const generateSurveyPdf = async (requestId) => {
  const request = db.prepare("SELECT * FROM service_requests WHERE id = ?").get(requestId);
  if (!request) throw new Error("Service request not found");

  const survey = db.prepare("SELECT * FROM site_visit_surveys WHERE service_request_id = ? ORDER BY submitted_at DESC LIMIT 1").get(requestId);
  if (!survey) throw new Error("No survey found for this request");

  let cameras = [], cables = [], mounting = {}, additionalParts = [], nvrDvr = {};
  try { cameras = JSON.parse(survey.cameras || "[]"); } catch (e) {}
  try { cables = JSON.parse(survey.cables || "[]"); } catch (e) {}
  try { mounting = JSON.parse(survey.mounting || "{}"); } catch (e) {}
  try { additionalParts = JSON.parse(survey.additional_parts || "[]"); } catch (e) {}
  try { nvrDvr = JSON.parse(survey.nvr_dvr || "{}"); } catch (e) {}

  const doc = new PDFDocument({ margin: 48, size: "A4", bufferPages: true });

  const tech = request.assigned_employee_name || request.service_person || "";
  const fmt = (iso) => { if (!iso) return "-"; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); };
  const fmtDay = (iso) => { if (!iso) return "-"; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString("en-IN", { dateStyle: "medium" }); };

  const sectionTitle = (text) => {
    doc.x = 48;
    doc.moveDown(0.6);
    doc.fillColor(PDF_COLORS.NAVY).fontSize(11).font("Helvetica-Bold").text(text.toUpperCase());
    doc.strokeColor(PDF_COLORS.BLUE).lineWidth(0.8).moveTo(48, doc.y).lineTo(547, doc.y).stroke();
    doc.moveDown(0.3);
  };
  const kv = (label, value) => {
    if (value == null || value === "") return;
    doc.fillColor(PDF_COLORS.TEXT_SOFT).fontSize(9).font("Helvetica-Bold").text(label + ": ", { continued: true });
    doc.fillColor(PDF_COLORS.TEXT).font("Helvetica").text(String(value));
  };

  drawPdfHeader(doc, "Site Visit Report");
  doc.fillColor(PDF_COLORS.BLUE).fontSize(13).font("Helvetica-Bold").text(`CCTV Installation Survey   |   Ref: #${requestId.slice(-8)}`);
  doc.moveDown(0.5);

  sectionTitle("Prepared For");
  const info = [
    ["Customer", request.customer_name || "-"],
    ["Mobile", request.customer_mobile || "-"],
    ["Survey Date", fmt(survey.submitted_at)],
    ["Technician", tech || "-"],
    ["Requested", request.device_type || "-"],
    ["Visit Date", fmtDay(request.scheduled_date || request.preferred_date)],
  ];
  const colX = [48, 285];
  const gridTop = doc.y;
  info.forEach(([label, value], i) => {
    const y = gridTop + Math.floor(i / 2) * 14;
    doc.fillColor(PDF_COLORS.TEXT_SOFT).fontSize(9).font("Helvetica-Bold").text(label + ": ", colX[i % 2], y, { continued: true });
    doc.fillColor(PDF_COLORS.TEXT).font("Helvetica").text(String(value));
  });
  doc.x = 48;
  doc.y = gridTop + Math.ceil(info.length / 2) * 14 + 10;
  if (request.issue) kv("Reported Issue", request.issue);

  const rows = [];
  const cableUnit = (type) => (type === "Cat6" || type === "Cat6a") ? "Box" : (type === "Power Cable" || type === "HDMI") ? "Mtrs" : "-";
  cameras.forEach((c) => {
    rows.push({
      part: `CCTV Camera (${c.formFactor || c.type || "Camera"})`,
      qty: Number(c.count) || 1,
      notes: [c.technology, c.resolution].filter(Boolean).join(", ") || "-",
    });
  });
  if (nvrDvr.needed) {
    rows.push({ part: `CCTV Recorder (${nvrDvr.type || "NVR/DVR"})`, qty: 1, notes: `${nvrDvr.channels || 0} Channel${nvrDvr.brand ? " - " + nvrDvr.brand : ""}` });
  }
  if (nvrDvr.power) {
    rows.push({ part: `Power Supply (${nvrDvr.power.type || "Power"})`, qty: 1, notes: `${nvrDvr.power.channels || 0} Channel${nvrDvr.power.brand ? " - " + nvrDvr.power.brand : ""}` });
  }
  cables.forEach((c) => {
    const unit = cableUnit(c.type);
    const qty = unit === "Box" ? Number(c.boxes) || 0 : unit === "Mtrs" ? Number(c.meters) || 0 : 0;
    rows.push({ part: c.type || "Cable", qty, notes: unit === "Box" ? "Box (305 m each)" : unit === "Mtrs" ? "Metres" : "-" });
  });
  if (mounting.brackets) rows.push({ part: "Camera Bracket", qty: mounting.brackets, notes: "-" });
  if (mounting.poles) rows.push({ part: "Pole", qty: mounting.poles, notes: "-" });
  if (mounting.boxes) rows.push({ part: "Camera Box", qty: mounting.boxes, notes: "-" });
  if (mounting.other) rows.push({ part: String(mounting.other), qty: "-", notes: "-" });
  additionalParts.forEach((p) => rows.push({ part: p.name || "Part", qty: p.qty || 1, notes: p.notes || "-" }));

  sectionTitle("Parts Required");
  if (rows.length) {
    drawPdfTable(doc,
      [{ key: "num", label: "#" }, { key: "part", label: "Part / Item" }, { key: "qty", label: "Qty" }, { key: "notes", label: "Notes" }],
      rows.map((r, i) => ({ num: i + 1, part: r.part, qty: r.qty, notes: r.notes }))
    );

    if (survey.notes) {
      doc.moveDown(0.5);
      sectionTitle("Technician Notes");
      doc.fillColor(PDF_COLORS.TEXT).fontSize(10).font("Helvetica").text(survey.notes, { width: 500 });
    }

    if (doc.y > 720) doc.addPage();
  }

  try {
    const photos = JSON.parse(survey.photos || "[]");
    if (photos.length) {
      if (doc.y > 550) doc.addPage();
      else doc.moveDown(2);

      sectionTitle("Site Photos");
      let photoX = 48;
      let photoY = doc.y + 10;
      const pWidth = 160;
      const pHeight = 120;
      const pGap = 10;

      photos.slice(0, 6).forEach((photoPath) => {
        const fullPath = path.join(__dirname, "../../../", photoPath.startsWith("/") ? photoPath.substring(1) : photoPath);
        if (fs.existsSync(fullPath)) {
          if (photoX + pWidth > 547) {
            photoX = 48;
            photoY += pHeight + pGap;
          }
          if (photoY + pHeight > 740) {
            doc.addPage();
            photoY = 50;
            photoX = 48;
          }
          try {
            doc.image(fullPath, photoX, photoY, { width: pWidth, height: pHeight });
          } catch (e) {
            doc.rect(photoX, photoY, pWidth, pHeight).stroke().text("Image Load Error", photoX + 10, photoY + 10);
          }
          photoX += pWidth + pGap;
        }
      });
    }
  } catch (e) {
    console.error("PDF Photo Error:", e);
  }

  drawPdfFooter(doc);
  return doc;
};

const generateChallanPdf = async (challanId) => {
  const challan = db.prepare("SELECT * FROM delivery_challans WHERE id = ?").get(challanId);
  if (!challan) throw new Error("Delivery challan not found");
  const items = db.prepare("SELECT item_name, qty, unit_price, total_price FROM delivery_challan_items WHERE challan_id = ? ORDER BY id").all(challanId);

  const settings = getBusinessSettingsMap();
  const bizName = settings.business_name || 'TECHLAB';
  const bizAddr = settings.business_address || 'Casa Layout, Karur - 639001, TN';
  const bizPhone = settings.business_phone || '+91 94888-0-9897';
  const bizEmail = settings.business_email || 'service@techlab.in';
  const bizGstin = settings.gstin || '';

  const primaryBank = db.prepare("SELECT * FROM bank_accounts WHERE is_primary = 1 LIMIT 1").get();
  let qrBuffer = null;
  if (primaryBank && primaryBank.upi_id && primaryBank.show_qr && challan.billing_status !== 'billed') {
    const upiUrl = `upi://pay?pa=${primaryBank.upi_id}&pn=${encodeURIComponent(bizName)}&am=${challan.total_value}&cu=INR`;
    qrBuffer = await fetchQrCode(upiUrl);
  }

  const doc = new PDFDocument({ size: "A4", margin: 48 });

  doc.fillColor(PDF_COLORS.NAVY).fontSize(24).font("Helvetica-Bold").text(bizName, 48, 50);
  doc.fillColor(PDF_COLORS.TEXT_SOFT).fontSize(9).font("Helvetica").text("Computers, Laptops, CCTV & IT Solutions", 48, 75);
  doc.text(bizAddr, 48, 87);
  doc.text(`Ph: ${bizPhone} | Email: ${bizEmail}`, 48, 99);
  if (bizGstin) doc.fillColor(PDF_COLORS.TEXT).fontSize(9).font("Helvetica-Bold").text(`GSTIN: ${bizGstin}`, 48, 111);

  doc.fillColor(PDF_COLORS.BLUE).fontSize(16).font("Helvetica-Bold").text("DELIVERY CHALLAN", 48, 50, { align: "right" });
  doc.fillColor(PDF_COLORS.TEXT).fontSize(10).font("Helvetica").text(`Challan No: ${challan.challan_number}`, 48, 75, { align: "right" });
  doc.text(`Date: ${formatDateValue(challan.dispatch_date)}`, 48, 87, { align: "right" });

  const headerBottom = bizGstin ? 130 : 120;
  doc.strokeColor(PDF_COLORS.NAVY).lineWidth(2).moveTo(48, headerBottom).lineTo(547, headerBottom).stroke();

  doc.moveDown(3);
  const customerStartY = doc.y;
  doc.rect(48, customerStartY, 250, 70).fill(PDF_COLORS.LIGHT_GRAY).stroke(PDF_COLORS.GRAY);
  doc.fillColor(PDF_COLORS.NAVY).fontSize(10).font("Helvetica-Bold").text("CONSIGNEE:", 58, customerStartY + 10);
  doc.fillColor(PDF_COLORS.TEXT).fontSize(11).text(challan.customer_name, 58, customerStartY + 25);
  doc.fontSize(10).font("Helvetica").text(`Mobile: ${challan.customer_mobile || "-"}`, 58, customerStartY + 40);
  if (challan.customer_address) doc.fontSize(9).text(challan.customer_address, 58, customerStartY + 53);

  doc.rect(305, customerStartY, 242, 70).fill(PDF_COLORS.LIGHT_GRAY).stroke(PDF_COLORS.GRAY);
  doc.fillColor(PDF_COLORS.NAVY).fontSize(10).font("Helvetica-Bold").text("DISPATCH DETAILS:", 315, customerStartY + 10);
  doc.fillColor(PDF_COLORS.TEXT).fontSize(9).font("Helvetica").text(`Receiver: ${challan.receiver_name || "-"}`, 315, customerStartY + 25);
  doc.text(`Transport: ${challan.transport || "-"}`, 315, customerStartY + 37);
  doc.text(`Vehicle No: ${challan.vehicle_no || "-"}`, 315, customerStartY + 49);

  doc.moveDown(5);
  const tableTop = doc.y;
  doc.rect(48, tableTop, 500, 25).fill(PDF_COLORS.NAVY);
  doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text("#", 58, tableTop + 8, { width: 30 });
  doc.text("Description of Goods", 95, tableTop + 8, { width: 230 });
  doc.text("Qty", 325, tableTop + 8, { width: 50, align: "right" });
  doc.text("Rate", 385, tableTop + 8, { width: 70, align: "right" });
  doc.text("Amount", 465, tableTop + 8, { width: 72, align: "right" });

  let itemY = tableTop + 40;
  const pageHeight = doc.page.height - 150;

  items.forEach((it, idx) => {
    if (itemY > pageHeight) {
      doc.addPage();
      itemY = 50;
      doc.rect(48, itemY, 500, 25).fill(PDF_COLORS.NAVY);
      doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text("#", 58, itemY + 8, { width: 30 });
      doc.text("Description of Goods", 95, itemY + 8, { width: 230 });
      doc.text("Qty", 325, itemY + 8, { width: 50, align: "right" });
      doc.text("Rate", 385, itemY + 8, { width: 70, align: "right" });
      doc.text("Amount", 465, itemY + 8, { width: 72, align: "right" });
      itemY += 40;
    }

    doc.fillColor(PDF_COLORS.TEXT).fontSize(9).font("Helvetica").text(String(idx + 1), 58, itemY, { width: 30 });
    doc.text(String(it.item_name || "-"), 95, itemY, { width: 230 });
    doc.text(String(it.qty), 325, itemY, { width: 50, align: "right" });
    doc.text(formatCurrencyValue(it.unit_price).replace("Rs. ", ""), 385, itemY, { width: 70, align: "right" });
    doc.font("Helvetica-Bold").text(formatCurrencyValue(it.total_price).replace("Rs. ", ""), 465, itemY, { width: 72, align: "right" });
    doc.strokeColor(PDF_COLORS.GRAY).lineWidth(0.5).moveTo(48, itemY + 18).lineTo(547, itemY + 18).stroke();
    itemY += 22;
  });

  doc.rect(48, itemY, 500, 20).fill(PDF_COLORS.LIGHT_GRAY);
  doc.fillColor(PDF_COLORS.NAVY).fontSize(10).font("Helvetica-Bold").text("TOTAL VALUE", 58, itemY + 6);
  doc.text(formatCurrencyValue(challan.total_value), 465, itemY + 6, { width: 72, align: "right" });
  itemY += 30;

  doc.y = itemY;

  if (challan.notes) {
    doc.fillColor(PDF_COLORS.TEXT).fontSize(9).font("Helvetica").text(`Notes: ${challan.notes}`, 48, doc.y + 20);
  }

  const footerY = 640;
  if (qrBuffer) {
    try {
      doc.image(qrBuffer, 48, footerY, { width: 75 });
      doc.fillColor(PDF_COLORS.NAVY).fontSize(8).font("Helvetica-Bold").text("SCAN TO PAY VIA UPI", 48, footerY + 80);
      doc.fontSize(7).font("Helvetica").text(primaryBank.upi_id, 48, footerY + 90);
    } catch (qrErr) {
      console.warn("[PDF] Unable to render UPI QR image:", qrErr.message);
    }
  }

  if (reviewQrBuffer) {
    try {
      doc.image(reviewQrBuffer, 175, footerY, { width: 75 });
      doc.fillColor(PDF_COLORS.BLUE).fontSize(8).font("Helvetica-Bold").text("REVIEW US ON GOOGLE", 165, footerY + 80, { width: 95, align: "center" });
      doc.fontSize(7).font("Helvetica").text("Scan to leave 5 stars!", 165, footerY + 90, { width: 95, align: "center" });
    } catch (qrErr) {
      console.warn("[PDF] Unable to render Review QR image:", qrErr.message);
    }
  }

  doc.fontSize(9).font("Helvetica-Oblique").fillColor(PDF_COLORS.TEXT_SOFT).text("Notes: Goods received in good condition. Subject to Karur jurisdiction.", 48, footerY + 110);
  doc.strokeColor(PDF_COLORS.GRAY).lineWidth(0.5).dash(5, { space: 10 }).moveTo(400, footerY + 60).lineTo(547, footerY + 60).stroke();
  doc.undash().fontSize(10).font("Helvetica-Bold").fillColor(PDF_COLORS.NAVY).text("Receiver's Signature", 400, footerY + 65, { width: 147, align: "center" });

  return doc;
};

const generateCompanyProfilePdf = async () => {
  const settingsRows = db.prepare("SELECT key, value FROM business_settings").all();
  const settings = {};
  settingsRows.forEach(s => settings[s.key] = s.value);

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM service_requests WHERE status = 'Completed') as jobsDone,
      (SELECT COUNT(*) FROM service_requests) as totalRequests,
      (SELECT COUNT(*) FROM product_orders) as salesCount,
      (SELECT COUNT(*) FROM users WHERE role IN ('employee', 'sales', 'technician')) as staffCount,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') as customerCount,
      (SELECT SUM(stock) FROM products WHERE active = 1) as inventoryStock,
      (SELECT COUNT(DISTINCT device_type) FROM service_requests) as serviceTypes,
      (SELECT COUNT(DISTINCT type) FROM products WHERE active = 1) as productCategories
  `).get();

  const doc = new PDFDocument({ margin: 0, size: "A4" });
  const W = 595.28, H = 841.89;

  doc.rect(0, 0, W, H).fill("#f8fafc");
  doc.rect(0, 0, W, 160).fill(PDF_COLORS.NAVY);
  doc.fillColor("#ffffff").fontSize(29).font("Helvetica-Bold").text(settings.business_name || "TECHLAB", 40, 35);
  doc.fillColor(PDF_COLORS.BLUE).fontSize(10).font("Helvetica-Bold").text("Technology Solutions & Service Specialists", 40, 70);
  if (settings.gstin) doc.fillColor("#64748b").fontSize(9).font("Helvetica").text(`GSTIN: ${settings.gstin}`, 40, 90);

  const contactX = 380;
  doc.fillColor("#94a3b8").fontSize(11).font("Helvetica").text(settings.business_address || "Casa Layout, Karur, TN", contactX, 38, { width: 180 });
  doc.fillColor("#94a3b8").fontSize(10).text(settings.business_phone || "94888-0-9897", contactX, 68);
  doc.fillColor("#94a3b8").text(settings.business_email || "info@techlab.in", contactX, 84);

  const heroY = 180;
  const heroMetrics = [
    { val: `${stats.jobsDone || 0}`, label: "Jobs Done", color: "#10b981" },
    { val: `${stats.customerCount || 0}`, label: "Customers", color: "#3b82f6" },
    { val: `${stats.staffCount || 0}`, label: "Team Size", color: "#8b5cf6" },
    { val: `${stats.salesCount || 0}`, label: "Orders", color: "#f59e0b" }
  ];

  heroMetrics.forEach((m, i) => {
    const cx = 40 + (i * 130);
    doc.roundedRect(cx, heroY, 115, 60, 6).fill("#ffffff").stroke(PDF_COLORS.GRAY);
    doc.circle(cx + 18, heroY + 18, 12).fill(m.color);
    doc.fillColor("#ffffff").fontSize(10).font("Helvetica-Bold").text(m.val.charAt(0), cx + 13, heroY + 14);
    doc.fillColor(PDF_COLORS.TEXT_SOFT).fontSize(9).font("Helvetica").text(m.label, cx + 40, heroY + 14);
    doc.fillColor(PDF_COLORS.NAVY).fontSize(16).font("Helvetica-Bold").text(m.val, cx + 40, heroY + 28);
  });

  return doc;
};

module.exports = {
  generateOrderInvoice,
  generateServiceBill,
  generateSurveyPdf,
  generateChallanPdf,
  generateCompanyProfilePdf
};
