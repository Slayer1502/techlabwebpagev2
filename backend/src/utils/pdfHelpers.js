const PDFDocument = require("pdfkit");
const { db } = require("../../db");
const config = require("../../config");
const fs = require("fs");
const path = require("path");

const PDF_COLORS = config.PDF_COLORS;

const getBusinessSettingsMap = () => {
  const settings = db.prepare("SELECT key, value FROM business_settings").all();
  const map = {};
  settings.forEach(s => map[s.key] = s.value);
  return map;
};

const drawPdfHeader = (doc, title) => {
  const settings = getBusinessSettingsMap();
  const businessName = settings.business_name || "TECHLAB";
  const address = settings.business_address || "Casa Layout, Karur, TN";
  const phone = settings.business_phone || "94888-0-9897";
  const email = settings.business_email || "service@techlab.in";
  const gstin = settings.gstin || "";

  doc.fillColor(PDF_COLORS.NAVY).fontSize(22).font("Helvetica-Bold").text(businessName.toUpperCase(), 48, 40);
  doc.fillColor(PDF_COLORS.TEXT_SOFT).fontSize(10).font("Helvetica").text("Computers, Laptops, CCTV & Service Center", 48, 65);
  doc.text(`Ph: ${phone} | Email: ${email}`, 48, 78);
  doc.text(address, 48, 90);

  if (gstin) {
    doc.fillColor(PDF_COLORS.TEXT).fontSize(10).font("Helvetica-Bold").text(`GSTIN: ${gstin}`, 48, 106);
  }

  doc.fillColor(PDF_COLORS.BLUE).fontSize(14).font("Helvetica-Bold").text(title.toUpperCase(), 48, 105, { align: "right" });

  const headerBottom = gstin ? 130 : 120;
  doc.strokeColor(PDF_COLORS.NAVY).lineWidth(1.5).moveTo(48, headerBottom).lineTo(547, headerBottom).stroke();
  doc.y = headerBottom + 12;
};

const drawPdfFooter = (doc) => {
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.strokeColor(PDF_COLORS.GRAY).lineWidth(0.5).moveTo(48, 770).lineTo(547, 770).stroke();
    doc.fillColor(PDF_COLORS.TEXT_SOFT).fontSize(8).font("Helvetica")
      .text(`Generated on ${new Date().toLocaleString("en-IN")}`, 48, 778);
    doc.text(`Page ${i + 1} of ${pageCount}`, 48, 778, { align: "right" });
  }
};

const drawPdfSummaryCards = (doc, items) => {
  if (!items || !items.length) return;

  const cols = items.length <= 4 ? items.length : 3;
  const gap = 10;
  const printableWidth = 500;
  const cardWidth = Math.floor((printableWidth - (gap * (cols - 1))) / cols);
  const cardHeight = 44;
  let startX = 48;
  let startY = doc.y;

  items.forEach((item, index) => {
    const colIdx = index % cols;
    if (colIdx === 0 && index > 0) {
      startX = 48;
      startY += cardHeight + gap;
    }

    doc.rect(startX, startY, cardWidth, cardHeight).fillAndStroke(PDF_COLORS.LIGHT_GRAY, PDF_COLORS.GRAY);
    doc.fillColor(PDF_COLORS.TEXT_SOFT).fontSize(8).font("Helvetica").text(item.label.toUpperCase(), startX + 8, startY + 8, { width: cardWidth - 16 });
    doc.fillColor(PDF_COLORS.NAVY).fontSize(11).font("Helvetica-Bold").text(String(item.value), startX + 8, startY + 22, { width: cardWidth - 16 });

    startX += cardWidth + gap;
  });

  doc.y = startY + cardHeight + 20;
};

const drawPdfTable = (doc, headers, rows) => {
  const startX = 48;
  const printableWidth = 500;

  const getWeight = (key) => {
    const k = String(key || "").toLowerCase();
    if (k.includes("date")) return 70;
    if (k.includes("amount") || k.includes("total") || k.includes("price") || k.includes("rate") || k.includes("debit") || k.includes("credit") || k.includes("balance") || k.includes("due") || k.includes("paid")) return 80;
    if (k.includes("qty") || k.includes("count")) return 45;
    if (k.includes("ref") || k.includes("invoice") || k.includes("hsn") || k.includes("mode") || k.includes("type")) return 80;
    return 140;
  };

  const weights = headers.map(h => getWeight(h.key));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const columnWidths = weights.map(w => Math.round((w / totalWeight) * printableWidth));

  const cellPaddingX = 6;
  const lineHeight = 10;
  const headerRowHeight = 22;
  const bottomLimit = 740;

  const renderTableHeader = (y) => {
    doc.rect(startX, y, printableWidth, headerRowHeight).fill(PDF_COLORS.NAVY);
    let currX = startX;
    headers.forEach((h, i) => {
      const w = columnWidths[i];
      const align = /(amount|total|price|rate|debit|credit|balance|due|paid|qty|count)/i.test(h.key) ? "right" : "left";
      doc.fillColor("#ffffff").fontSize(8.5).font("Helvetica-Bold")
        .text(h.label, currX + cellPaddingX, y + 6, { width: w - 12, align });
      currX += w;
    });
    return y + headerRowHeight;
  };

  const getRowHeight = (row) => {
    let lines = 1;
    headers.forEach((h, i) => {
      const w = columnWidths[i] - 12;
      doc.fontSize(8).font("Helvetica");
      const wrapped = doc.heightOfString(String(row[h.key] ?? "-"), { width: w });
      const cellLines = Math.max(1, Math.ceil(wrapped / lineHeight));
      if (cellLines > lines) lines = cellLines;
    });
    return Math.max(headerRowHeight, lines * lineHeight + 8);
  };

  if (doc.y > bottomLimit - 40) {
    doc.addPage();
  }

  let currentY = renderTableHeader(doc.y);

  rows.forEach((row, rowIndex) => {
    const rowHeight = getRowHeight(row);

    if (currentY + rowHeight > bottomLimit) {
      doc.addPage();
      currentY = renderTableHeader(50);
    }

    if (rowIndex % 2 === 1) {
      doc.rect(startX, currentY, printableWidth, rowHeight).fill("#f8fafc");
    }

    let currX = startX;
    headers.forEach((h, colIndex) => {
      const w = columnWidths[colIndex];
      const val = String(row[h.key] ?? "-");
      const align = /(amount|total|price|rate|debit|credit|balance|due|paid|qty|count)/i.test(h.key) ? "right" : "left";

      doc.fillColor(PDF_COLORS.TEXT).fontSize(8).font("Helvetica")
        .text(val, currX + cellPaddingX, currentY + 6, { width: w - 12, align });
      currX += w;
    });

    doc.strokeColor(PDF_COLORS.GRAY).lineWidth(0.5).moveTo(startX, currentY + rowHeight).lineTo(startX + printableWidth, currentY + rowHeight).stroke();
    currentY += rowHeight;
  });

  doc.y = currentY + 15;
};

module.exports = {
  PDF_COLORS,
  getBusinessSettingsMap,
  drawPdfHeader,
  drawPdfFooter,
  drawPdfSummaryCards,
  drawPdfTable
};
