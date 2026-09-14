const { db, makeId, nowIso, nextBillNumber } = require("../../db");
const { syncCustomerToParties } = require("./customerService");
const { mapProductPricing } = require("../utils/productHelpers");
const { deductStock } = require("./productService");

const createOrderForCustomer = ({ customerName, mobile, address, items, isGstBill, paymentStatus, paymentMode, paymentDate, createdAt, skipStockDeduction, status }) => {
  if (!items || !items.length) return { error: "No items selected" };

  const isGstEnabled = isGstBill !== 0;
  const orderStatus = status || 'Ordered';

  const processedItems = items.map(cartItem => {
    let p = cartItem.productId ? db.prepare(`SELECT id, name, type, price, discount_percent, hsn_code, gst_rate FROM products WHERE id = ? AND active = 1`).get(cartItem.productId) : null;

    if (!p) {
      p = {
        id: cartItem.productId || null,
        name: cartItem.productName || "Item",
        type: "Item",
        price: Number(cartItem.customPrice) || 0,
        discount_percent: 0,
        hsn_code: null,
        gst_rate: 18
      };
    }

    const mapped = p.id ? mapProductPricing(p) : { finalPrice: p.price, gstAmount: Math.round(p.price * 0.18) };
    const rate = isGstEnabled ? (p.gst_rate || 0) : 0;

    let unitTotal, unitTaxable, unitGst;

    if (cartItem.customPrice != null) {
      unitTotal = Number(cartItem.customPrice);
      if (isGstEnabled && rate > 0) {
        unitTaxable = unitTotal / (1 + (rate / 100));
        unitGst = unitTotal - unitTaxable;
      } else {
        unitTaxable = unitTotal;
        unitGst = 0;
      }
    } else {
      unitTaxable = mapped.finalPrice;
      unitGst = isGstEnabled ? mapped.gstAmount : 0;
      unitTotal = unitTaxable + unitGst;
    }

    return {
      ...p,
      qty: cartItem.qty || 1,
      unitTaxable,
      unitGst,
      unitTotal,
      gstRate: rate
    };
  }).filter(Boolean);

  if (!processedItems.length) {
    return { error: "No valid products selected" };
  }

  syncCustomerToParties(customerName, mobile);

  const orderId = makeId("order");
  const orderDate = createdAt || nowIso().slice(0, 10);
  const billNumber = nextBillNumber(orderDate);

  const taxableAmount = processedItems.reduce((sum, item) => sum + (item.unitTaxable * item.qty), 0);
  const gstTotal = processedItems.reduce((sum, item) => sum + (item.unitGst * item.qty), 0);
  const cgstTotal = processedItems.reduce((sum, item) => sum + (item.gstRate ? Math.round((item.unitTaxable * item.qty) * item.gstRate / 2 / 100) : 0), 0);
  const sgstTotal = processedItems.reduce((sum, item) => sum + (item.gstRate ? Math.round((item.unitTaxable * item.qty) * item.gstRate / 2 / 100) : 0), 0);
  const totalAmount = taxableAmount + gstTotal;

  db.prepare(`
    INSERT INTO product_orders (id, customer_mobile, customer_name, customer_address, total_amount, taxable_amount, cgst_total, sgst_total, igst_total, gst_total, status, created_at, payment_status, payment_mode, payment_date, is_gst_bill, bill_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(orderId, mobile, customerName, address || "", totalAmount, taxableAmount, cgstTotal, sgstTotal, gstTotal, orderStatus, orderDate, paymentStatus || 'pending', paymentMode || null, paymentDate || null, isGstEnabled ? 1 : 0, billNumber);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, product_name, price, hsn_code, gst_rate, taxable_amount, cgst_amount, sgst_amount, qty)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  processedItems.forEach((item) => {
    const lineTaxable = item.unitTaxable * item.qty;
    insertOrderItem.run(
      makeId("order-item"),
      orderId,
      item.id || "product-manual",
      item.name,
      item.unitTotal,
      item.hsn_code || null,
      item.gstRate,
      item.unitTaxable,
      Math.round(lineTaxable * item.gstRate / 2 / 100),
      Math.round(lineTaxable * item.gstRate / 2 / 100),
      item.qty
    );

    if (!skipStockDeduction && item.id && item.type !== "Service") {
      deductStock(item.id, item.qty);
    }
  });

  return { orderId, totalAmount, products: processedItems };
};

const getOrders = (limit, offset) => {
  return db.prepare(`
    SELECT * FROM (
      SELECT
        o.id, o.bill_number, o.customer_name, o.customer_mobile, o.customer_address,
        o.total_amount, o.status, o.created_at, o.payment_status, o.payment_mode,
        (SELECT id FROM delivery_challans WHERE linked_order_id = o.id LIMIT 1) as linked_dc_id,
        'order' as source_type, o.is_gst_bill as is_gst
      FROM product_orders o
      WHERE o.status != 'Cancelled'

      UNION ALL

      SELECT
        s.id, s.bill_number, s.customer_name, s.customer_mobile, '' as customer_address,
        s.bill_amount as total_amount, s.status, COALESCE(s.bill_date, s.created_at) as created_at,
        s.payment_status, s.payment_mode,
        (SELECT id FROM delivery_challans WHERE source_type = 'service' AND source_id = s.id LIMIT 1) as linked_dc_id,
        'service' as source_type, CASE WHEN s.gst_total > 0 THEN 1 ELSE 0 END as is_gst
      FROM service_requests s
      WHERE s.bill_status = 'billed'
    )
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
};

const getNewOrdersCount = () => {
    return db.prepare("SELECT COUNT(*) as count FROM product_orders WHERE status = 'Ordered'").get().count;
};

const getOrderItems = (orderId) => {
    return db.prepare("SELECT id, product_name, price, hsn_code, gst_rate, taxable_amount, cgst_amount, sgst_amount, qty FROM order_items WHERE order_id = ?").all(orderId);
};

const getOrderById = (id) => {
  const order = db.prepare("SELECT * FROM product_orders WHERE id = ?").get(id);
  if (!order) return null;
  const items = getOrderItems(id);
  const payments = db.prepare("SELECT * FROM order_payments WHERE order_id = ? ORDER BY paid_at DESC").all(id);
  return { ...order, items, payments };
};

const updateOrderStatus = (id, status) => {
  db.prepare("UPDATE product_orders SET status = ? WHERE id = ?").run(status, id);
};

const deleteOrder = (id, revertToDc) => {
  const transaction = db.transaction(() => {
    if (revertToDc) {
        db.prepare("UPDATE delivery_challans SET billing_status = 'pending', linked_order_id = NULL WHERE linked_order_id = ?").run(id);
    }
    db.prepare("DELETE FROM order_items WHERE order_id = ?").run(id);
    db.prepare("DELETE FROM order_payments WHERE order_id = ?").run(id);
    db.prepare("DELETE FROM product_orders WHERE id = ?").run(id);
  });
  transaction();
};

const recordOrderPayment = (id, data) => {
    const order = db.prepare("SELECT total_amount, payment_status FROM product_orders WHERE id = ?").get(id);
    if (!order) return { error: "Order not found" };

    const transaction = db.transaction(() => {
        const paidAt = data.paidAt || nowIso().slice(0, 10);
        const amt = Number(data.amount);

        if (amt > 0) {
            db.prepare(`
                INSERT INTO order_payments (id, order_id, amount, payment_mode, paid_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(makeId("pay"), id, amt, data.paymentMode || 'Cash', paidAt, nowIso());
        }

        const totalPaid = db.prepare("SELECT SUM(amount) as total FROM order_payments WHERE id = ?").get(id).total || 0;

        let newStatus = order.payment_status;
        let finalPaymentMode = data.paymentMode;
        if (totalPaid >= order.total_amount) {
            newStatus = 'paid';
            const modes = db.prepare("SELECT DISTINCT payment_mode FROM order_payments WHERE order_id = ?").all(id);
            finalPaymentMode = modes.length > 1 ? 'Mixed' : modes[0].payment_mode;
        } else if (totalPaid > 0) {
            newStatus = 'partial';
        }

        const updateMainStatus = newStatus === 'paid' ? ", status = 'Delivered'" : "";
        db.prepare(`
            UPDATE product_orders
            SET payment_status = ?, payment_mode = ?, payment_date = ? ${updateMainStatus}
            WHERE id = ?
        `).run(newStatus, finalPaymentMode || null, paidAt, id);

        return { totalPaid, remaining: order.total_amount - totalPaid };
    });

    return transaction();
};

module.exports = {
  createOrderForCustomer,
  getOrders,
  getNewOrdersCount,
  getOrderItems,
  getOrderById,
  updateOrderStatus,
  deleteOrder,
  recordOrderPayment
};
