const { db, nowIso, makeId } = require("../../db");
const { formatDateValue, formatCurrencyValue, parsePagination, formatStaffRoleLabel, formatRequestSubjectLabel } = require("../utils/helpers");
const { mapProductPricing } = require("../utils/productHelpers");
const { drawPdfHeader, drawPdfFooter, drawPdfSummaryCards, drawPdfTable, PDF_COLORS } = require("../utils/pdfHelpers");
const PDFDocument = require("pdfkit");
const XLSX = require("exceljs");
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
  { id: "sales_register", group: "sales", title: "Sales Register", desc: "All product sales bills (incl. product-only service-request bills, excl. cancelled) in the period.", dated: true, adminOnly: false },
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
  { id: "overview", group: "operations", title: "Business Overview", desc: "Whole-business snapshot: revenue, spend, collections, outstanding & scale.", dated: true, adminOnly: true }
];

const resolveReportMeta = (scope) => REPORTS.find(r => r.id === scope) || null;

const resolveLedgerParty = (query) => {
  const q = String(query || "").trim();
  if (!q) return null;
  return db.prepare("SELECT * FROM parties WHERE id = ? OR (mobile IS NOT NULL AND mobile = ?) OR LOWER(name) = LOWER(?)").get(q, q, q);
};

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
    let sql = `
      SELECT * FROM (
        SELECT
          o.id, o.bill_number, o.customer_name, o.customer_mobile, o.customer_address,
          o.total_amount, o.status, o.created_at, o.payment_status, o.payment_mode,
          o.taxable_amount, o.cgst_total, o.sgst_total, o.igst_total, o.gst_total, o.is_gst_bill
        FROM product_orders o
        WHERE o.status != 'Cancelled'
        AND NOT EXISTS (
          SELECT 1 FROM order_items i
          JOIN products p ON i.product_id = p.id
          WHERE i.order_id = o.id AND p.type = 'Service'
        )

        UNION ALL

        SELECT
          s.id, s.bill_number, s.customer_name, s.customer_mobile, '' AS customer_address,
          s.bill_amount AS total_amount, s.status,
          COALESCE(s.bill_date, s.created_at) AS created_at,
          s.payment_status, s.payment_mode,
          s.taxable_amount, s.cgst_total, s.sgst_total, 0 AS igst_total, s.gst_total,
          CASE WHEN s.gst_total > 0 THEN 1 ELSE 0 END AS is_gst_bill
        FROM service_requests s
        WHERE s.bill_status = 'billed'
        AND NOT EXISTS (
          SELECT 1 FROM json_each(s.bill_details)
          WHERE LOWER(json_extract(value, '$.desc')) LIKE '%service%'
             OR LOWER(json_extract(value, '$.desc')) LIKE '%config%'
             OR LOWER(json_extract(value, '$.desc')) LIKE '%installation%'
        )
      ) AS combined_bills
      WHERE 1=1
    `;
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
        id: `${r.bill_number || `#${String(r.id).slice(-6)}`}${r.is_gst_bill ? " (GST)" : ""}`,
        customer: r.customer_name || r.customer_mobile || "—",
        amount: money(r.total_amount),
        mode: r.payment_mode || "—",
        status: r.status,
        date: formatDateValue(r.created_at)
      }))
    };
  }

  if (scope === "service_billing") {
    let sql = `
      SELECT id, customer_name, customer_mobile, device_type, bill_amount, amount_paid, payment_status, bill_number, bill_date, created_at, 'service_request' as src FROM service_requests WHERE bill_status = 'billed'
      AND EXISTS (
        SELECT 1 FROM json_each(bill_details)
        WHERE LOWER(json_extract(value, '$.desc')) LIKE '%service%'
           OR LOWER(json_extract(value, '$.desc')) LIKE '%config%'
           OR LOWER(json_extract(value, '$.desc')) LIKE '%installation%'
      )
      UNION ALL
      SELECT o.id, o.customer_name, o.customer_mobile, 'POS Service' as device_type, o.total_amount as bill_amount, (SELECT COALESCE(SUM(amount), 0) FROM order_payments WHERE order_id = o.id) as amount_paid, o.payment_status, COALESCE(o.bill_number, o.id) as bill_number, o.created_at as bill_date, o.created_at as created_at, 'product_order' as src FROM product_orders o
      WHERE o.status != 'Cancelled'
      AND EXISTS (
        SELECT 1 FROM order_items i
        JOIN products p ON i.product_id = p.id
        WHERE i.order_id = o.id AND p.type = 'Service'
      )
    `;
    const params = [];
    let finalSql = `SELECT * FROM (${sql}) AS combined_bills WHERE 1=1`;
    if (hasRange) { finalSql += ` AND COALESCE(bill_date, created_at) >= ? AND COALESCE(bill_date, created_at) < ?`; params.push(start, endEx); }
    finalSql += " ORDER BY COALESCE(bill_date, created_at) DESC";
    const rows = db.prepare(finalSql).all(...params);
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
      ? "SELECT id, bill_number, customer_name, customer_gstin, taxable_amount, cgst_total, sgst_total, total_amount, created_at FROM product_orders WHERE is_gst_bill = 1 AND status != 'Cancelled' AND created_at >= ? AND created_at < ?"
      : "SELECT id, bill_number, customer_name, customer_gstin, taxable_amount, cgst_total, sgst_total, total_amount, created_at FROM product_orders WHERE is_gst_bill = 1 AND status != 'Cancelled'";
    const orders = hasRange ? db.prepare(ordersSql).all(start, endEx) : db.prepare(ordersSql).all();

    const sSql = hasRange
      ? `SELECT id, bill_number, customer_name, (SELECT gst_number FROM parties WHERE parties.mobile = service_requests.customer_mobile AND parties.gst_number IS NOT NULL AND parties.mobile IS NOT NULL LIMIT 1) AS customer_gstin, taxable_amount, cgst_total, sgst_total, bill_amount AS total_amount, COALESCE(bill_date, created_at) AS created_at, device_type FROM service_requests WHERE bill_status = 'billed' AND (cgst_total > 0 OR sgst_total > 0) AND COALESCE(bill_date, created_at) >= ? AND COALESCE(bill_date, created_at) < ?`
      : `SELECT id, bill_number, customer_name, (SELECT gst_number FROM parties WHERE parties.mobile = service_requests.customer_mobile AND parties.gst_number IS NOT NULL AND parties.mobile IS NOT NULL LIMIT 1) AS customer_gstin, taxable_amount, cgst_total, sgst_total, bill_amount AS total_amount, COALESCE(bill_date, created_at) AS created_at, device_type FROM service_requests WHERE bill_status = 'billed' AND (cgst_total > 0 OR sgst_total > 0)`;
    const services = hasRange ? db.prepare(sSql).all(start, endEx) : db.prepare(sSql).all();

    const billItemsSql = hasRange
      ? `SELECT o.bill_number, o.customer_name, o.created_at, oi.product_name, oi.hsn_code, oi.price, oi.qty, oi.taxable_amount, oi.cgst_amount, oi.sgst_amount, (COALESCE(oi.taxable_amount, oi.price * oi.qty, 0) + COALESCE(oi.cgst_amount, 0) + COALESCE(oi.sgst_amount, 0)) AS total_amount FROM order_items oi JOIN product_orders o ON oi.order_id = o.id WHERE o.is_gst_bill = 1 AND o.status != 'Cancelled' AND o.created_at >= ? AND o.created_at < ?`
      : `SELECT o.bill_number, o.customer_name, o.created_at, oi.product_name, oi.hsn_code, oi.price, oi.qty, oi.taxable_amount, oi.cgst_amount, oi.sgst_amount, (COALESCE(oi.taxable_amount, oi.price * oi.qty, 0) + COALESCE(oi.cgst_amount, 0) + COALESCE(oi.sgst_amount, 0)) AS total_amount FROM order_items oi JOIN product_orders o ON oi.order_id = o.id WHERE o.is_gst_bill = 1 AND o.status != 'Cancelled'`;
    const billItems = hasRange ? db.prepare(billItemsSql).all(start, endEx) : db.prepare(billItemsSql).all();

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
        { key: "ref", label: "Invoice #" },
        { key: "customer", label: "Customer" },
        { key: "gstin", label: "Customer GST" },
        { key: "type", label: "Type" },
        { key: "taxable", label: "Taxable" },
        { key: "cgst", label: "CGST" },
        { key: "sgst", label: "SGST" },
        { key: "total", label: "Total" }
      ],
      tableRows: all.map(i => ({
        date: formatDateValue(i.created_at),
        ref: i.bill_number || String(i.id).slice(-8).toUpperCase(),
        customer: i.customer_name,
        gstin: i.customer_gstin || "—",
        type: i.type,
        taxable: money(i.taxable_amount),
        cgst: money(i.cgst_total),
        sgst: money(i.sgst_total),
        total: money(i.total_amount)
      })),
      sections: [
        {
          title: "Related Bills",
          headers: [
            { key: "date", label: "Date" },
            { key: "ref", label: "Invoice #" },
            { key: "customer", label: "Customer" },
            { key: "gstin", label: "Customer GST" },
            { key: "type", label: "Type" },
            { key: "taxable", label: "Taxable" },
            { key: "cgst", label: "CGST" },
            { key: "sgst", label: "SGST" },
            { key: "total", label: "Total" }
          ],
          rows: all.map(i => ({
            date: formatDateValue(i.created_at),
            ref: i.bill_number || String(i.id).slice(-8).toUpperCase(),
            customer: i.customer_name,
            gstin: i.customer_gstin || "—",
            type: i.type,
            taxable: money(i.taxable_amount),
            cgst: money(i.cgst_total),
            sgst: money(i.sgst_total),
            total: money(i.total_amount)
          }))
        },
        {
          title: "Bill Live View",
          headers: [
            { key: "col1", label: "Col1" },
            { key: "col2", label: "Col2" },
            { key: "col3", label: "Col3" },
            { key: "col4", label: "Col4" },
            { key: "col5", label: "Col5" },
            { key: "col6", label: "Col6" },
            { key: "col7", label: "Col7" },
            { key: "col8", label: "Col8" },
            { key: "col9", label: "Col9" }
          ],
          rows: (() => {
            const billsMap = new Map();
            billItems.forEach(i => {
              const ref = i.bill_number || "—";
              if (!billsMap.has(ref)) {
                billsMap.set(ref, {
                  ref,
                  date: formatDateValue(i.created_at),
                  customer: i.customer_name || "—",
                  items: []
                });
              }
              billsMap.get(ref).items.push(i);
            });

            const rows = [];
            billsMap.forEach(bill => {
              rows.push({
                col1: `INVOICE: ${bill.ref}`,
                col2: `Date: ${bill.date}`,
                col3: `Customer: ${bill.customer}`,
                col4: "", col5: "", col6: "", col7: "", col8: "", col9: ""
              });
              rows.push({
                col1: "#", col2: "Item / Description", col3: "HSN Code", col4: "Qty", col5: "Rate", col6: "Taxable", col7: "CGST", col8: "SGST", col9: "Total"
              });
              let tTaxable = 0, tCgst = 0, tSgst = 0, tTotal = 0;
              bill.items.forEach((it, idx) => {
                const taxable = Number(it.taxable_amount) || (Number(it.price) * Number(it.qty)) || 0;
                const cgst = Number(it.cgst_amount) || 0;
                const sgst = Number(it.sgst_amount) || 0;
                const total = Number(it.total_amount) || (taxable + cgst + sgst);
                tTaxable += taxable; tCgst += cgst; tSgst += sgst; tTotal += total;

                rows.push({
                  col1: String(idx + 1),
                  col2: String(it.product_name || "—"),
                  col3: String(it.hsn_code || "—"),
                  col4: String(it.qty || 1),
                  col5: money(it.price),
                  col6: money(taxable),
                  col7: money(cgst),
                  col8: money(sgst),
                  col9: money(total)
                });
              });
              rows.push({
                col1: "", col2: "", col3: "", col4: "", col5: "INVOICE TOTAL:",
                col6: money(tTaxable), col7: money(tCgst), col8: money(tSgst), col9: money(tTotal)
              });
              rows.push({ col1: "", col2: "", col3: "", col4: "", col5: "", col6: "", col7: "", col8: "", col9: "" });
            });
            return rows;
          })()
        }
      ]
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
    const gross = rows.reduce((s, p) => s + (p.total_cost || 0) + (p.cgst_total || 0) + (p.sgst_total || 0), 0);
    const paid = rows.reduce((s, p) => s + (p.amount_paid || 0), 0);
    const unpaidBalance = rows
      .filter(p => p.payment_status !== 'paid')
      .reduce((s, p) => s + (p.total_cost || 0) + (p.cgst_total || 0) + (p.sgst_total || 0) - (p.amount_paid || 0), 0);
    const cg = rows.reduce((s, p) => s + (p.cgst_total || 0), 0);
    const sg = rows.reduce((s, p) => s + (p.sgst_total || 0), 0);
    return {
      filenameBase: `purchase-register-${start}-to-${end}`,
      title: "Purchase Register",
      summaryItems: [
        { label: "Period", value: label },
        { label: "Purchases", value: String(rows.length) },
        { label: "Purchase Value (excl. GST)", value: money(total) },
        { label: "Amount Paid", value: money(paid) },
        { label: "Balance Due", value: money(unpaidBalance) },
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
    // ---- REVENUE (respects selected period) ----
    const salesSql = hasRange
      ? "SELECT id, customer_name, total_amount, created_at FROM product_orders WHERE status != 'Cancelled' AND created_at >= ? AND created_at < ?"
      : "SELECT id, customer_name, total_amount, created_at FROM product_orders WHERE status != 'Cancelled'";
    const orders = hasRange ? db.prepare(salesSql).all(start, endEx) : db.prepare(salesSql).all();
    const salesTotal = orders.reduce((s, r) => s + (r.total_amount || 0), 0);

    const servSql = hasRange
      ? "SELECT id, customer_name, bill_amount, COALESCE(bill_date, created_at) AS bill_date, device_type FROM service_requests WHERE bill_status = 'billed' AND COALESCE(bill_date, created_at) >= ? AND COALESCE(bill_date, created_at) < ?"
      : "SELECT id, customer_name, bill_amount, COALESCE(bill_date, created_at) AS bill_date, device_type FROM service_requests WHERE bill_status = 'billed'";
    const services = hasRange ? db.prepare(servSql).all(start, endEx) : db.prepare(servSql).all();
    const servicesTotal = services.reduce((s, r) => s + (r.bill_amount || 0), 0);
    const totalIncome = salesTotal + servicesTotal;

    // ---- SPEND (respects selected period) ----
    const purSql = hasRange
      ? "SELECT id, product_name, total_cost, purchase_date FROM purchases WHERE purchase_date >= ? AND purchase_date < ?"
      : "SELECT id, product_name, total_cost, purchase_date FROM purchases";
    const purchases = hasRange ? db.prepare(purSql).all(start, endEx) : db.prepare(purSql).all();
    const purchasesTotal = purchases.reduce((s, r) => s + (r.total_cost || 0), 0);

    const convSql = hasRange
      ? "SELECT customer_name, conveyance_expense, completed_at FROM service_requests WHERE status = 'Completed' AND conveyance_expense > 0 AND completed_at >= ? AND completed_at < ?"
      : "SELECT customer_name, conveyance_expense, completed_at FROM service_requests WHERE status = 'Completed' AND conveyance_expense > 0";
    const conveyanceItems = hasRange ? db.prepare(convSql).all(start, endEx) : db.prepare(convSql).all();
    const conveyanceTotal = conveyanceItems.reduce((s, r) => s + (r.conveyance_expense || 0), 0);

    const expSql = hasRange
      ? "SELECT category, description, amount, expense_date FROM expenses WHERE expense_date >= ? AND expense_date < ?"
      : "SELECT category, description, amount, expense_date FROM expenses";
    const expenses = hasRange ? db.prepare(expSql).all(start, endEx) : db.prepare(expSql).all();
    const expensesTotal = expenses.reduce((s, r) => s + (r.amount || 0), 0);
    const totalSpend = purchasesTotal + conveyanceTotal + expensesTotal;
    const netResult = totalIncome - totalSpend;

    const expenseByCat = {};
    expenses.forEach(e => {
      const key = e.category || "Other";
      expenseByCat[key] = (expenseByCat[key] || 0) + (e.amount || 0);
    });
    const topExpenseCategories = Object.entries(expenseByCat)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    // ---- COLLECTIONS (respects selected period) ----
    const collSql = "SELECT COALESCE(SUM(amount),0) AS t FROM (" +
      "SELECT amount, paid_at FROM order_payments UNION ALL SELECT amount, paid_at FROM service_payments" +
      ") WHERE " + (hasRange ? "paid_at >= ? AND paid_at < ?" : "1=1");
    const collectedTotal = db.prepare(collSql).get(...(hasRange ? [start, endEx] : [])).t || 0;

    // ---- LIVE / ALL-TIME FIGURES ----
    const live = db.prepare(`
      SELECT
        (SELECT COALESCE(SUM(bill_amount - COALESCE(amount_paid,0) - COALESCE(discount_amount,0)),0) FROM service_requests WHERE bill_status = 'billed' AND payment_status != 'paid')
        + (SELECT COALESCE(SUM(total_amount),0) FROM product_orders WHERE payment_status != 'paid' AND status != 'Cancelled') AS customer_due,
        (SELECT COALESCE(SUM(COALESCE(total_cost,0) + COALESCE(cgst_total,0) + COALESCE(sgst_total,0) - COALESCE(amount_paid,0)),0) FROM purchases WHERE payment_status != 'paid') AS supplier_due
    `).get();
    const customerDue = live.customer_due || 0;
    const supplierDue = live.supplier_due || 0;

    const scale = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE active = 1) AS products,
        (SELECT COUNT(*) FROM users WHERE role IN ('employee','sales','technician')) AS staff,
        (SELECT COUNT(*) FROM product_orders WHERE status != 'Cancelled') AS orders,
        (SELECT COUNT(*) FROM service_requests) AS requests,
        (SELECT COUNT(*) FROM service_requests WHERE status NOT IN ('Completed','Canceled','Cancelled')) AS open_requests,
        (SELECT COUNT(*) FROM service_requests WHERE status = 'Completed') AS completed
    `).get();

    const recentOrders = orders.slice(0, 12).map(o => ({
      date: o.created_at,
      ref: "Order",
      party: o.customer_name,
      type: "Product Sale",
      amount: o.total_amount
    }));
    const recentServices = services.slice(0, 12).map(s => ({
      date: s.bill_date,
      ref: "Service",
      party: s.customer_name,
      type: s.device_type || "Service",
      amount: s.bill_amount
    }));

    return {
      filenameBase: "business-overview",
      title: "Business Overview",
      summaryItems: [
        { label: "Period", value: label },
        { label: "Sales Revenue", value: money(totalIncome) },
        { label: "Net Result", value: money(netResult) },
        { label: "Collections", value: money(collectedTotal) },
        { label: "Customer Outstanding", value: money(customerDue) },
        { label: "Supplier Due", value: money(supplierDue) }
      ],
      sections: [
        {
          title: "Revenue Breakdown",
          headers: [
            { key: "source", label: "Income Source" },
            { key: "count", label: "Count" },
            { key: "amount", label: "Amount" }
          ],
          rows: [
            { source: "Product Sales", count: String(orders.length), amount: money(salesTotal) },
            { source: "Service Billing", count: String(services.length), amount: money(servicesTotal) }
          ]
        },
        {
          title: "Spend Breakdown",
          headers: [
            { key: "source", label: "Spend Category" },
            { key: "count", label: "Count" },
            { key: "amount", label: "Amount" }
          ],
          rows: [
            { source: "Inventory Procurement", count: String(purchases.length), amount: money(purchasesTotal) },
            { source: "Technician Conveyance", count: String(conveyanceItems.length), amount: money(conveyanceTotal) },
            { source: "Operating Expenses", count: String(expenses.length), amount: money(expensesTotal) }
          ]
        },
        {
          title: "Top Operating Expenses",
          headers: [
            { key: "category", label: "Category" },
            { key: "amount", label: "Amount" }
          ],
          rows: topExpenseCategories.length
            ? topExpenseCategories.map(c => ({ category: c.category, amount: money(c.amount) }))
            : [{ category: "No expenses in period", amount: "—" }]
        },
        {
          title: "Live Outstanding",
          headers: [
            { key: "item", label: "Item" },
            { key: "amount", label: "Amount" }
          ],
          rows: [
            { item: "Customer Receivables", amount: money(customerDue) },
            { item: "Supplier Dues", amount: money(supplierDue) },
            { item: "Net Receivable", amount: money(customerDue - supplierDue) }
          ]
        },
        {
          title: "Business Scale (All-time)",
          headers: [
            { key: "metric", label: "Metric" },
            { key: "value", label: "Value" }
          ],
          rows: [
            { metric: "Products in Catalog", value: String(scale.products) },
            { metric: "Active Staff", value: String(scale.staff) },
            { metric: "Orders Placed", value: String(scale.orders) },
            { metric: "Service Requests", value: String(scale.requests) },
            { metric: "Open Service Requests", value: String(scale.open_requests) },
            { metric: "Completed Jobs", value: String(scale.completed) }
          ]
        },
        {
          title: "Recent Activity",
          headers: [
            { key: "date", label: "Date" },
            { key: "ref", label: "Type" },
            { key: "party", label: "Customer" },
            { key: "type", label: "Line" },
            { key: "amount", label: "Amount" }
          ],
          rows: [...recentOrders, ...recentServices]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 20)
            .map(r => ({ ...r, date: formatDateValue(r.date), amount: money(r.amount) }))
        }
      ],
      tableHeaders: null,
      tableRows: []
    };
  }

  if (scope === "supplier_dues") {
    const rows = db.prepare(`
      SELECT pt.name AS supplier_name,
        (SELECT COALESCE(SUM(COALESCE(p.total_cost,0) + COALESCE(p.cgst_total,0) + COALESCE(p.sgst_total,0) - COALESCE(p.amount_paid,0)),0) FROM purchases p WHERE p.supplier_id = pt.id AND p.payment_status != 'paid') AS due
      FROM parties pt
      WHERE pt.is_supplier = 1
        AND (SELECT COALESCE(SUM(COALESCE(p.total_cost,0) + COALESCE(p.cgst_total,0) + COALESCE(p.sgst_total,0) - COALESCE(p.amount_paid,0)),0) FROM purchases p WHERE p.supplier_id = pt.id AND p.payment_status != 'paid') > 0
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
      SELECT customer_name, customer_mobile, COALESCE(bill_number, id) AS bill_number, total_amount AS due, created_at AS bill_date, 'Order' AS source
      FROM product_orders WHERE payment_status != 'paid' AND status != 'Cancelled'
    `).all();
    const supplierRows = db.prepare(`
      SELECT pt.name AS supplier_name,
        (SELECT COALESCE(SUM(COALESCE(p.total_cost,0) + COALESCE(p.cgst_total,0) + COALESCE(p.sgst_total,0) - COALESCE(p.amount_paid,0)),0) FROM purchases p WHERE p.supplier_id = pt.id AND p.payment_status != 'paid') AS due
      FROM parties pt WHERE pt.is_supplier = 1
        AND (SELECT COALESCE(SUM(COALESCE(p.total_cost,0) + COALESCE(p.cgst_total,0) + COALESCE(p.sgst_total,0) - COALESCE(p.amount_paid,0)),0) FROM purchases p WHERE p.supplier_id = pt.id AND p.payment_status != 'paid') > 0
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

  if (scope === "customer_ledger") {
    const party = resolveLedgerParty(opts.party);
    if (!party) return { error: "party_required" };

    const entries = [];
    let billed = 0;
    let paid = 0;

    if (party.is_customer === 1) {
      const orders = db.prepare(`
        SELECT id, bill_number, total_amount, created_at FROM product_orders
        WHERE status != 'Cancelled' AND (customer_mobile = ? OR (? IS NULL AND LOWER(customer_name) = LOWER(?)))
      `).all(party.mobile, party.mobile, party.name);
      billed += orders.reduce((s, o) => s + (o.total_amount || 0), 0);
      orders.forEach(o => entries.push({
        date: o.created_at,
        particulars: "Product Sale",
        ref: o.bill_number || `#${String(o.id).slice(-6)}`,
        debit: o.total_amount || 0,
        credit: 0
      }));

      const services = db.prepare(`
        SELECT id, bill_number, bill_amount, COALESCE(discount_amount,0) AS discount, amount_paid, COALESCE(bill_date, created_at) AS date
        FROM service_requests WHERE bill_status = 'billed' AND (customer_mobile = ? OR (? IS NULL AND LOWER(customer_name) = LOWER(?)))
      `).all(party.mobile, party.mobile, party.name);
      billed += services.reduce((s, sv) => s + (sv.bill_amount || 0) - (sv.discount || 0), 0);
      services.forEach(sv => {
        const svRef = sv.bill_number || `#${String(sv.id).slice(-6)}`;
        entries.push({ date: sv.date, particulars: "Service Billing", ref: svRef, debit: sv.bill_amount || 0, credit: 0 });
        if (sv.discount > 0) entries.push({ date: sv.date, particulars: "Discount", ref: svRef, debit: 0, credit: sv.discount });
      });

      const payments = db.prepare(`
        SELECT pm.amount, pm.payment_mode, pm.paid_at AS date, 'Order' AS src FROM order_payments pm
        JOIN product_orders o ON pm.order_id = o.id
        WHERE o.customer_mobile = ? OR (? IS NULL AND LOWER(o.customer_name) = LOWER(?))
        UNION ALL
        SELECT pm.amount, pm.payment_mode, pm.paid_at AS date, 'Service' AS src FROM service_payments pm
        JOIN service_requests s ON pm.service_request_id = s.id
        WHERE s.customer_mobile = ? OR (? IS NULL AND LOWER(s.customer_name) = LOWER(?))
        ORDER BY date
      `).all(party.mobile, party.mobile, party.name, party.mobile, party.mobile, party.name);
      paid += payments.reduce((s, p) => s + (p.amount || 0), 0);
      payments.forEach(p => entries.push({
        date: p.date,
        particulars: `Payment (${p.payment_mode || "N/A"})`,
        ref: p.src,
        debit: 0,
        credit: p.amount || 0
      }));
    }

    if (party.is_supplier === 1) {
      const purchases = db.prepare(`
        SELECT id, (COALESCE(total_cost,0) + COALESCE(cgst_total,0) + COALESCE(sgst_total,0)) AS amount, COALESCE(amount_paid,0) AS paid, purchase_date AS date, invoice_number
        FROM purchases WHERE supplier_id = ?
      `).all(party.id);
      billed += purchases.reduce((s, pu) => s + (pu.amount || 0), 0);
      paid += purchases.reduce((s, pu) => s + (pu.paid || 0), 0);
      purchases.forEach(pu => {
        const ref = pu.invoice_number || `#${String(pu.id).slice(-6)}`;
        entries.push({ date: pu.date, particulars: "Purchase", ref, debit: 0, credit: pu.amount || 0 });
        if (pu.paid > 0) entries.push({ date: pu.date, particulars: "Payment Made", ref, debit: pu.paid, credit: 0 });
      });

      const pos = db.prepare(`
        SELECT po_number, total_amount, po_date, status FROM purchase_orders WHERE supplier_id = ? AND status NOT IN ('received','cancelled')
      `).all(party.id);
      billed += pos.reduce((s, po) => s + (po.total_amount || 0), 0);
      pos.forEach(po => entries.push({
        date: po.po_date || "",
        particulars: `PO Committed (${po.status})`,
        ref: po.po_number || "—",
        debit: 0,
        credit: po.total_amount || 0
      }));
    }

    entries.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    let running = 0;
    const withBalance = entries.map(e => {
      running += (e.debit || 0) - (e.credit || 0);
      return { ...e, debit: money(e.debit), credit: money(e.credit), balance: money(running) };
    });

    const typeLabel = party.is_customer === 1 && party.is_supplier === 1 ? "Customer & Supplier"
      : party.is_supplier === 1 ? "Supplier" : "Customer";

    return {
      filenameBase: `party-ledger-${party.id}`,
      title: `Party Ledger — ${party.name}`,
      summaryItems: [
        { label: "Party", value: party.name },
        { label: "Type", value: typeLabel },
        { label: "Billed / Charged", value: money(billed) },
        { label: "Paid / Received", value: money(paid) },
        { label: "Closing Balance", value: money(billed - paid) }
      ],
      tableHeaders: [
        { key: "date", label: "Date" },
        { key: "particulars", label: "Particulars" },
        { key: "ref", label: "Reference" },
        { key: "debit", label: "Debit" },
        { key: "credit", label: "Credit" },
        { key: "balance", label: "Balance" }
      ],
      tableRows: withBalance,
      sections: null
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

const createXlsxReport = (filename, title, summaryItems = [], tableHeaders = null, tableRows = [], saveSubdir = null, sections = null) => {
  return new Promise((resolve, reject) => {
    try {
      const wb = new XLSX.Workbook();
      const NAVY = "FF1B2A5B";
      const BLUE = "FF2563EB";
      const MONEY = "FF059669";

      const addTableSheet = (ws, headers, rows) => {
        if (!headers || !headers.length) return;

        const isBillLiveView = headers.some(h => h.key === "col1");

        if (!isBillLiveView) {
          const headerRow = ws.addRow(headers.map(h => h.label));
          headerRow.eachCell(cell => {
            cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
            cell.alignment = { vertical: "middle" };
          });
          headerRow.height = 20;
        }

        (rows || []).forEach(r => {
          const isInvoiceHeader = r.col1 && String(r.col1).startsWith("INVOICE:");
          const isInvoiceTotal = r.col5 === "INVOICE TOTAL:";
          const isItemHeader = r.col1 === "#";

          const row = ws.addRow(headers.map(h => {
            const v = r[h.key];
            return v != null ? String(v) : "";
          }));

          row.eachCell(cell => {
            cell.alignment = { vertical: "middle" };
            if (isInvoiceHeader) {
              cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
            } else if (isItemHeader) {
              cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
            } else if (isInvoiceTotal) {
              cell.font = { bold: true, color: { argb: NAVY } };
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3F4F6" } };
            } else if (isBillLiveView && r.col1 && !isInvoiceHeader && !isInvoiceTotal && !isItemHeader) {
              const colIdx = cell.col;
              if (colIdx >= 6) {
                cell.font = { color: { argb: MONEY }, bold: true };
              }
            } else {
              const colIdx = cell.col;
              const key = headers[colIdx - 1] ? headers[colIdx - 1].key : null;
              const isAmount = key && /(amount|paid|due|balance|debit|credit|taxable|gst|cgst|sgst|igst|total|price|cost|value|profit|expense|collection|charge|income)/i.test(key);
              if (isAmount) cell.font = { color: { argb: MONEY }, bold: true };
            }
          });
        });
      };

      if (summaryItems.length) {
        const wsSummary = wb.addWorksheet("Summary");
        const titleCell = wsSummary.getCell("A1");
        titleCell.value = title;
        titleCell.font = { bold: true, size: 16, color: { argb: NAVY } };
        wsSummary.getCell("A3").value = "Label";
        wsSummary.getCell("B3").value = "Value";
        wsSummary.getRow(3).eachCell(cell => {
          cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE } };
        });
        summaryItems.forEach(s => {
          const r = wsSummary.addRow([s.label, s.value]);
          r.eachCell(cell => { cell.alignment = { vertical: "middle" }; });
        });
        wsSummary.columns = [{ width: 30 }, { width: 40 }];
      }

      if (sections && Array.isArray(sections) && sections.length) {
        sections.forEach((sec, idx) => {
          if (!sec.headers || !sec.headers.length) return;
          const ws = wb.addWorksheet(sec.title || `Sheet ${idx + 1}`);
          addTableSheet(ws, sec.headers, sec.rows || []);
          ws.columns = sec.headers.map(() => ({ width: 22 }));
        });
      } else if (tableHeaders && tableHeaders.length) {
        const ws = wb.addWorksheet("Details");
        addTableSheet(ws, tableHeaders, tableRows);
        ws.columns = tableHeaders.map(() => ({ width: 22 }));
      }

      wb.xlsx.writeBuffer().then((buffer) => {
        const xlsxBuffer = Buffer.from(buffer);
        let savedRel = null;
        if (saveSubdir) {
          const dir = path.join(reportsDir, saveSubdir);
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(path.join(dir, filename), xlsxBuffer);
          savedRel = `${saveSubdir}/${filename}`;
        }
        resolve({ xlsxBuffer, savedRel, filesize: xlsxBuffer.length });
      }).catch(reject);
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
    resolveLedgerParty,
    buildReport,
    createPdfReport,
    createXlsxReport,
    archiveReportRecord,
    getArchivedReports,
    deleteArchivedReport
};
