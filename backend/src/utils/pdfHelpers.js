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
  doc.y = headerBottom + 10;
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

  const cardWidth = 160;
  const cardHeight = 50;
  const gap = 10;
  let startX = 48;
  let startY = doc.y;

  items.forEach((item, index) => {
    if (startX + cardWidth > 547) {
      startX = 48;
      startY += cardHeight + gap;
    }

    doc.rect(startX, startY, cardWidth, cardHeight).fillAndStroke(PDF_COLORS.LIGHT_GRAY, PDF_COLORS.GRAY);
    doc.fillColor(PDF_COLORS.TEXT_SOFT).fontSize(9).font("Helvetica").text(item.label, startX + 10, startY + 12);
    doc.fillColor(PDF_COLORS.NAVY).fontSize(12).font("Helvetica-Bold").text(String(item.value), startX + 10, startY + 28);

    startX += cardWidth + gap;
  });

  doc.y = startY + cardHeight + 25;
};

const drawPdfTable = (doc, headers, rows) => {
  const startX = 48;
  const printableWidth = 500;
  const columnWidth = printableWidth / headers.length;
  const cellPaddingX = 8;
  const lineHeight = 10;
  const headerRowHeight = 22;
  const bottomLimit = 740;

  const renderTableHeader = (y) => {
    doc.rect(startX, y, printableWidth, headerRowHeight).fill(PDF_COLORS.NAVY);
    headers.forEach((h, i) => {
      doc.fillColor("#ffffff").fontSize(9).font("Helvetica-Bold")
        .text(h.label, startX + (i * columnWidth) + cellPaddingX, y + 6, { width: columnWidth - 10 });
    });
    return y + headerRowHeight;
  };

  const getRowHeight = (row) => {
    let lines = 1;
    headers.forEach((h, i) => {
      const width = columnWidth - 10;
      doc.fontSize(8).font("Helvetica");
      const wrapped = doc.heightOfString(String(row[h.key] ?? "-"), { width });
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
      doc.rect(startX, currentY, printableWidth, rowHeight).fill("#f9f9f9");
    }

    headers.forEach((h, colIndex) => {
      const val = String(row[h.key] ?? "-");
      doc.fillColor(PDF_COLORS.TEXT).fontSize(8).font("Helvetica")
        .text(val, startX + (colIndex * columnWidth) + cellPaddingX, currentY + 6, { width: columnWidth - 10 });
    });

    doc.strokeColor(PDF_COLORS.GRAY).lineWidth(0.5).moveTo(startX, currentY + rowHeight).lineTo(startX + printableWidth, currentY + rowHeight).stroke();
    currentY += rowHeight;
  });

  doc.y = currentY + 10;
};

module.exports = {
  PDF_COLORS,
  getBusinessSettingsMap,
  drawPdfHeader,
  drawPdfFooter,
  drawPdfSummaryCards,
  drawPdfTable
};
