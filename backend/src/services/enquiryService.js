const { db, makeId, nowIso } = require("../../db");
const { syncCustomerToParties } = require("./customerService");

const createEnquiryRecord = ({
  customerName,
  mobile,
  type,
  productInterest,
  visitAddress,
  preferredDate,
  budget,
  notes,
  supplierId,
  productId,
  quantity,
  costPrice,
  leadSource
}) => {
  syncCustomerToParties(customerName, mobile);
  const id = makeId("enquiry");
  db.prepare(`
    INSERT INTO enquiries (id, customer_name, customer_mobile, type, product_interest, visit_address, preferred_date, budget, status, notes, created_at, supplier_id, product_id, quantity, cost_price, lead_source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    customerName,
    mobile,
    type,
    productInterest || null,
    visitAddress || null,
    preferredDate || null,
    Number(budget) || null,
    notes || null,
    nowIso(),
    supplierId || null,
    productId || null,
    Number(quantity) || 1,
    Number(costPrice) || 0,
    leadSource || "Walk-in"
  );
  return id;
};

const getEnquiries = (status) => {
  const base = "SELECT e.*, pt.name as supplier_name FROM enquiries e LEFT JOIN parties pt ON e.supplier_id = pt.id";
  const filter = status && status !== "all" ? `${base} WHERE e.status = ? ORDER BY e.created_at DESC`
                                             : `${base} ORDER BY e.created_at DESC`;
  return status && status !== "all" ? db.prepare(filter).all(status) : db.prepare(filter).all();
};

const getEnquiryById = (id) => {
  return db.prepare("SELECT * FROM enquiries WHERE id = ?").get(id);
};

const updateEnquiry = (id, data, updatedBy) => {
  const sets = [];
  const params = [];

  if (data.status) { sets.push("status = ?"); params.push(data.status); }
  if (data.notes !== undefined) { sets.push("notes = ?"); params.push(data.notes || null); }
  if (data.supplierId !== undefined) { sets.push("supplier_id = ?"); params.push(data.supplierId || null); }
  if (data.costPrice !== undefined) { sets.push("cost_price = ?"); params.push(Number(data.costPrice) || 0); }
  if (data.quotedPrice !== undefined) { sets.push("quoted_price = ?"); params.push(Number(data.quotedPrice) || 0); }
  if (data.quantity !== undefined) { sets.push("quantity = ?"); params.push(Number(data.quantity) || 1); }
  if (data.productId !== undefined) { sets.push("product_id = ?"); params.push(data.productId || null); }
  if (data.quoteOptions !== undefined) { sets.push("quote_options = ?"); params.push(data.quoteOptions || null); }
  if (data.leadSource !== undefined) { sets.push("lead_source = ?"); params.push(data.leadSource || "Walk-in"); }

  if (updatedBy) { sets.push("updated_by = ?"); params.push(updatedBy); }

  if (sets.length === 0) return;

  params.push(id);
  db.prepare(`UPDATE enquiries SET ${sets.join(", ")} WHERE id = ?`).run(...params);
};

const quoteEnquiry = (id, data, updatedBy) => {
  const optionsJson = data.quoteOptions && Array.isArray(data.quoteOptions) ? JSON.stringify(data.quoteOptions) : null;
  const firstOption = data.quoteOptions && Array.isArray(data.quoteOptions) && data.quoteOptions.length ? data.quoteOptions[0] : null;
  const selSupplierId = firstOption ? firstOption.supplierId : data.supplierId;
  const selCostPrice = firstOption ? Number(firstOption.costPrice) || 0 : Number(data.costPrice) || 0;
  const selQuotedPrice = firstOption ? Number(firstOption.quotedPrice) || 0 : Number(data.quotedPrice);
  const selQuantity = firstOption ? Number(firstOption.quantity) || 1 : Number(data.quantity) || 1;
  const selProductId = firstOption ? firstOption.productId : data.productId;

  db.prepare(`
    UPDATE enquiries SET status = 'quoted', supplier_id = ?, cost_price = ?, quoted_price = ?, quantity = ?, product_id = ?, quote_options = ?, notes = COALESCE(?, notes), updated_by = ? WHERE id = ?
  `).run(selSupplierId, selCostPrice, selQuotedPrice, selQuantity, selProductId || null, optionsJson, data.notes || null, updatedBy, id);
};

const confirmEnquiry = (id, advanceData, updatedBy) => {
  const enquiry = getEnquiryById(id);
  if (!enquiry) return { error: "Enquiry not found" };

  const poId = makeId("po");
  const poSeq = db.prepare("SELECT COUNT(*) as c FROM purchase_orders").get().c + 1;
  const poNumber = `PO-${String(poSeq).padStart(4, "0")}`;
  const today = nowIso().slice(0, 10);
  const poTotal = (Number(enquiry.cost_price) || 0) * (Number(enquiry.quantity) || 1);

  const transaction = db.transaction(() => {
    db.prepare(`INSERT INTO purchase_orders (id, po_number, supplier_id, po_date, expected_date, notes, status, total_amount, created_at) VALUES (?, ?, ?, ?, ?, ?, 'ordered', ?, ?)`)
      .run(poId, poNumber, enquiry.supplier_id, today, null, `From enquiry ${enquiry.id}`, poTotal, nowIso());
    db.prepare(`INSERT INTO purchase_order_items (id, po_id, product_id, product_name, quantity, unit_cost) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(makeId("poi"), poId, enquiry.product_id || null, enquiry.product_interest || "Product", Number(enquiry.quantity) || 1, Number(enquiry.cost_price) || 0);
    db.prepare(`
        UPDATE enquiries
        SET status = 'confirmed', po_id = ?,
            customer_advance_amount = ?, customer_advance_mode = ?, customer_advance_date = ?,
            supplier_advance_amount = ?, supplier_advance_mode = ?, supplier_advance_date = ?,
            updated_by = ?
        WHERE id = ?
    `).run(
        poId,
        advanceData.customerAdvanceAmount, advanceData.customerAdvanceMode, advanceData.customerAdvanceDate,
        advanceData.supplierAdvanceAmount, advanceData.supplierAdvanceMode, advanceData.supplierAdvanceDate,
        updatedBy, id
    );
  });
  transaction();
  return { poId, poNumber };
};

const deliverEnquiry = (id, paymentData, updatedBy) => {
  const { received, mode, date } = paymentData;
  db.prepare("UPDATE enquiries SET status = 'delivered', final_received = ?, final_mode = ?, final_date = ?, updated_by = ? WHERE id = ?")
    .run(Number(received) || 0, mode || null, date || nowIso().slice(0, 10), updatedBy, id);
};

const deleteEnquiry = (id) => {
  db.prepare("DELETE FROM enquiries WHERE id = ?").run(id);
};

module.exports = {
  createEnquiryRecord,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  quoteEnquiry,
  confirmEnquiry,
  deliverEnquiry,
  deleteEnquiry
};
