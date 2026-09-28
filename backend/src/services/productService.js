const { db, makeId, nowIso } = require("../../db");
const { mapProductPricing } = require("../utils/productHelpers");
const { autoHsn } = require("../utils/hsnLookup");

const triggerStockScan = () => {
  try { require("./stockAlertService").scanForAlerts(); } catch (e) {}
};

const getAllActiveProducts = (limit, offset) => {
  return db
    .prepare(`
      SELECT id, type, name, price, description, discount_percent, stock, updated_by_employee_name, hsn_code, gst_rate, active, unit_type, base_unit, sub_unit, conversion_factor, loose_stock, image_url,
        (SELECT p.unit_cost FROM purchases p WHERE p.product_id = products.id ORDER BY p.purchase_date DESC, p.created_at DESC LIMIT 1) as last_cost
      FROM products
      WHERE active = 1 AND (stock > 0 OR type = 'Service')
      ORDER BY name
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset)
    .map(mapProductPricing)
    .filter(Boolean);
};

const getProductByName = (name) => {
  return db.prepare("SELECT * FROM products WHERE name = ? AND active = 1").get(name);
};

const getProductById = (id) => {
  return db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(id);
};

const validateSupplier = (supplierId) => {
  return db.prepare("SELECT id FROM parties WHERE id = ? AND is_supplier = 1").get(supplierId);
};

const createOrUpdateProduct = (data, actorName) => {
  const existing = getProductByName(data.name);
  let message = "Product created successfully";
  let productId = null;
  let isUpdate = false;

  const transaction = db.transaction(() => {
    const hsnCode = (data.hsnCode && String(data.hsnCode).trim()) || autoHsn(data.name, data.type) || null;
    if (existing) {
      isUpdate = true;
      productId = existing.id;
      db.prepare(`
        UPDATE products
        SET type = ?, price = ?, description = ?, discount_percent = ?, stock = stock + ?, updated_by_employee_name = ?, supplier_id = ?, hsn_code = ?, gst_rate = ?,
            unit_type = ?, base_unit = ?, sub_unit = ?, conversion_factor = ?, image_url = ?, cost_price = ?
        WHERE id = ?
      `).run(
        data.type,
        data.price,
        data.description,
        data.discountPercent,
        data.stock,
        actorName,
        data.supplierId,
        hsnCode,
        data.gstRate,
        data.unitType,
        data.baseUnit,
        data.subUnit,
        data.conversionFactor,
        data.imageUrl || existing.image_url,
        data.costPrice != null && data.costPrice > 0 ? Math.round(data.costPrice) : existing.cost_price,
        productId
      );
      message = `Stock updated for ${data.name} (+${data.stock})`;
    } else {
      productId = makeId("product");
      db.prepare(`
        INSERT INTO products (id, type, name, price, description, discount_percent, stock, updated_by_employee_name, supplier_id, hsn_code, gst_rate, active, unit_type, base_unit, sub_unit, conversion_factor, image_url, cost_price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
      `).run(
        productId,
        data.type,
        data.name,
        data.price,
        data.description,
        data.discountPercent,
        data.stock,
        actorName,
        data.supplierId,
        hsnCode,
        data.gstRate,
        data.unitType,
        data.baseUnit,
        data.subUnit,
        data.conversionFactor,
        data.imageUrl || null,
        data.costPrice != null && data.costPrice > 0 ? Math.round(data.costPrice) : 0
      );
    }

    if (data.costPrice != null && data.costPrice > 0 && data.supplierId && data.stock > 0) {
      const totalCost = data.stock * data.costPrice;
      db.prepare(`
        INSERT INTO purchases (id, supplier_id, product_name, product_id, quantity, unit_cost, total_cost, purchase_date, payment_status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(
        makeId("purchase"),
        data.supplierId,
        data.name,
        productId,
        data.stock,
        data.costPrice,
        totalCost,
        nowIso().slice(0, 10),
        "Auto-recorded from product addition",
        nowIso()
      );
    }
  });

  transaction();
  return { productId, message, isUpdate };
};

const patchProduct = (id, data, actorName) => {
  db.prepare(`
    UPDATE products
    SET type = ?, name = ?, price = ?, description = ?, discount_percent = ?, stock = ?, updated_by_employee_name = ?, supplier_id = ?, hsn_code = ?, gst_rate = ?,
        unit_type = ?, base_unit = ?, sub_unit = ?, conversion_factor = ?, image_url = ?
    WHERE id = ?
  `).run(
    data.type,
    data.name,
    data.price,
    data.description,
    data.discountPercent,
    data.stock,
    actorName,
    data.supplierId,
    data.hsnCode,
    data.gstRate,
    data.unitType,
    data.baseUnit,
    data.subUnit,
    data.conversionFactor,
    data.imageUrl || null,
    id
  );
};

const deleteProduct = (id, actorName) => {
  db.prepare(`
    UPDATE products
    SET active = 0, updated_by_employee_name = ?
    WHERE id = ?
  `).run(actorName, id);
};

const returnStock = (productId, qtyToReturn) => {
  if (!productId || qtyToReturn <= 0) return;
  const p = db.prepare("SELECT id, type, unit_type FROM products WHERE id = ?").get(productId);
  if (!p || p.type === "Service") return;

  if (p.unit_type === 'measurement') {
    db.prepare("UPDATE products SET loose_stock = loose_stock + ? WHERE id = ?").run(qtyToReturn, productId);
  } else {
    db.prepare("UPDATE products SET stock = stock + ? WHERE id = ?").run(qtyToReturn, productId);
  }
  triggerStockScan();
};

const deductStock = (productId, qtyToDeduct) => {
  if (!productId || qtyToDeduct <= 0) return;

  const p = db.prepare("SELECT id, type, unit_type, conversion_factor, stock, loose_stock FROM products WHERE id = ?").get(productId);
  if (!p || p.type === "Service") return;

  if (p.unit_type === 'measurement') {
    let remainingToDeduct = qtyToDeduct;
    let currentLoose = p.loose_stock || 0;
    let currentFullBoxes = p.stock || 0;
    const factor = p.conversion_factor || 1;

    if (currentLoose >= remainingToDeduct) {
      db.prepare("UPDATE products SET loose_stock = loose_stock - ? WHERE id = ?").run(remainingToDeduct, productId);
      return;
    } else {
      remainingToDeduct -= currentLoose;
      currentLoose = 0;
    }

    const boxesNeeded = Math.ceil(remainingToDeduct / factor);
    if (currentFullBoxes >= boxesNeeded) {
      const newFullBoxes = currentFullBoxes - boxesNeeded;
      const addedToLoose = (boxesNeeded * factor) - remainingToDeduct;
      db.prepare("UPDATE products SET stock = ?, loose_stock = ? WHERE id = ?").run(newFullBoxes, addedToLoose, productId);
    } else {
      db.prepare("UPDATE products SET stock = 0, loose_stock = 0 WHERE id = ?").run(productId);
    }
  } else {
    db.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?").run(qtyToDeduct, productId, qtyToDeduct);
  }
  triggerStockScan();
};

module.exports = {
  getAllActiveProducts,
  getProductByName,
  getProductById,
  validateSupplier,
  createOrUpdateProduct,
  patchProduct,
  deleteProduct,
  returnStock,
  deductStock
};
