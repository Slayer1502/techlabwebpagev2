const { db, nowIso } = require("../../db");

const getParties = (type) => {
  let where = "";
  if (type === 'supplier') where = "WHERE pt.is_supplier = 1";
  else if (type === 'customer') where = "WHERE pt.is_customer = 1";

  const parties = db.prepare(`
    SELECT pt.*,
      (SELECT COALESCE(SUM(p.total_cost), 0) FROM purchases p WHERE p.supplier_id = pt.id) +
      (SELECT COALESCE(SUM(po.total_amount), 0) FROM purchase_orders po WHERE po.supplier_id = pt.id AND po.status NOT IN ('received', 'cancelled')) as total_purchases,
      (SELECT COALESCE(SUM(COALESCE(p.total_cost, 0) - COALESCE(p.amount_paid, 0)), 0) FROM purchases p WHERE p.supplier_id = pt.id AND p.payment_status != 'paid') +
      (SELECT COALESCE(SUM(po.total_amount), 0) FROM purchase_orders po WHERE po.supplier_id = pt.id AND po.status NOT IN ('received', 'cancelled')) as outstanding_balance,
      (SELECT COALESCE(SUM(s.bill_amount - COALESCE(s.amount_paid, 0) - COALESCE(s.discount_amount, 0)), 0) FROM service_requests s
        WHERE s.bill_status = 'billed' AND s.payment_status != 'paid' AND s.status != 'Canceled'
          AND (s.customer_mobile = pt.mobile OR (pt.mobile IS NULL AND LOWER(s.customer_name) = LOWER(pt.name)))) +
      (SELECT COALESCE(SUM(o.total_amount), 0) FROM product_orders o
        WHERE o.payment_status != 'paid' AND o.status NOT IN ('Cancelled', 'Demo')
          AND (o.customer_mobile = pt.mobile OR (pt.mobile IS NULL AND LOWER(o.customer_name) = LOWER(pt.name)))) as customer_due,
      (SELECT COUNT(*) FROM purchases p WHERE p.supplier_id = pt.id) +
      (SELECT COUNT(*) FROM purchase_orders po WHERE po.supplier_id = pt.id AND po.status NOT IN ('received', 'cancelled')) as purchase_count,
      (SELECT COUNT(*) FROM product_orders o WHERE o.customer_mobile = pt.mobile OR (pt.mobile IS NULL AND LOWER(o.customer_name) = LOWER(pt.name))) +
      (SELECT COUNT(*) FROM service_requests s WHERE s.status != 'Canceled' AND (s.customer_mobile = pt.mobile OR (pt.mobile IS NULL AND LOWER(s.customer_name) = LOWER(pt.name)))) as customer_order_count,
      (SELECT COALESCE(SUM(o.total_amount), 0) FROM product_orders o WHERE (o.customer_mobile = pt.mobile OR (pt.mobile IS NULL AND LOWER(o.customer_name) = LOWER(pt.name))) AND o.payment_status = 'paid') +
      (SELECT COALESCE(SUM(s.bill_amount), 0) FROM service_requests s WHERE (s.customer_mobile = pt.mobile OR (pt.mobile IS NULL AND LOWER(s.customer_name) = LOWER(pt.name))) AND s.bill_status = 'billed' AND s.status != 'Canceled') as customer_spent
    FROM parties pt
    ${where}
    ORDER BY pt.name
  `).all().map((pt) => ({ ...pt, dues: (pt.outstanding_balance || 0) + (pt.customer_due || 0) }));

  const summary = {
    total: parties.length,
    suppliers: parties.filter(pt => pt.is_supplier).length,
    customers: parties.filter(pt => pt.is_customer).length,
    outstanding: parties.reduce((s, pt) => s + (pt.outstanding_balance || 0), 0),
    dues: parties.reduce((s, pt) => s + (pt.dues || 0), 0),
    purchaseCount: parties.reduce((s, pt) => s + (pt.purchase_count || 0), 0),
    totalPurchases: parties.reduce((s, pt) => s + (pt.total_purchases || 0), 0)
  };

  return { parties, summary };
};

const getCustomers = () => {
    return db.prepare(`
    SELECT
      mobile,
      MAX(name) as name,
      MAX(address) as address,
      MAX(last_activity) as last_order
    FROM (
      SELECT mobile, name, created_at as last_activity, '' as address FROM users WHERE role = 'customer'
      UNION ALL
      SELECT customer_mobile as mobile, customer_name as name, created_at as last_activity, customer_address as address FROM product_orders
      UNION ALL
      SELECT customer_mobile as mobile, customer_name as name, created_at as last_activity, '' as address FROM service_requests
      UNION ALL
      SELECT mobile, name, created_at as last_activity, address FROM parties WHERE is_customer = 1
    )
    GROUP BY mobile
    ORDER BY last_order DESC
  `).all();
};

const createCustomer = (data) => {
    const id = makeId("customer");
    db.prepare(`INSERT INTO product_orders (id, customer_name, customer_mobile, customer_address, total_amount, status, created_at) VALUES (?, ?, ?, ?, 0, 'Demo', ?)`)
      .run(id, data.name, (data.mobile || "").trim() || "9999999999", data.address || "", nowIso().slice(0, 10));
    return { id, ...data };
};

const getPartyDetail = (id) => {
  const party = db.prepare("SELECT * FROM parties WHERE id = ?").get(id);
  if (!party) return null;

  const purchases = db.prepare("SELECT p.*, pt.name as supplier_name FROM purchases p JOIN parties pt ON p.supplier_id = pt.id WHERE p.supplier_id = ? ORDER BY p.purchase_date DESC").all(id);
  const openPos = db.prepare("SELECT id, po_number, po_date, status, total_amount, created_at FROM purchase_orders WHERE supplier_id = ? AND status NOT IN ('received', 'cancelled') ORDER BY po_date DESC").all(id);
  const orders = db.prepare("SELECT id, customer_name, customer_mobile, total_amount, status, created_at, payment_status FROM product_orders WHERE customer_mobile = ? OR (? IS NULL AND customer_name = ?) ORDER BY created_at DESC").all(party.mobile, party.mobile, party.name);
  const services = db.prepare("SELECT id, customer_name, device_type, status, bill_status, bill_amount, created_at FROM service_requests WHERE status != 'Canceled' AND (customer_mobile = ? OR (? IS NULL AND customer_name = ?)) ORDER BY created_at DESC").all(party.mobile, party.mobile, party.name);

  const pendingChallans = db.prepare(`
    SELECT dc.* FROM delivery_challans dc
    WHERE billing_status = 'pending'
    AND (customer_mobile = ? OR (? IS NULL AND customer_name = ?))
    ORDER BY dispatch_date DESC
  `).all(party.mobile, party.mobile, party.name);

  pendingChallans.forEach(dc => {
    dc.items = db.prepare("SELECT item_name, qty FROM delivery_challan_items WHERE challan_id = ?").all(dc.id);
  });

  return { party, purchases, openPos, orders, services, pendingChallans };
};

const getPartyFlags = (data) => {
  const isBodySupplier = data?.isSupplier != null ? data.isSupplier : (data?.is_supplier != null ? data.is_supplier : null);
  const isBodyCustomer = data?.isCustomer != null ? data.isCustomer : (data?.is_customer != null ? data.is_customer : null);
  return {
    isBodySupplier: isBodySupplier == null ? null : (isBodySupplier ? 1 : 0),
    isBodyCustomer: isBodyCustomer == null ? null : (isBodyCustomer ? 1 : 0)
  };
};

const createParty = (data) => {
  const { name, mobile, email, address, gstNumber, contactPerson, notes } = data;
  const { isBodySupplier, isBodyCustomer } = getPartyFlags(data);
  const isSupplier = isBodySupplier != null ? isBodySupplier : (gstNumber ? 1 : 0);
  const isCustomer = isBodyCustomer != null ? isBodyCustomer : (gstNumber ? 0 : 1);
  const id = `party-${Math.random().toString(36).slice(2, 8)}`;

  db.prepare(`INSERT INTO parties (id, name, mobile, email, address, gst_number, contact_person, notes, is_supplier, is_customer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, String(name).trim(), mobile || null, email || null, address || null, gstNumber || null, contactPerson || null, notes || null, isSupplier, isCustomer, nowIso());

  return id;
};

const updateParty = (id, data) => {
  const party = db.prepare("SELECT id, mobile, is_supplier, is_customer FROM parties WHERE id = ?").get(id);
  if (!party) throw new Error("Party not found");

  const { name, mobile, email, address, gstNumber, contactPerson, notes } = data;
  const { isBodySupplier, isBodyCustomer } = getPartyFlags(data);
  const isSupplier = isBodySupplier != null ? isBodySupplier : party.is_supplier;
  const isCustomer = isBodyCustomer != null ? isBodyCustomer : party.is_customer;

  const cleanName = String(name).trim();

  const transaction = db.transaction(() => {
    db.prepare(`UPDATE parties SET name = ?, mobile = ?, email = ?, address = ?, gst_number = ?, contact_person = ?, notes = ?, is_supplier = ?, is_customer = ? WHERE id = ?`)
      .run(cleanName, mobile || null, email || null, address || null, gstNumber || null, contactPerson || null, notes || null, isSupplier, isCustomer, id);

    if (party.mobile) {
      db.prepare("UPDATE enquiries SET customer_name = ?, customer_mobile = ? WHERE customer_mobile = ?").run(cleanName, mobile || party.mobile, party.mobile);
      db.prepare("UPDATE service_requests SET customer_name = ?, customer_mobile = ? WHERE customer_mobile = ?").run(cleanName, mobile || party.mobile, party.mobile);
      db.prepare("UPDATE product_orders SET customer_name = ?, customer_mobile = ? WHERE customer_mobile = ?").run(cleanName, mobile || party.mobile, party.mobile);
      db.prepare("UPDATE delivery_challans SET customer_name = ?, customer_mobile = ? WHERE customer_mobile = ?").run(cleanName, mobile || party.mobile, party.mobile);
      db.prepare("UPDATE sales_quotations SET customer_name = ?, customer_mobile = ? WHERE customer_mobile = ?").run(cleanName, mobile || party.mobile, party.mobile);
    }
  });

  transaction();
};

const deleteParty = (id) => {
    db.prepare("DELETE FROM purchases WHERE supplier_id = ?").run(id);
    db.prepare("DELETE FROM parties WHERE id = ?").run(id);
};

module.exports = {
  getParties,
  getCustomers,
  createCustomer,
  getPartyDetail,
  createParty,
  updateParty,
  deleteParty
};
