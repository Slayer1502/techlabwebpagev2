const { db, nowIso } = require("../../db");
const { mapProductPricing } = require("../utils/productHelpers");

const getAdminDashboardData = (limit, offset) => {
  const staff = db.prepare(`
    SELECT id, name, email, mobile, role
    FROM users
    WHERE role IN ('employee', 'sales', 'technician')
    ORDER BY role, name
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  const orders = db.prepare("SELECT id, bill_number, customer_name, total_amount, taxable_amount, cgst_total, sgst_total, gst_total, status, created_at FROM product_orders ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset);
  const requests = db.prepare("SELECT * FROM service_requests ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset);
  const products = db
    .prepare(`
      SELECT p.id, p.type, p.name, p.price, p.description, p.discount_percent, p.stock, p.updated_by_employee_name, p.supplier_id, s.name as supplier_name, p.hsn_code, p.gst_rate,
             p.unit_type, p.base_unit, p.sub_unit, p.conversion_factor, p.loose_stock, p.min_stock
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.active = 1
      ORDER BY p.name
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset)
    .map(mapProductPricing)
    .filter(Boolean);

  const totalRevenue = (db.prepare("SELECT SUM(total_amount) as total FROM product_orders").get().total || 0) +
                       (db.prepare("SELECT SUM(bill_amount) as total FROM service_requests").get().total || 0);

  const totalProductValue = db.prepare("SELECT SUM(price * stock) as total FROM products WHERE active = 1").get().total || 0;

  const stats = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM service_requests WHERE status = 'Pending') as pendingScheduling,
      (SELECT COUNT(*) FROM service_requests WHERE status = 'Completed') as completedVisits,
      (SELECT COUNT(*) FROM users WHERE role IN ('employee', 'sales', 'technician')) as staffCount,
      (SELECT COUNT(*) FROM product_orders) as orderCount,
      (SELECT COUNT(*) FROM products WHERE active = 1) as productCount,
      (SELECT COUNT(*) FROM service_requests) as requestCount,
      (SELECT COUNT(*) FROM users WHERE role = 'customer') as customerCount,
      (SELECT COUNT(*) FROM parties) as partyCount,
      (SELECT COALESCE(SUM(COALESCE(total_cost,0) - COALESCE(amount_paid,0)),0) FROM purchases WHERE payment_status != 'paid') +
      (SELECT COALESCE(SUM(total_amount),0) FROM purchase_orders WHERE status NOT IN ('received', 'cancelled')) +
      (SELECT COALESCE(SUM(bill_amount - COALESCE(amount_paid,0) - COALESCE(discount_amount,0)),0) FROM service_requests WHERE bill_status = 'billed' AND payment_status != 'paid' AND status != 'Canceled') +
      (SELECT COALESCE(SUM(total_amount),0) FROM product_orders WHERE payment_status != 'paid' AND status NOT IN ('Cancelled', 'Demo')) as totalDues
    FROM users LIMIT 1
  `).get();

  const todayStr = nowIso().slice(0, 10);
  const todayCashSrv = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM service_payments WHERE payment_mode='Cash' AND paid_at=?").get(todayStr).t || 0;
  const todayUpiSrv = db.prepare("SELECT COALESCE(SUM(amount),0) as t FROM service_payments WHERE payment_mode='UPI' AND paid_at=?").get(todayStr).t || 0;
  const todayCashOrd = db.prepare("SELECT SUM(total_amount) as t FROM product_orders WHERE payment_status='paid' AND payment_mode='Cash' AND payment_date=?").get(todayStr).t || 0;
  const todayUpiOrd = db.prepare("SELECT SUM(total_amount) as t FROM product_orders WHERE payment_status='paid' AND payment_mode='UPI' AND payment_date=?").get(todayStr).t || 0;

  const summary = {
    staff: stats.staffCount,
    orders: stats.orderCount,
    products: stats.productCount,
    serviceRequests: stats.requestCount,
    pendingScheduling: stats.pendingScheduling,
    revenue: totalRevenue,
    productValue: totalProductValue,
    completedVisits: stats.completedVisits,
    activeCustomers: stats.customerCount,
    partyCount: stats.partyCount,
    totalDues: stats.totalDues || 0,
    todayCash: todayCashSrv + todayCashOrd,
    todayUpi: todayUpiSrv + todayUpiOrd,
  };

  return { staff, orders, requests, products, summary };
};

const getSalesDashboardData = (query) => {
  const { limit, offset } = require("../utils/helpers").parsePagination(query, 1000);
  const products = db
    .prepare(`
      SELECT p.id, p.type, p.name, p.price, p.description, p.discount_percent, p.stock, p.updated_by_employee_name, p.supplier_id, s.name as supplier_name, p.hsn_code, p.gst_rate,
             p.unit_type, p.base_unit, p.sub_unit, p.conversion_factor, p.loose_stock, p.min_stock
      FROM products p
      LEFT JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.active = 1
      ORDER BY p.name
      LIMIT ? OFFSET ?
    `)
    .all(limit, offset)
    .map(mapProductPricing)
    .filter(Boolean);

  const { limit: sLimit, offset: sOffset } = require("../utils/helpers").parsePagination(query);
  const serviceRequests = db.prepare(`
    SELECT r.*,
           (SELECT id FROM delivery_challans WHERE source_type = 'service' AND source_id = r.id ORDER BY created_at DESC, id DESC LIMIT 1) as linked_dc_id,
           (SELECT json_group_array(id) FROM (SELECT id FROM delivery_challans WHERE source_type = 'service' AND source_id = r.id ORDER BY created_at ASC, id ASC)) as linked_dc_ids_json
    FROM service_requests r
    ORDER BY r.created_at DESC
    LIMIT ? OFFSET ?
  `).all(sLimit, sOffset).map((r) => {
    try {
      const arr = JSON.parse(r.linked_dc_ids_json || "[]");
      r.linked_dc_ids = Array.isArray(arr) ? arr : [];
    } catch (e) {
      r.linked_dc_ids = [];
    }
    delete r.linked_dc_ids_json;
    return r;
  });

  const pendingServices = db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE status = 'Pending'").get().count;
  const scheduledServices = db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE status = 'Scheduled'").get().count;
  const completedServices = db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE status = 'Completed' AND bill_status != 'billed'").get().count;

  const unbilledChallanCount = db.prepare("SELECT COUNT(*) as count FROM delivery_challans WHERE billing_status = 'pending'").get().count;
  const unbilledChallanValue = db.prepare("SELECT SUM(total_value) as total FROM delivery_challans WHERE billing_status = 'pending'").get().total || 0;

  const pendingPartCount = db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE part_request_status = 'requested'").get().count;
  const needsBillingCount = db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE status = 'Completed' AND bill_status != 'billed'").get().count;

  const unpaidServiceCount = db.prepare("SELECT COUNT(*) as count FROM service_requests WHERE bill_status = 'billed' AND payment_status != 'paid'").get().count;
  const unpaidOrderCount = db.prepare("SELECT COUNT(*) as count FROM product_orders WHERE payment_status != 'paid' AND status NOT IN ('Cancelled', 'Demo')").get().count;
  const unpaidBilledCount = unpaidServiceCount + unpaidOrderCount;

  const billedServiceRow = db.prepare("SELECT SUM(bill_amount) as total FROM service_requests WHERE bill_status = 'billed'").get();
  const billedOrderRow = db.prepare("SELECT SUM(total_amount) as total FROM product_orders WHERE status NOT IN ('Cancelled', 'Demo')").get();
  const totalBilledValue = (billedServiceRow.total || 0) + (billedOrderRow.total || 0);

  const today = nowIso().slice(0, 10);
  const todayCashServices = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM service_payments WHERE payment_mode = 'Cash' AND paid_at = ?").get(today).total || 0;
  const todayUpiServices = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM service_payments WHERE payment_mode = 'UPI' AND paid_at = ?").get(today).total || 0;

  const todayCashOrders = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM order_payments WHERE payment_mode = 'Cash' AND paid_at = ?").get(today).total || 0;
  const todayUpiOrders = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM order_payments WHERE payment_mode = 'UPI' AND paid_at = ?").get(today).total || 0;

  const monthStart = `${today.slice(0, 7)}-01`;
  const monthlyReceivedServices = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM service_payments WHERE paid_at >= ?").get(monthStart).total || 0;
  const monthlyReceivedOrders = db.prepare("SELECT COALESCE(SUM(amount),0) as total FROM order_payments WHERE paid_at >= ?").get(monthStart).total || 0;
  const monthlyRevenue = monthlyReceivedServices + monthlyReceivedOrders;

  const productCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE active = 1").get().count;
  const lowStockCount = db.prepare("SELECT COUNT(*) as count FROM products WHERE active = 1 AND stock < 5").get().count;
  const catalogValueRow = db.prepare("SELECT SUM(price * stock) as total FROM products WHERE active = 1").get();
  const catalogValue = (catalogValueRow && catalogValueRow.total) || 0;

  const recentOrders = db.prepare(`
    SELECT id, customer_name, total_amount, status, created_at, payment_status
    FROM product_orders
    ORDER BY created_at DESC, id DESC
    LIMIT 5
  `).all();

  const recentEnquiries = db.prepare(`
    SELECT id, customer_name, type, product_interest, status, created_at
    FROM enquiries
    WHERE status = 'new'
    ORDER BY created_at DESC
    LIMIT 5
  `).all();

  const supplierDuesRow = db.prepare(`
    SELECT COALESCE(SUM(total_cost - amount_paid), 0) as total
    FROM purchases
    WHERE payment_status != 'paid'
  `).get();
  const supplierDues = supplierDuesRow.total || 0;

  // Profit & Loss calculation
  const totalSalesIncome = db.prepare("SELECT COALESCE(SUM(total_amount),0) AS total FROM product_orders WHERE status != 'Cancelled'").get().total;
  const totalServiceIncome = db.prepare("SELECT COALESCE(SUM(bill_amount),0) AS total FROM service_requests WHERE bill_status = 'billed'").get().total;
  const totalPurchaseExpense = db.prepare("SELECT COALESCE(SUM(total_cost),0) AS total FROM purchases").get().total;
  const totalConveyanceExpense = db.prepare("SELECT COALESCE(SUM(conveyance_expense),0) AS total FROM service_requests WHERE status = 'Completed'").get().total;

  const totalIncome = totalSalesIncome + totalServiceIncome;
  const totalExpense = totalPurchaseExpense + totalConveyanceExpense;
  const netProfit = totalIncome - totalExpense;

  const summary = {
    todayCash: todayCashServices + todayCashOrders,
    todayUpi: todayUpiServices + todayUpiOrders,
    todayTotal: todayCashServices + todayCashOrders + todayUpiServices + todayUpiOrders,
    monthlyRevenue,
    pendingServices,
    scheduledServices,
    completedServices,
    unbilledChallanCount,
    unbilledChallanValue,
    pendingPartCount,
    needsBillingCount,
    unpaidBilledCount,
    totalBilledValue,
    productCount,
    lowStockCount,
    catalogValue,
    supplierDues,
    financials: {
      totalIncome,
      totalExpense,
      netProfit,
      salesIncome: totalSalesIncome,
      serviceIncome: totalServiceIncome,
      purchaseExpense: totalPurchaseExpense,
      conveyanceExpense: totalConveyanceExpense
    }
  };

  return { products, requests: serviceRequests, summary, recentOrders, recentEnquiries };
};

const getSalesDashboardDetails = (type) => {
  let data = [];
  if (type === "pending") {
    data = db.prepare("SELECT id, customer_name, device_type, issue, preferred_date as date FROM service_requests WHERE status = 'Pending' ORDER BY created_at DESC").all();
  } else if (type === "scheduled") {
    data = db.prepare("SELECT id, customer_name, device_type, service_person as tech, scheduled_date as date FROM service_requests WHERE status = 'Scheduled' ORDER BY scheduled_date ASC").all();
  } else if (type === "completed") {
    data = db.prepare("SELECT id, customer_name, device_type, bill_status, estimated_cost FROM service_requests WHERE status = 'Completed' AND bill_status != 'billed' ORDER BY completed_at DESC").all();
  } else if (type === "needs_action") {
    const parts = db.prepare("SELECT id, customer_name, 'Part Needed' as reason, requested_parts as detail FROM service_requests WHERE part_request_status = 'requested'").all();
    const billing = db.prepare("SELECT id, customer_name, 'Billing Needed' as reason, device_type as detail FROM service_requests WHERE status = 'Completed' AND bill_status != 'billed'").all();
    data = [...parts, ...billing];
  } else if (type === "collection") {
    const unpaidServices = db.prepare("SELECT id, customer_name, (bill_amount - COALESCE(amount_paid, 0) - COALESCE(discount_amount, 0)) as amount, device_type as source FROM service_requests WHERE bill_status = 'billed' AND payment_status != 'paid'").all();
    const unpaidOrders = db.prepare("SELECT id, customer_name, total_amount as amount, 'Product Order' as source FROM product_orders WHERE payment_status != 'paid' AND status NOT IN ('Cancelled', 'Demo')").all();
    data = [...unpaidServices, ...unpaidOrders];
  } else if (type === "low_stock") {
    data = db.prepare("SELECT p.id, p.name, p.stock, s.name as supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.active = 1 AND p.stock < 5 ORDER BY p.stock ASC").all();
  } else if (type === "unbilled_challans") {
    data = db.prepare("SELECT id, challan_number, customer_name, dispatch_date as date, total_value as amount FROM delivery_challans WHERE billing_status = 'pending' ORDER BY created_at DESC").all();
  } else if (type === "total_billed") {
    const sBilled = db.prepare("SELECT id, customer_name, bill_amount as amount, bill_date as date, device_type as type FROM service_requests WHERE bill_status = 'billed'").all();
    const oBilled = db.prepare("SELECT id, customer_name, total_amount as amount, created_at as date, 'Product Sale' as type FROM product_orders WHERE status NOT IN ('Cancelled', 'Demo')").all();
    data = [...sBilled, ...oBilled].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  return data;
};

const getEmployeeDashboardData = () => {
  const requests = db.prepare("SELECT * FROM service_requests ORDER BY created_at DESC").all();
  const summary = {
    assignedRequests: requests.length,
    requested: requests.filter((item) => item.status === "Pending").length,
    scheduled: requests.filter((item) => item.status === "Scheduled").length,
    completed: requests.filter((item) => item.status === "Completed").length,
  };
  return { requests, summary };
};

const getTechnicianDashboardData = (userId, userName) => {
  const requests = db.prepare(`
    SELECT * FROM service_requests
    WHERE (assigned_employee_id = ? OR service_person = ?)
    ORDER BY scheduled_date DESC
  `).all(userId, userName);

  const challanStmt = db.prepare(`
    SELECT * FROM delivery_challans
    WHERE source_type = 'service' AND source_id = ?
    ORDER BY created_at DESC, id DESC LIMIT 1
  `);
  const challanItemsStmt = db.prepare(
    "SELECT id, item_name, qty, unit_price, total_price FROM delivery_challan_items WHERE challan_id = ? ORDER BY id"
  );
  requests.forEach((r) => {
    const challan = challanStmt.get(r.id);
    if (challan) {
      challan.items = challanItemsStmt.all(challan.id);
      r.challan = challan;
    } else {
      r.challan = null;
    }
  });

  const availablePool = db.prepare(`
    SELECT * FROM service_requests
    WHERE (assigned_employee_id IS NULL OR assigned_employee_id = '')
    AND status = 'Pending'
    ORDER BY created_at DESC
  `).all();

  const summary = {
    assignedRequests: requests.length,
    availablePool: availablePool.length,
    pending: requests.filter((item) => item.status === "Pending").length,
    scheduled: requests.filter((item) => item.status === "Scheduled").length,
    completed: requests.filter((item) => item.status === "Completed").length,
  };

  const products = db.prepare("SELECT id, type, name, price, stock, hsn_code, gst_rate FROM products WHERE active = 1 AND (stock > 0 OR type = 'Service') ORDER BY name").all();

  return { requests, availablePool, summary, products };
};

const getCustomerDashboardData = (mobile) => {
  const customer = db.prepare("SELECT id, name, mobile, role FROM users WHERE mobile = ?").get(mobile);
  const orders = db.prepare("SELECT * FROM product_orders WHERE customer_mobile = ? ORDER BY created_at DESC").all(mobile);
  const orderItemsStmt = db.prepare("SELECT product_name, qty FROM order_items WHERE order_id = ?");
  const ordersWithItems = orders.map((order) => ({
    ...order,
    items: orderItemsStmt.all(order.id).map((item) => (item.qty > 1 ? `${item.qty}x ` : '') + item.product_name),
  }));
  const requests = db.prepare("SELECT * FROM service_requests WHERE customer_mobile = ? ORDER BY created_at DESC").all(mobile);
  const enquiries = db.prepare("SELECT * FROM enquiries WHERE customer_mobile = ? ORDER BY created_at DESC").all(mobile);
  const products = db
    .prepare(`
      SELECT id, type, name, price, description, discount_percent, updated_by_employee_name
      FROM products
      WHERE active = 1
      ORDER BY name
    `)
    .all()
    .map(mapProductPricing);
  return { customer, orders: ordersWithItems, requests, products, enquiries };
};

module.exports = {
  getAdminDashboardData,
  getSalesDashboardData,
  getSalesDashboardDetails,
  getEmployeeDashboardData,
  getTechnicianDashboardData,
  getCustomerDashboardData
};
