const { db, nowIso, makeId } = require("../../db");
const { formatDateValue, formatCurrencyValue, parsePagination, formatStaffRoleLabel, formatRequestSubjectLabel } = require("../utils/helpers");
const { mapProductPricing } = require("../utils/productHelpers");
const { drawPdfHeader, drawPdfFooter, drawPdfSummaryCards, drawPdfTable, PDF_COLORS } = require("../utils/pdfHelpers");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const reportsDir = path.join(__dirname, "../../../reports");

const REPORT_GROUPS = [
  { id: "sales", label: "Sales" },
  { id: "purchases", label: "Purchases" },
  { id: "financial", label: "Financial" },
  { id: "inventory", label: "Inventory" },
  { id: "operations", label: "Operations" }
];

const REPORTS = [
  { id: "sales_register", group: "sales", title: "Sales Register", desc: "All product order bills (excl. cancelled) in the period.", dated: true, adminOnly: false },
  { id: "service_billing", group: "sales", title: "Service Billing", desc: "All billed service requests in the period.", dated: true, adminOnly: false },
  { id: "gst_summary", group: "sales", title: "GST Tax Summary", desc: "Taxable value, CGST & SGST for tax-paying sales in the period.", dated: true, adminOnly: false },
  { id: "collections", group: "sales", title: "Collections", desc: "Money received (orders + services) split by Cash/UPI in the period.", dated: true, adminOnly: false },
  { id: "purchase_register", group: "purchases", title: "Purchase Register", desc: "All supplier purchases, GST & payment status in the period.", dated: true, adminOnly: false },
  { id: "supplier_dues", group: "purchases", title: "Supplier Dues", desc: "Outstanding balances owed to each supplier (live).", dated: false, adminOnly: false },
  { id: "dues", group: "financial", title: "Outstanding / Dues", desc: "Unpaid balances from customers (orders + services) and suppliers (live).", dated: false, adminOnly: false },
  { id: "daily_take", group: "financial", title: "Daily Take", desc: "Collections received per day in the period.", dated: true, adminOnly: false },
  { id: "profit_loss", group: "financial", title: "Profit & Loss", desc: "Detailed statement of income vs procurement and expenses.", dated: true, adminOnly: false },
  { id: "customer_ledger", group: "financial", title: "Customer / Party Ledger", desc: "Statement of account for a specific customer or supplier.", dated: false, adminOnly: false },
  { id: "products", group: "inventory", title: "Product Catalog", desc: "Full catalog with list & sale price and current stock.", dated: false, adminOnly: false },
  { id: "low_stock", group: "inventory", title: "Low Stock Alert", desc: "Products with stock below 5 units.", dated: false, adminOnly: false },
  { id: "services", group: "operations", title: "Services Log", desc: "All service requests with status & assignment in the period.", dated: true, adminOnly: false },
  { id: "staff", group: "operations", title: "Staff Directory", desc: "Employee / sales / technician directory.", dated: false, adminOnly: true },
  { id: "overview", group: "operations", title: "Business Overview", desc: "Snapshot of orders, services and revenue.", dated: false, adminOnly: true }
];

const resolveReportMeta = (scope) => REPORTS.find(r => r.id === scope) || null;

const nextDay = (d) => {
  const [y, m, day] = String(d || "").split("-").map(Number);
  if (!y || !m || !day) return d;
  const dt = new Date(y, m - 1, day);
  dt.setDate(dt.getDate() + 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

const buildReport = (scope, opts = {}) => {
  const start = String(opts.start || "").slice(0, 10);
  const end = String(opts.end || "").slice(0, 10);
  const endEx = nextDay(end);
  const hasRange = !!(start && end);
  const label = hasRange ? `${start}  to  ${end}` : "All records";
  const live = "Live";
  const money = (n) => formatCurrencyValue(n);

  if (scope === "sales_register") {
    let sql = "SELECT * FROM product_orders WHERE status != 'Cancelled'";
    const params = [];
    if (hasRange) { sql += " AND created_at >= ? AND created_at < ?"; params.push(start, endEx); }
    sql += " ORDER BY created_at DESC";
    const rows = db.prepare(sql).all(...params);
    const total = rows.reduce((s, r) => s + (r.total_amount || 0), 0);
    return {
      filenameBase: `sales-register-${start}-to-${end}`,
      title: "Sales Register",
      summaryItems: [
        { label: "Period", value: label },
        { label: "Bills", value: String(rows.length) },
        { label: "Total Billed", value: money(total) },
        { label: "Total GST", value: money(rows.reduce((s, r) => s + (r.gst_total || 0), 0)) }
      ],
      tableHeaders: [
        { key: "id", label: "Invoice #" },
        { key: "customer", label: "Customer" },
        { key: "amount", label: "Amount" },
        { key: "mode", label: "Mode" },
        { key: "status", label: "Status" },
        { key: "date", label: "Date" }
      ],
      tableRows: rows.map(r => ({
        id: `#${String(r.id).slice(-6)}${r.is_gst_bill ? " (GST)" : ""}`,
        customer: r.customer_name || r.customer_mobile || "—",
        amount: money(r.total_amount),
        mode: r.payment_mode || "—",
        status: r.status,
        date: formatDateValue(r.created_at)
      }))
    };
  }

  if (scope === "service_billing") {
    let sql = `SELECT * FROM service_requests WHERE bill_status = 'billed'`;
    const params = [];
    if (hasRange) { sql += ` AND COALESCE(bill_date, created_at) >= ? AND COALESCE(bill_date, created_at) < ?`; params.push(start, endEx); }
    sql += " ORDER BY COALESCE(bill_date, created_at) DESC";
    const rows = db.prepare(sql).all(...params);
    const total = rows.reduce((s, r) => s + (r.bill_amount || 0), 0);
    return {
      filenameBase: `service-billing-${start}-to-${end}`,
      title: "Service Billing",
      summaryItems: [
        { label: "Period", value: label },
        { label: "Bills", value: String(rows.length) },
        { label: "Total Billed", value: money(total) },
        { label: "Collected", value: money(rows.reduce((s, r) => s + (r.amount_paid || 0), 0)) }
      ],
      tableHeaders: [
        { key: "bill", label: "Bill #" },
        { key: "customer", label: "Customer" },
        { key: "device", label: "Device" },
        { key: "amount", label: "Amount" },
        { key: "paid", label: "Paid" },
        { key: "status", label: "Status" },
        { key: "date", label: "Bill Date" }
      ],
      tableRows: rows.map(r => ({
        bill: r.bill_number || `#${String(r.id).slice(-6)}`,
        customer: r.customer_name || r.customer_mobile || "—",
        device: r.device_type || "—",
        amount: money(r.bill_amount),
        paid: money(r.amount_paid || 0),
        status: r.payment_status || "—",
        date: formatDateValue(r.bill_date || r.created_at)
      }))
    };
  }

  if (scope === "gst_summary") {
    const ordersSql = hasRange
      ? "SELECT id, customer_name, taxable_amount, cgst_total, sgst_total, total_amount, created_at FROM product_orders WHERE is_gst_bill = 1 AND status != 'Cancelled' AND created_at >= ? AND created_at < ?"
      : "SELECT id, customer_name, taxable_amount, cgst_total, sgst_total, total_amount, created_at FROM product_orders WHERE is_gst_bill = 1 AND status != 'Cancelled'";
    const orders = hasRange ? db.prepare(ordersSql).all(start, endEx) : db.prepare(ordersSql).all();

    const sSql = hasRange
      ? `SELECT id, customer_name, taxable_amount, cgst_total, sgst_total, bill_amount AS total_amount, COALESCE(bill_date, created_at) AS created_at, device_type FROM service_requests WHERE bill_status = 'billed' AND (cgst_total > 0 OR sgst_total > 0) AND COALESCE(bill_date, created_at) >= ? AND COALESCE(bill_date, created_at) < ?`
      : `SELECT id, customer_name, taxable_amount, cgst_total, sgst_total, bill_amount AS total_amount, COALESCE(bill_date, created_at) AS created_at, device_type FROM service_requests WHERE bill_status = 'billed' AND (cgst_total > 0 OR sgst_total > 0)`;
    const services = hasRange ? db.prepare(sSql).all(start, endEx) : db.prepare(sSql).all();

    const all = [...orders.map(o => ({ ...o, type: "Sale" })), ...services.map(s => ({ ...s, type: "Service" }))]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const tx = all.reduce((s, i) => s + (i.taxable_amount || 0), 0);
    const cg = all.reduce((s, i) => s + (i.cgst_total || 0), 0);
    const sg = all.reduce((s, i) => s + (i.sgst_total || 0), 0);
    return {
      filenameBase: `gst-summary-${start}-to-${end}`,
      title: "GST Tax Summary",
      summaryItems: [
        { label: "Period", value: label },
        { label: "Taxable Value", value: money(tx) },
        { label: "CGST (9%)", value: money(cg) },
        { label: "SGST (9%)", value: money(sg) },
        { label: "Total Tax", value: money(cg + sg) }
      ],
      tableHeaders: [
        { key: "date", label: "Date" },
        { key: "ref", label: "Ref #" },
        { key: "customer", label: "Customer" },
        { key: "type", label: "Type" },
        { key: "taxable", label: "Taxable" },
        { key: "cgst", label: "CGST" },
        { key: "sgst", label: "SGST" },
        { key: "total", label: "Total" }
      ],
      tableRows: all.map(i => ({
        date: formatDateValue(i.created_at),
        ref: String(i.id).slice(-8).toUpperCase(),
        customer: i.customer_name,
        type: i.type,
        taxable: money(i.taxable_amount),
        cgst: money(i.cgst_total),
        sgst: money(i.sgst_total),
        total: money(i.total_amount)
      }))
    };
  }

  if (scope === "collections") {
    const fetchPmts = (table, join, customerCol) => {
      const sel = hasRange
        ? `${table} pm JOIN ${join} j ON ${table === "order_payments" ? "pm.order_id = j.id" : "pm.service_request_id = j.id"} WHERE pm.paid_at >= ? AND pm.paid_at < ?`
        : `${table} pm JOIN ${join} j ON ${table === "order_payments" ? "pm.order_id = j.id" : "pm.service_request_id = j.id"}`;
      return db.prepare(
        `SELECT pm.amount AS amount, pm.payment_mode AS mode, pm.paid_at AS date, j.${customerCol} AS customer, ${table === "order_payments" ? "'Order'" : "'Service'"} AS source FROM ${sel} ORDER BY pm.paid_at DESC`
      ).all(...(hasRange ? [start, endEx] : []));
    };
    const pts = [
      ...fetchPmts("order_payments", "product_orders", "customer_name"),
      ...fetchPmts("service_payments", "service_requests", "customer_name")
    ];
    const cash = pts.filter(p => p.mode === "Cash").reduce((s, p) => s + p.amount, 0);
    const upi = pts.filter(p => p.mode === "UPI").reduce((s, p) => s + p.amount, 0);
    return {
      filenameBase: `collections-${start}-to-${end}`,
      title: "Collections",
      summaryItems: [
        { label: "Period", value: label },
        { label: "Cash", value: money(cash) },
        { label: "UPI", value: money(upi) },
        { label: "Net Received", value: money(cash + upi) },
        { label: "Payments", value: String(pts.length) }
      ],
      tableHeaders: [
        { key: "date", label: "Date" },
        { key: "source", label: "Source" },
        { key: "customer", label: "Customer" },
        { key: "mode", label: "Mode" },
        { key: "amount", label: "Amount" }
      ],
      tableRows: pts.map(p => ({
        date: formatDateValue(p.date),
        source: p.source,
        customer: p.customer || "—",
        mode: p.mode || "—",
        amount: money(p.amount)
      }))
    };
  }

  if (scope === "purchase_register") {
    let sql = `SELECT p.*, pt.name AS supplier_name FROM purchases p LEFT JOIN parties pt ON p.supplier_id = pt.id WHERE 1=1`;
    const params = [];
    if (hasRange) { sql += ` AND p.purchase_date >= ? AND p.purchase_date < ?`; params.push(start, endEx); }
    sql += " ORDER BY p.purchase_date DESC, p.created_at DESC";
    const rows = db.prepare(sql).all(...params);
    const total = rows.reduce((s, p) => s + (p.total_cost || 0), 0);
    const paid = rows.reduce((s, p) => s + (p.amount_paid || 0), 0);
    const cg = rows.reduce((s, p) => s + (p.cgst_total || 0), 0);
    const sg = rows.reduce((s, p) => s + (p.sgst_total || 0), 0);
    return {
      filenameBase: `purchase-register-${start}-to-${end}`,
      title: "Purchase Register",
      summaryItems: [
        { label: "Period", value: label },
        { label: "Purchases", value: String(rows.length) },
        { label: "Purchase Value", value: money(total) },
        { label: "Amount Paid", value: money(paid) },
        { label: "Balance Due", value: money(total - paid) },
        { label: "Total GST", value: money(cg + sg) }
      ],
      tableHeaders: [
        { key: "date", label: "Date" },
        { key: "invoice", label: "Invoice #" },
        { key: "supplier", label: "Supplier" },
        { key: "product", label: "Product" },
        { key: "qty", label: "Qty" },
        { key: "total", label: "Total" },
        { key: "paid", label: "Paid" },
        { key: "status", label: "Status" }
      ],
      tableRows: rows.map(p => ({
        date: formatDateValue(p.purchase_date),
        invoice: p.invoice_number || (p.id ? `#${String(p.id).slice(-6)}` : "—"),
        supplier: p.supplier_name || "—",
        product: p.product_name || "—",
        qty: p.quantity != null ? String(p.quantity) : "—",
        total: money(p.total_cost),
        paid: money(p.amount_paid || 0),
        status: p.payment_status || "—"
      }))
    };
  }

  if (scope === "products") {
    const products = db.prepare("SELECT id, type, name, price, description, discount_percent, stock, updated_by_employee_name, hsn_code, gst_rate FROM products WHERE active = 1 ORDER BY name").all()
      .map(mapProductPricing).filter(Boolean);
    const discounted = products.filter(p => p.discountPercent > 0).length;
    const avgList = products.length ? Math.round(products.reduce((s, p) => s + p.originalPrice, 0) / products.length) : 0;
    const avgSale = products.length ? Math.round(products.reduce((s, p) => s + p.finalPrice, 0) / products.length) : 0;
    return {
      filenameBase: "product-catalog",
      title: "Product Catalog",
      summaryItems: [
        { label: "Active Products", value: String(products.length) },
        { label: "Discounted", value: String(discounted) },
        { label: "Avg List Price", value: money(avgList) },
        { label: "Avg Sale Price", value: money(avgSale) }
      ],
      tableHeaders: [
        { key: "type", label: "Type" },
        { key: "name", label: "Product" },
        { key: "stock", label: "Stock" },
        { key: "list", label: "List" },
        { key: "sale", label: "Sale" }
      ],
      tableRows: products.map(p => ({
        type: p.type,
        name: p.name,
        stock: String(p.stock),
        list: money(p.originalPrice),
        sale: money(p.finalPrice)
      }))
    };
  }

  if (scope === "low_stock") {
    const rows = db.prepare("SELECT name, type, stock, price FROM products WHERE active = 1 AND stock < 5 ORDER BY stock ASC").all();
    return {
      filenameBase: "low-stock",
      title: "Low Stock Alert",
      summaryItems: [
        { label: "Critical Products", value: String(rows.length) },
        { label: "Threshold", value: "Less than 5 units" }
      ],
      tableHeaders: [
        { key: "name", label: "Product" },
        { key: "type", label: "Type" },
        { key: "stock", label: "In Stock" },
        { key: "price", label: "Unit Price" }
      ],
      tableRows: rows.map(p => ({ name: p.name, type: p.type, stock: String(p.stock), price: money(p.price) }))
    };
  }

  if (scope === "services") {
    let sql = "SELECT * FROM service_requests WHERE 1=1";
    const params = [];
    if (hasRange) { sql += " AND created_at >= ? AND created_at < ?"; params.push(start, endEx); }
    sql += " ORDER BY created_at DESC";
    const rows = db.prepare(sql).all(...params);
    return {
      filenameBase: `services-${start}-to-${end}`,
      title: "Services Log",
      summaryItems: [
        { label: "Period", value: label },
        { label: "Requests", value: String(rows.length) },
        { label: "Pending", value: String(rows.filter(r => r.status === "Pending").length) },
        { label: "Scheduled", value: String(rows.filter(r => r.status === "Scheduled").length) },
        { label: "Completed", value: String(rows.filter(r => r.status === "Completed").length) }
      ],
      tableHeaders: [
        { key: "customer", label: "Customer" },
        { key: "device", label: "Device" },
        { key: "status", label: "Status" },
        { key: "assigned", label: "Assigned" },
        { key: "date", label: "Created" }
      ],
      tableRows: rows.map(r => ({
        customer: r.customer_name || r.customer_mobile || "—",
        device: r.device_type || "—",
        status: r.status || "—",
        assigned: String(r.service_person || r.assigned_employee_name || "—"),
        date: formatDateValue(r.created_at)
      }))
    };
  }

  if (scope === "staff") {
    const rows = db.prepare("SELECT name, role, email, mobile, created_at FROM users WHERE role IN ('employee','sales','technician') ORDER BY role, name").all();
    return {
      filenameBase: "staff-directory",
      title: "Staff Directory",
      summaryItems: [
        { label: "Total Staff", value: String(rows.length) },
        { label: "Employees", value: String(rows.filter(r => r.role === "employee").length) },
        { label: "Sales", value: String(rows.filter(r => r.role === "sales").length) }
      ],
      tableHeaders: [
        { key: "name", label: "Name" },
        { key: "role", label: "Role" },
        { key: "email", label: "Email" },
        { key: "mobile", label: "Mobile" }
      ],
      tableRows: rows.map(r => ({
        name: r.name,
        role: formatStaffRoleLabel(r.role),
        email: r.email || "—",
        mobile: r.mobile || "—"
      }))
    };
  }

  if (scope === "overview") {
    const orders = db.prepare("SELECT id, customer_name, total_amount, status, created_at FROM product_orders ORDER BY created_at DESC").all();
    const requests = db.prepare("SELECT customer_name, device_type, status, scheduled_date, assigned_employee_name FROM service_requests ORDER BY created_at DESC").all();
    const revenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);
    return {
      filenameBase: "business-overview",
      title: "Business Overview",
      summaryItems: [
        { label: "Total Orders", value: String(orders.length) },
        { label: "Sales Revenue", value: money(revenue) },
        { label: "Service Requests", value: String(requests.length) },
        { label: "Completed Jobs", value: String(requests.filter(r => r.status === "Completed").length) }
      ],
      tableHeaders: [
        { key: "id", label: "Order ID" },
        { key: "customer", label: "Customer" },
        { key: "amount", label: "Amount" },
        { key: "status", label: "Status" },
        { key: "date", label: "Date" }
      ],
      tableRows: orders.slice(0, 20).map(o => ({
        id: `#${String(o.id).slice(-6)}`,
        customer: o.customer_name,
        amount: money(o.total_amount),
        status: o.status,
        date: formatDateValue(o.created_at)
      }))
    };
  }

  if (scope === "supplier_dues") {
    const rows = db.prepare(`
      SELECT pt.name AS supplier_name,
        (SELECT COALESCE(SUM(COALESCE(p.total_cost,0) - COALESCE(p.amount_paid,0)),0) FROM purchases p WHERE p.supplier_id = pt.id AND p.payment_status != 'paid')
        + (SELECT COALESCE(SUM(po.total_amount),0) FROM purchase_orders po WHERE po.supplier_id = pt.id AND po.status NOT IN ('received','cancelled')) AS due
      FROM parties pt
      WHERE pt.is_supplier = 1
        AND ((SELECT COALESCE(SUM(COALESCE(p.total_cost,0) - COALESCE(p.amount_paid,0)),0) FROM purchases p WHERE p.supplier_id = pt.id AND p.payment_status != 'paid')
            + (SELECT COALESCE(SUM(po.total_amount),0) FROM purchase_orders po WHERE po.supplier_id = pt.id AND po.status NOT IN ('received','cancelled'))) > 0
      ORDER BY due DESC
    `).all();
    const total = rows.reduce((s, r) => s + (r.due || 0), 0);
    return {
      filenameBase: "supplier-dues",
      title: "Supplier Dues",
      summaryItems: [
        { label: "Status", value: live },
        { label: "Suppliers Owed", value: String(rows.length) },
        { label: "Total Due", value: money(total) }
      ],
      tableHeaders: [
        { key: "supplier", label: "Supplier" },
        { key: "due", label: "Balance Due" }
      ],
      tableRows: rows.map(r => ({ supplier: r.supplier_name, due: money(r.due) }))
    };
  }

  if (scope === "dues") {
    const unpaidServices = db.prepare(`
      SELECT customer_name, customer_mobile, bill_number, (bill_amount - COALESCE(amount_paid,0) - COALESCE(discount_amount,0)) AS due, bill_date, 'Service' AS source
      FROM service_requests WHERE bill_status = 'billed' AND payment_status != 'paid'
    `).all();
    const unpaidOrders = db.prepare(`
      SELECT customer_name, customer_mobile, id AS bill_number, total_amount AS due, created_at AS bill_date, 'Order' AS source
      FROM product_orders WHERE payment_status != 'paid' AND status != 'Cancelled'
    `).all();
    const supplierRows = db.prepare(`
      SELECT pt.name AS supplier_name,
        (SELECT COALESCE(SUM(COALESCE(p.total_cost,0) - COALESCE(p.amount_paid,0)),0) FROM purchases p WHERE p.supplier_id = pt.id AND p.payment_status != 'paid')
        + (SELECT COALESCE(SUM(po.total_amount),0) FROM purchase_orders po WHERE po.supplier_id = pt.id AND po.status NOT IN ('received','cancelled')) AS due
      FROM parties pt WHERE pt.is_supplier = 1
        AND ((SELECT COALESCE(SUM(COALESCE(p.total_cost,0) - COALESCE(p.amount_paid,0)),0) FROM purchases p WHERE p.supplier_id = pt.id AND p.payment_status != 'paid')
            + (SELECT COALESCE(SUM(po.total_amount),0) FROM purchase_orders po WHERE po.supplier_id = pt.id AND po.status NOT IN ('received','cancelled'))) > 0
    `).all();
    const custRows = [...unpaidServices, ...unpaidOrders].map(r => ({
      customer: `${r.customer_name} / ${r.customer_mobile}`,
      reference: r.bill_number || "—",
      source: r.source,
      amount: r.due,
      date: formatDateValue(r.bill_date)
    }));
    const supRows = supplierRows.map(r => ({
      customer: r.supplier_name,
      reference: "—",
      source: "Supplier Due",
      amount: r.due,
      date: ""
    }));
    const rows = [...custRows, ...supRows];
    const custTotal = custRows.reduce((s, r) => s + (r.amount || 0), 0);
    const supTotal = supRows.reduce((s, r) => s + (r.amount || 0), 0);
    return {
      filenameBase: "outstanding-dues",
      title: "Outstanding / Dues",
      summaryItems: [
        { label: "Status", value: live },
        { label: "Customer Outstanding", value: money(custTotal) },
        { label: "Supplier Dues", value: money(supTotal) },
        { label: "Net Receivable", value: money(custTotal - supTotal) }
      ],
      tableHeaders: [
        { key: "customer", label: "Party" },
        { key: "reference", label: "Bill/Order #" },
        { key: "source", label: "Type" },
        { key: "amount", label: "Amount" },
        { key: "date", label: "Date" }
      ],
      tableRows: rows.map(r => ({ customer: r.customer, reference: r.reference, source: r.source, amount: money(r.amount), date: r.date }))
    };
  }

  if (scope === "daily_take") {
    const rows = db.prepare(`
      SELECT date, SUM(amount) AS amount FROM (
        SELECT paid_at AS date, amount FROM order_payments
        UNION ALL
        SELECT paid_at AS date, amount FROM service_payments
      ) WHERE 1=1 ${hasRange ? "AND date >= ? AND date < ?" : ""}
      GROUP BY date ORDER BY date DESC
    `).all(...(hasRange ? [start, endEx] : []));
    const total = rows.reduce((s, r) => s + (r.amount || 0), 0);
    return {
      filenameBase: `daily-take-${start}-to-${end}`,
      title: "Daily Take",
      summaryItems: [
        { label: "Period", value: label },
        { label: "Days", value: String(rows.length) },
        { label: "Total Collected", value: money(total) }
      ],
      tableHeaders: [
        { key: "date", label: "Date" },
        { key: "amount", label: "Collected" }
      ],
      tableRows: rows.map(r => ({ date: formatDateValue(r.date), amount: money(r.amount) }))
    };
  }

  if (scope === "profit_loss") {
    // 1. INCOME
    const salesSql = hasRange
      ? "SELECT id, customer_name, total_amount, created_at FROM product_orders WHERE status != 'Cancelled' AND created_at >= ? AND created_at < ?"
      : "SELECT id, customer_name, total_amount, created_at FROM product_orders WHERE status != 'Cancelled'";
    const sales = hasRange ? db.prepare(salesSql).all(start, endEx) : db.prepare(salesSql).all();
    const salesTotal = sales.reduce((s, r) => s + (r.total_amount || 0), 0);

    const servSql = hasRange
      ? "SELECT id, customer_name, bill_amount, bill_date, device_type FROM service_requests WHERE bill_status = 'billed' AND COALESCE(bill_date, created_at) >= ? AND COALESCE(bill_date, created_at) < ?"
      : "SELECT id, customer_name, bill_amount, bill_date, device_type FROM service_requests WHERE bill_status = 'billed'";
    const services = hasRange ? db.prepare(servSql).all(start, endEx) : db.prepare(servSql).all();
    const servicesTotal = services.reduce((s, r) => s + (r.bill_amount || 0), 0);

    // 2. EXPENSES / PROCUREMENT
    const purSql = hasRange
      ? "SELECT id, product_name, total_cost, purchase_date, supplier_id FROM purchases WHERE purchase_date >= ? AND purchase_date < ?"
      : "SELECT id, product_name, total_cost, purchase_date, supplier_id FROM purchases";
    const purchases = hasRange ? db.prepare(purSql).all(start, endEx) : db.prepare(purSql).all();
    const purchasesTotal = purchases.reduce((s, r) => s + (r.total_cost || 0), 0);

    const convSql = hasRange
      ? "SELECT customer_name, conveyance_expense, completed_at, device_type FROM service_requests WHERE status = 'Completed' AND conveyance_expense > 0 AND completed_at >= ? AND completed_at < ?"
      : "SELECT customer_name, conveyance_expense, completed_at, device_type FROM service_requests WHERE status = 'Completed' AND conveyance_expense > 0";
    const conveyanceItems = hasRange ? db.prepare(convSql).all(start, endEx) : db.prepare(convSql).all();
    const conveyanceTotal = conveyanceItems.reduce((s, r) => s + (r.conveyance_expense || 0), 0);

    const totalIncome = salesTotal + servicesTotal;
    const totalExpense = purchasesTotal + conveyanceTotal;
    const netProfit = totalIncome - totalExpense;

    return {
      filenameBase: `profit-loss-${start}-to-${end}`,
      title: "Profit & Loss Statement",
      summaryItems: [
        { label: "Period", value: label },
        { label: "Total Income", value: money(totalIncome) },
        { label: "Total Expense", value: money(totalExpense) },
        { label: "Net Profit", value: money(netProfit) }
      ],
      sections: [
        {
          title: "Income Breakdown",
          headers: [
            { key: "category", label: "Category" },
            { key: "count", label: "Count" },
            { key: "amount", label: "Total Amount" }
          ],
          rows: [
            { category: "Product Sales", count: String(sales.length), amount: money(salesTotal) },
            { category: "Service Revenue", count: String(services.length), amount: money(servicesTotal) }
          ]
        },
        {
          title: "Expense Breakdown",
          headers: [
            { key: "category", label: "Category" },
            { key: "count", label: "Count" },
            { key: "amount", label: "Total Amount" }
          ],
          rows: [
            { category: "Inventory Procurement", count: String(purchases.length), amount: money(purchasesTotal) },
            { category: "Technician Conveyance", count: String(conveyanceItems.length), amount: money(conveyanceTotal) }
          ]
        },
        {
          title: "Detailed Income (Recent)",
          headers: [
            { key: "date", label: "Date" },
            { key: "ref", label: "Reference" },
            { key: "name", label: "Customer" },
            { key: "amount", label: "Amount" }
          ],
          rows: [
            ...sales.slice(0, 20).map(s => ({ date: formatDateValue(s.created_at), ref: `#${String(s.id).slice(-6)}`, name: s.customer_name, amount: money(s.total_amount) })),
            ...services.slice(0, 20).map(s => ({ date: formatDateValue(s.bill_date), ref: "Service", name: s.customer_name, amount: money(s.bill_amount) }))
          ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 25)
        },
        {
            title: "Detailed Expenses (Recent)",
            headers: [
              { key: "date", label: "Date" },
              { key: "desc", label: "Description" },
              { key: "amount", label: "Amount" }
            ],
            rows: [
              ...purchases.slice(0, 20).map(p => ({ date: formatDateValue(p.purchase_date), desc: `Purchase: ${p.product_name}`, amount: money(p.total_cost) })),
              ...conveyanceItems.slice(0, 20).map(c => ({ date: formatDateValue(c.completed_at), desc: `Conv: ${c.customer_name}`, amount: money(c.conveyance_expense) }))
            ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 25)
        }
      ]
    };
  }

  return null;
};

const createPdfReport = (filename, title, summaryItems, tableHeaders, tableRows, saveSubdir = null, sections = null) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 48, size: "A4", bufferPages: true });
      const chunks = [];
      doc.on("data", chunk => chunks.push(chunk));
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        let savedRel = null;
        if (saveSubdir) {
          const dir = path.join(reportsDir, saveSubdir);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, filename), pdfBuffer);
          savedRel = `${saveSubdir}/${filename}`;
        }
        resolve({ pdfBuffer, savedRel, filesize: pdfBuffer.length });
      });

      drawPdfHeader(doc, title);
      drawPdfSummaryCards(doc, summaryItems);

      if (sections && Array.isArray(sections)) {
         sections.forEach(sec => {
            doc.fillColor(PDF_COLORS.NAVY).fontSize(12).font("Helvetica-Bold").text(sec.title);
            doc.moveDown(0.5);
            drawPdfTable(doc, sec.headers, sec.rows);
            doc.moveDown(1);
         });
      } else if (tableHeaders && tableRows) {
        doc.fillColor(PDF_COLORS.NAVY).fontSize(12).font("Helvetica-Bold").text("Detailed Breakdown");
        doc.moveDown(0.5);
        drawPdfTable(doc, tableHeaders, tableRows);
      }

      drawPdfFooter(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

const archiveReportRecord = (data) => {
    const id = `arc-${data.scope}-${data.format}-${(data.start || "all")}-${(data.end || "all")}-${Math.random().toString(36).slice(2, 6)}`;
    db.prepare(`
        INSERT OR REPLACE INTO report_archive (id, scope, title, format, range_label, start, end, file_path, filesize, generated_by, generated_by_name, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        id,
        data.scope,
        data.title || data.scope,
        data.format,
        data.range_label || "All records",
        data.start || "",
        data.end || "",
        data.file_path,
        data.filesize || 0,
        data.generated_by,
        data.generated_by_name,
        nowIso()
    );
};

const getArchivedReports = () => {
    return db.prepare("SELECT * FROM report_archive ORDER BY created_at DESC").all();
};

const getDayEndReportData = (date) => {
    const orders = db.prepare(`
      SELECT o.customer_name, op.amount, op.payment_mode, op.paid_at, 'Product Sale' as type
      FROM order_payments op
      JOIN product_orders o ON o.id = op.order_id
      WHERE op.paid_at = ?
    `).all(date);

    const services = db.prepare(`
      SELECT s.customer_name, sp.amount, sp.payment_mode, sp.paid_at, s.device_type as type
      FROM service_payments sp
      JOIN service_requests s ON s.id = sp.service_request_id
      WHERE sp.paid_at = ?
    `).all(date);

    const transactions = [...orders, ...services].sort((a, b) => b.amount - a.amount);
    const cashTotal = transactions.filter(t => t.payment_mode === 'Cash').reduce((sum, t) => sum + t.amount, 0);
    const upiTotal = transactions.filter(t => t.payment_mode === 'UPI').reduce((sum, t) => sum + t.amount, 0);

    return { date, transactions, summary: { cashTotal, upiTotal, grandTotal: cashTotal + upiTotal } };
};

const deleteArchivedReport = (id) => {
    const row = db.prepare("SELECT file_path FROM report_archive WHERE id = ?").get(id);
    if (row && row.file_path) {
        const full = path.join(reportsDir, row.file_path);
        if (fs.existsSync(full)) fs.unlinkSync(full);
    }
    db.prepare("DELETE FROM report_archive WHERE id = ?").run(id);
};

module.exports = {
    REPORT_GROUPS,
    REPORTS,
    resolveReportMeta,
    buildReport,
    createPdfReport,
    archiveReportRecord,
    getArchivedReports,
    deleteArchivedReport
};
