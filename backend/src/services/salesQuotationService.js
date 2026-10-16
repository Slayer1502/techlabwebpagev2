const { db, makeId, nowIso, getQuoteSeq } = require("../../db");
const { syncCustomerToParties } = require("./customerService");
const quotationVersionService = require("./quotationVersionService");

const getQuotations = (status) => {
  let sql = `
    SELECT sq.*,
      (SELECT COUNT(*) FROM sales_quotation_items i WHERE i.quote_id = sq.id) as item_count
    FROM sales_quotations sq
    WHERE 1=1
  `;
  const params = [];
  if (status && ["pending", "converted", "cancelled"].includes(status)) {
    sql += ` AND sq.status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY sq.quote_number DESC`;
  const quotations = db.prepare(sql).all(...params);
  const itemStmt = db.prepare("SELECT * FROM sales_quotation_items WHERE quote_id = ?");
  for (const q of quotations) q.items = itemStmt.all(q.id);
  return quotations;
};

const getQuotationById = (id) => {
  const quotation = db.prepare("SELECT * FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) return null;
  const items = db.prepare("SELECT * FROM sales_quotation_items WHERE quote_id = ?").all(id);
  return { quotation, items };
};

const getByServiceRequest = (serviceRequestId) => {
  return db.prepare("SELECT * FROM sales_quotations WHERE service_request_id = ? ORDER BY created_at DESC LIMIT 1").get(serviceRequestId) || null;
};

const getByEnquiryId = (enquiryId) => {
  return db.prepare("SELECT * FROM sales_quotations WHERE enquiry_id = ? ORDER BY created_at DESC LIMIT 1").get(enquiryId) || null;
};

const productExistsStmt = db.prepare("SELECT 1 FROM products WHERE id = ?");

const normalizeItem = (it) => {
  let productId = it.productId ?? it.product_id ?? null;
  productId = productId == null ? null : String(productId).trim() || null;
  if (productId && !productExistsStmt.get(productId)) productId = null;
  let supplierId = it.supplierId ?? it.supplier_id ?? null;
  supplierId = supplierId == null ? null : String(supplierId).trim() || null;
  return {
    productId,
    productName: String(it.productName ?? it.product_name ?? "").trim(),
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice ?? it.unit_price) || 0,
    unitCost: Number(it.unitCost ?? it.unit_cost) || 0,
    source: it.source === "procurement" ? "procurement" : it.source === "inventory" ? "inventory" : null,
    supplierId,
    sqId: it.sqId ?? it.sq_id ?? null,
    sqNumber: it.sqNumber ?? it.sq_number ?? null,
    optionTier: String(it.optionTier ?? it.option_tier ?? "Option 1").trim() || "Option 1"
  };
};

const createQuotation = (data, actorName) => {
  const { customerName, customerMobile, customerAddress, quoteDate, validUntil, notes, items, serviceRequestId, enquiryId } = data;

  syncCustomerToParties(customerName, customerMobile);

  const id = makeId("squot");
  const quoteNumber = getQuoteSeq();
  const date = quoteDate || nowIso().slice(0, 10);
  const total = items.reduce((s, it) => s + (Number(it.quantity) * (Number(it.unitPrice ?? it.unit_price) || 0)), 0);

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO sales_quotations (id, quote_number, customer_name, customer_mobile, customer_address, quote_date, valid_until, total_amount, status, notes, created_by, created_at, service_request_id, enquiry_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`)
      .run(id, quoteNumber, String(customerName).trim(), customerMobile || null, customerAddress || null, date, validUntil || null, total, notes || null, actorName, nowIso(), serviceRequestId || null, enquiryId || null);
    const insertItem = db.prepare(`INSERT INTO sales_quotation_items (id, quote_id, product_id, product_name, quantity, unit_price, unit_cost, source, supplier_id, sq_id, sq_number, option_tier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const it of items) {
      const n = normalizeItem(it);
      insertItem.run(makeId("sqi"), id, n.productId, n.productName, n.quantity, n.unitPrice, n.unitCost, n.source, n.supplierId, n.sqId, n.sqNumber, n.optionTier);
    }
  });
  transaction();
  return { id, quoteNumber };
};

const updateQuotation = (id, data) => {
  const quotation = db.prepare("SELECT * FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status !== "pending") throw new Error("Only pending quotations can be edited");

  const { customerName, customerMobile, customerAddress, quoteDate, validUntil, notes, items, serviceRequestId, enquiryId } = data;
  const total = items.reduce((s, it) => s + (Number(it.quantity) * (Number(it.unitPrice ?? it.unit_price) || 0)), 0);

  const transaction = db.transaction(() => {
    quotationVersionService.snapshotQuotation(id, null);
    db.prepare(`UPDATE sales_quotations SET customer_name = ?, customer_mobile = ?, customer_address = ?, quote_date = ?, valid_until = ?, total_amount = ?, notes = ?, service_request_id = ?, enquiry_id = ? WHERE id = ?`)
      .run(String(customerName).trim(), customerMobile || null, customerAddress || null, quoteDate || quotation.quote_date, validUntil || null, total, notes || null, serviceRequestId ?? quotation.service_request_id, enquiryId ?? quotation.enquiry_id, id);
    db.prepare("DELETE FROM sales_quotation_items WHERE quote_id = ?").run(id);
    const insertItem = db.prepare(`INSERT INTO sales_quotation_items (id, quote_id, product_id, product_name, quantity, unit_price, unit_cost, source, supplier_id, sq_id, sq_number, option_tier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const it of items) {
      const n = normalizeItem(it);
      insertItem.run(makeId("sqi"), id, n.productId, n.productName, n.quantity, n.unitPrice, n.unitCost, n.source, n.supplierId, n.sqId, n.sqNumber, n.optionTier);
    }
  });
  transaction();
};

const convertQuotation = (id) => {
  const quotation = db.prepare("SELECT * FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status === "converted") throw new Error("Quotation already converted");

  const items = db.prepare("SELECT * FROM sales_quotation_items WHERE quote_id = ?").all(id);
  const purchaseOrderService = require("./purchaseOrderService");
  const today = nowIso().slice(0, 10);

  // Existing PO coverage — never re-order lines that are already sourced.
  const preCovered = [];

  if (quotation.enquiry_id) {
    const enquiry = db.prepare("SELECT po_id, po_ids, status FROM enquiries WHERE id = ?").get(quotation.enquiry_id);
    if (enquiry && enquiry.status === "confirmed") {
      if (enquiry.po_id) preCovered.push(enquiry.po_id);
      if (enquiry.po_ids) {
        try {
          const arr = JSON.parse(enquiry.po_ids);
          if (Array.isArray(arr)) arr.forEach((p) => preCovered.push(p));
        } catch (e) { /* ignore */ }
      }
    }
  }

  const bySupplier = {};
  const missingSupplier = [];

  for (const it of items) {
    if (String(it.source) !== "procurement") continue;

    // Line tied to an approved supplier quote that already produced a PO -> covered.
    if (it.sq_id) {
      const sq = db.prepare("SELECT po_id FROM supplier_quotes WHERE id = ?").get(it.sq_id);
      if (sq && sq.po_id) { preCovered.push(sq.po_id); continue; }
    }
    // Lead already confirmed with PO(s) -> covered.
    if (quotation.enquiry_id) {
      const enquiry = db.prepare("SELECT po_id, po_ids, status FROM enquiries WHERE id = ?").get(quotation.enquiry_id);
      if (enquiry && enquiry.status === "confirmed" && (enquiry.po_id || enquiry.po_ids)) {
        if (enquiry.po_id) preCovered.push(enquiry.po_id);
        try {
          const arr = JSON.parse(enquiry.po_ids || "[]");
          if (Array.isArray(arr)) arr.forEach((p) => preCovered.push(p));
        } catch (e) { /* ignore */ }
        continue;
      }
    }

    if (!it.supplier_id) {
      missingSupplier.push(it.product_name || it.product_id || "Item");
      continue;
    }

    (bySupplier[it.supplier_id] = bySupplier[it.supplier_id] || []).push(it);
  }

  if (missingSupplier.length) {
    throw new Error(`Cannot convert: procurement items need a supplier assigned — ${missingSupplier.join(", ")}`);
  }

  const createdPos = [];

  const transaction = db.transaction(() => {
    for (const [supplierId, lines] of Object.entries(bySupplier)) {
      const poItems = lines.map((it) => {
        let unitCost = 0;
        if (it.sq_id) {
          const sq = db.prepare("SELECT id FROM supplier_quotes WHERE id = ?").get(it.sq_id);
          if (sq) {
            const sqItems = db.prepare("SELECT * FROM supplier_quote_items WHERE quote_id = ?").all(sq.id);
            const sqItem = sqItems.find((x) =>
              (x.product_id && it.product_id && String(x.product_id) === String(it.product_id)) ||
              String(x.product_name || "").trim().toLowerCase() === String(it.product_name || "").trim().toLowerCase()
            );
            if (sqItem) unitCost = Number(sqItem.unit_cost) || 0;
          }
        }
        if (!unitCost) {
          const raw = Number(it.unit_cost) || 0;
          // Enquiry-sourced quotations store cost as a line total; composer ones store per-unit.
          unitCost = quotation.enquiry_id ? Math.round(raw / Math.max(1, Number(it.quantity) || 1)) : raw;
        }
        return {
          productId: it.product_id || null,
          productName: it.product_name || "Product",
          quantity: Number(it.quantity) || 1,
          unitCost
        };
      });

      const po = purchaseOrderService.createPurchaseOrder({
        supplierId,
        poDate: today,
        notes: `From quotation ${quotation.quote_number} (${quotation.customer_name})`,
        items: poItems,
        serviceRequestId: quotation.service_request_id || null
      });
      createdPos.push(po);
    }

    const allPoIds = [...new Set([...createdPos.map((p) => p.id), ...preCovered])];
    db.prepare("UPDATE sales_quotations SET status = 'converted', converted_at = ?, po_ids = ? WHERE id = ?")
      .run(nowIso(), allPoIds.length ? JSON.stringify(allPoIds) : null, id);
  });
  transaction();

  return { poIds: createdPos.map((p) => p.id), poNumbers: createdPos.map((p) => p.poNumber), preCovered };
};

const deleteQuotation = (id) => {
  const quotation = db.prepare("SELECT id, status FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) throw new Error("Quotation not found");
  if (quotation.status === "converted") throw new Error("Converted quotations cannot be deleted");

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM sales_quotation_items WHERE quote_id = ?").run(id);
    db.prepare("DELETE FROM sales_quotations WHERE id = ?").run(id);
  });
  transaction();
};

// Keep the Sales Quotations module in sync with quotes prepared inside the Leads (enquiry) module.
// Creates the first quotation, then updates it in place on re-sends so the lead never accumulates duplicates.
const upsertQuotationFromEnquiry = (enquiry, options, actorName, validUntil) => {
  if (!enquiry || !Array.isArray(options) || !options.length) return null;

  const validUntilValue = validUntil || enquiry.valid_until || null;
  const items = options.map(o => ({
    productId: o.productId || null,
    productName: String(o.name || o.productName || "Product").trim() || "Product",
    quantity: Number(o.quantity) || 1,
    unitPrice: Number(o.quotedPrice) || 0,
    unitCost: Number(o.costPrice) || 0,
    source: o.source === "procurement" ? "procurement" : "inventory",
    supplierId: o.supplierId || null,
    sqId: o.sqId || null,
    sqNumber: o.sqNumber || null
  }));
  const total = items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0);
  const existing = getByEnquiryId(enquiry.id);

  const transaction = db.transaction(() => {
    if (existing) {
      db.prepare(`UPDATE sales_quotations SET customer_name = ?, customer_mobile = ?, customer_address = ?, quote_date = ?, valid_until = ?, total_amount = ?, notes = ?, service_request_id = ? WHERE id = ?`)
        .run(
          String(enquiry.customer_name).trim(),
          enquiry.customer_mobile || null,
          enquiry.visit_address || null,
          nowIso().slice(0, 10),
          validUntilValue,
          total,
          enquiry.notes || null,
          enquiry.service_request_id || null,
          existing.id
        );
      db.prepare("DELETE FROM sales_quotation_items WHERE quote_id = ?").run(existing.id);
      const insertItem = db.prepare(`INSERT INTO sales_quotation_items (id, quote_id, product_id, product_name, quantity, unit_price, unit_cost, source, supplier_id, sq_id, sq_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
      for (const it of items) insertItem.run(makeId("sqi"), existing.id, it.productId, it.productName, it.quantity, it.unitPrice, it.unitCost, it.source, it.supplierId, it.sqId, it.sqNumber);
      return { id: existing.id, quoteNumber: existing.quote_number, action: "updated" };
    }

    const id = makeId("squot");
    const quoteNumber = getQuoteSeq();
    db.prepare(`INSERT INTO sales_quotations (id, quote_number, customer_name, customer_mobile, customer_address, quote_date, valid_until, total_amount, status, notes, created_by, created_at, service_request_id, enquiry_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`)
      .run(
        id,
        quoteNumber,
        String(enquiry.customer_name).trim(),
        enquiry.customer_mobile || null,
        enquiry.visit_address || null,
        nowIso().slice(0, 10),
        validUntilValue,
        total,
        enquiry.notes || null,
        actorName,
        nowIso(),
        enquiry.service_request_id || null,
        enquiry.id
      );
    const insertItem = db.prepare(`INSERT INTO sales_quotation_items (id, quote_id, product_id, product_name, quantity, unit_price, unit_cost, source, supplier_id, sq_id, sq_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const it of items) insertItem.run(makeId("sqi"), id, it.productId, it.productName, it.quantity, it.unitPrice, it.unitCost, it.source, it.supplierId, it.sqId, it.sqNumber);
    return { id, quoteNumber, action: "created" };
  });
  return transaction();
};

const XLSX = require("exceljs");

const exportQuotationXlsx = async (id, optionTier = null) => {
  const quotation = db.prepare("SELECT * FROM sales_quotations WHERE id = ?").get(id);
  if (!quotation) throw new Error("Quotation not found");

  const optionFilter = optionTier ? "AND option_tier = ?" : "";
  const query = `SELECT * FROM sales_quotation_items WHERE quote_id = ? ${optionFilter} ORDER BY rowid`;
  let items = optionTier ? db.prepare(query).all(id, optionTier) : db.prepare(query).all(id);
  if (optionTier && items.length === 0) {
    items = db.prepare("SELECT * FROM sales_quotation_items WHERE quote_id = ? ORDER BY rowid").all(id);
  }

  const filteredTotal = items.reduce((s, it) => s + (Number(it.unit_price) * Number(it.quantity)), 0);
  const displayTotal = optionTier ? filteredTotal : quotation.total_amount;
  const quoteTitle = "SALES QUOTATION" + (optionTier ? ` (${optionTier.toUpperCase()})` : "");

  const wb = new XLSX.Workbook();
  const ws = wb.addWorksheet("Quotation");
  const NAVY = "FF1B2A5B";
  const BLUE = "FF2563EB";
  const MONEY = "FF059669";

  ws.getCell("A1").value = quoteTitle;
  ws.getCell("A1").font = { bold: true, size: 18, color: { argb: NAVY } };

  ws.getCell("A3").value = "Quote Number:"; ws.getCell("B3").value = quotation.quote_number;
  ws.getCell("A4").value = "Quote Date:"; ws.getCell("B4").value = quotation.quote_date;
  ws.getCell("A5").value = "Valid Until:"; ws.getCell("B5").value = quotation.valid_until || "—";

  ws.getCell("D3").value = "Customer:"; ws.getCell("E3").value = quotation.customer_name;
  ws.getCell("D4").value = "Mobile:"; ws.getCell("E4").value = quotation.customer_mobile || "—";
  ws.getCell("D5").value = "Address:"; ws.getCell("E5").value = quotation.customer_address || "—";

  const headers = ["#", "Item / Description", "Source", "Qty", "Rate", "Amount"];
  const headerRow = ws.getRow(7);
  headers.forEach((h, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", horizontal: idx >= 3 ? "right" : "left" };
  });
  headerRow.height = 20;

  let rIdx = 8;
  items.forEach((it, idx) => {
    const row = ws.getRow(rIdx++);
    const lineTotal = (Number(it.unit_price) || 0) * (Number(it.quantity) || 1);
    row.getCell(1).value = idx + 1;
    row.getCell(2).value = it.product_name;
    row.getCell(3).value = it.source || "inventory";
    row.getCell(4).value = it.quantity;
    row.getCell(5).value = Number(it.unit_price) || 0;
    row.getCell(6).value = lineTotal;

    row.eachCell((cell, colNum) => {
      cell.alignment = { vertical: "middle", horizontal: colNum >= 4 ? "right" : "left" };
      if (colNum === 6 || colNum === 5) {
        cell.numFmt = '"Rs. "#,##0';
        cell.font = { color: { argb: MONEY }, bold: true };
      }
    });
  });

  const totalRow = ws.getRow(rIdx + 1);
  totalRow.getCell(5).value = "GRAND TOTAL:";
  totalRow.getCell(5).font = { bold: true, color: { argb: NAVY } };
  totalRow.getCell(6).value = displayTotal;
  totalRow.getCell(6).numFmt = '"Rs. "#,##0';
  totalRow.getCell(6).font = { bold: true, color: { argb: MONEY }, size: 12 };

  ws.columns = [
    { width: 6 }, { width: 35 }, { width: 15 },
    { width: 10 }, { width: 15 }, { width: 18 }
  ];

  const buffer = await wb.xlsx.writeBuffer();
  return { buffer: Buffer.from(buffer), filename: `${quotation.quote_number || id}.xlsx` };
};

module.exports = {
  getQuotations,
  getQuotationById,
  getByServiceRequest,
  getByEnquiryId,
  createQuotation,
  updateQuotation,
  convertQuotation,
  deleteQuotation,
  upsertQuotationFromEnquiry,
  exportQuotationXlsx
};
