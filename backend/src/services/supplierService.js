const { db, makeId, nowIso } = require("../../db");

const getAllSuppliers = () => {
  return db.prepare("SELECT * FROM parties WHERE is_supplier = 1 ORDER BY name").all();
};

const getSupplierById = (id) => {
  return db.prepare("SELECT * FROM parties WHERE id = ?").get(id);
};

const getSupplierPurchases = (supplierId) => {
  return db.prepare(`
    SELECT p.*, pt.name as supplier_name
    FROM purchases p
    JOIN parties pt ON p.supplier_id = pt.id
    WHERE p.supplier_id = ?
    ORDER BY p.purchase_date DESC
  `).all(supplierId);
};

const createSupplier = (data) => {
  const id = `party-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`
    INSERT INTO parties (id, name, mobile, email, address, gst_number, contact_person, notes, is_supplier, is_customer, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?)
  `).run(
    id,
    String(data.name).trim(),
    data.mobile || null,
    data.email || null,
    data.address || null,
    data.gstNumber || null,
    data.contactPerson || null,
    data.notes || null,
    nowIso()
  );
  return id;
};

const updateSupplier = (id, data) => {
  db.prepare(`
    UPDATE parties SET name = ?, contact_person = ?, mobile = ?, email = ?, address = ?, gst_number = ?, notes = ?
    WHERE id = ?
  `).run(
    String(data.name).trim(),
    data.contactPerson || null,
    data.mobile || null,
    data.email || null,
    data.address || null,
    data.gstNumber || null,
    data.notes || null,
    id
  );
};

const deleteSupplier = (id) => {
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM purchases WHERE supplier_id = ?").run(id);
    db.prepare("DELETE FROM parties WHERE id = ?").run(id);
  });
  transaction();
};

const getAllPurchases = (status) => {
  let sql = `
    SELECT p.*, pt.name as supplier_name
    FROM purchases p
    LEFT JOIN parties pt ON p.supplier_id = pt.id
  `;
  const params = [];
  if (status === 'paid' || status === 'pending') {
    sql += ` WHERE p.payment_status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY p.purchase_date DESC, p.created_at DESC`;
  return db.prepare(sql).all(...params);
};

const getPendingPurchases = () => {
  return db.prepare(`
    SELECT p.*, pt.name as supplier_name,
      (COALESCE(p.total_cost, 0) - COALESCE(p.amount_paid, 0)) as balance
    FROM purchases p
    JOIN parties pt ON p.supplier_id = pt.id
    WHERE p.payment_status != 'paid'
    ORDER BY p.purchase_date DESC
  `).all();
};

const recordPurchase = (supplierId, data) => {
  const qty = Number(data.quantity) || 1;
  const cost = Number(data.unitCost) || 0;
  const totalCost = qty * cost;
  const purchaseTaxable = data.taxableAmount != null ? Number(data.taxableAmount) : totalCost;
  const purchaseGstRate = Number(data.gstRate ?? 0);
  const purchaseCgst = purchaseGstRate ? Math.round(purchaseTaxable * purchaseGstRate / 2 / 100) : 0;
  const purchaseSgst = purchaseGstRate ? Math.round(purchaseTaxable * purchaseGstRate / 2 / 100) : 0;
  const purchaseGstTotal = purchaseCgst + purchaseSgst;
  const id = makeId("purchase");
  const date = data.purchaseDate || nowIso().slice(0, 10);
  const pStatus = data.paymentStatus === 'pending' ? 'pending' : 'paid';
  const pDate = pStatus === 'paid' ? date : null;

  let finalProductId = data.productId || null;

  const transaction = db.transaction(() => {
    if (!finalProductId) {
      const existingProduct = db.prepare("SELECT id FROM products WHERE name = ? AND active = 1").get(data.productName);
      if (existingProduct) {
        finalProductId = existingProduct.id;
      } else {
        finalProductId = makeId("product");
        const type = data.productType || "Accessory";
        const rate = Number(data.gstRate ?? 18);
        db.prepare(`
          INSERT INTO products (id, type, name, price, description, discount_percent, active, stock, gst_rate)
          VALUES (?, ?, ?, ?, ?, 0, 1, 0, ?)
        `).run(finalProductId, type, data.productName, cost * 1.5, `Automatically created from purchase at ${date}`, rate);
      }
    }

    db.prepare(`
      INSERT INTO purchases (
        id, supplier_id, product_name, product_id, quantity, unit_cost, total_cost, purchase_date,
        invoice_number, payment_status, payment_date, notes, created_at, taxable_amount,
        cgst_total, sgst_total, gst_total, gst_invoice_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, supplierId, data.productName, finalProductId, qty, cost, totalCost, date,
      data.invoiceNumber || null, pStatus, pDate, data.notes || null, nowIso(), purchaseTaxable,
      purchaseCgst, purchaseSgst, purchaseGstTotal, data.gstInvoiceNumber || null
    );

    // Increase stock if payment is settled or even if pending (business preference)
    db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(qty, finalProductId);
  });

  transaction();
  return { id, totalCost, productId: finalProductId };
};

const getPurchaseById = (id) => {
  return db.prepare("SELECT * FROM purchases WHERE id = ?").get(id);
};

const updatePurchasePayment = (id, data) => {
  db.prepare("UPDATE purchases SET payment_status = ?, payment_mode = ?, payment_date = ?, amount_paid = ? WHERE id = ?")
    .run(data.status, data.paymentMode, data.paymentDate, data.amountPaid, id);
};

const deletePurchase = (id) => {
  const purchase = getPurchaseById(id);
  if (!purchase) return;

  const transaction = db.transaction(() => {
    if (purchase.product_id) {
      db.prepare("UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?").run(purchase.quantity, purchase.product_id);
    }
    db.prepare("DELETE FROM purchases WHERE id = ?").run(id);
  });
  transaction();
};

module.exports = {
  getAllSuppliers,
  getSupplierById,
  getSupplierPurchases,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getAllPurchases,
  getPendingPurchases,
  recordPurchase,
  getPurchaseById,
  updatePurchasePayment,
  deletePurchase
};
