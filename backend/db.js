const path = require("path");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "..", "techlab_v2.sqlite");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

const getCustomerByMobile = (mobile) => {
  const orders = db.prepare("SELECT customer_name FROM product_orders WHERE customer_mobile = ? ORDER BY created_at DESC LIMIT 1").get(mobile);
  const requests = db.prepare("SELECT customer_name FROM service_requests WHERE customer_mobile = ? ORDER BY created_at DESC LIMIT 1").get(mobile);
  return {
    name: orders?.customer_name || requests?.customer_name || "Demo Customer",
    mobile: mobile,
    role: "customer"
  };
};

const initializeDatabase = () => {
  db.exec(
    "CREATE TABLE IF NOT EXISTS users (" +
    "id TEXT PRIMARY KEY," +
    "name TEXT NOT NULL," +
    "email TEXT UNIQUE," +
    "password_hash TEXT," +
    "role TEXT NOT NULL," +
    "mobile TEXT UNIQUE NOT NULL," +
    "created_at TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS otp_codes (" +
    "id TEXT PRIMARY KEY," +
    "mobile TEXT NOT NULL," +
    "code TEXT NOT NULL," +
    "expires_at TEXT NOT NULL," +
    "consumed_at TEXT" +
    ");" +

    "CREATE TABLE IF NOT EXISTS products (" +
    "id TEXT PRIMARY KEY," +
    "type TEXT NOT NULL," +
    "name TEXT NOT NULL," +
    "price INTEGER NOT NULL," +
    "description TEXT NOT NULL," +
    "discount_percent INTEGER NOT NULL DEFAULT 0," +
    "updated_by_employee_name TEXT," +
    "supplier_id TEXT," +
    "active INTEGER NOT NULL DEFAULT 1," +
    "FOREIGN KEY(supplier_id) REFERENCES suppliers(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS product_orders (" +
    "id TEXT PRIMARY KEY," +
    "customer_mobile TEXT NOT NULL," +
    "customer_name TEXT NOT NULL," +
    "customer_address TEXT," +
    "total_amount INTEGER NOT NULL," +
    "status TEXT NOT NULL," +
    "payment_status TEXT DEFAULT 'pending'," +
    "payment_mode TEXT," +
    "payment_date TEXT," +
    "created_at TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS order_items (" +
    "id TEXT PRIMARY KEY," +
    "order_id TEXT NOT NULL," +
    "product_id TEXT NOT NULL," +
    "product_name TEXT NOT NULL," +
    "price INTEGER NOT NULL," +
    "FOREIGN KEY(order_id) REFERENCES product_orders(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS service_requests (" +
    "id TEXT PRIMARY KEY," +
    "customer_name TEXT NOT NULL," +
    "customer_mobile TEXT NOT NULL," +
    "device_type TEXT NOT NULL," +
    "request_subject_type TEXT," +
    "request_subject_name TEXT," +
    "issue TEXT NOT NULL," +
    "preferred_date TEXT NOT NULL," +
    "assigned_employee_id TEXT," +
    "assigned_employee_name TEXT," +
    "service_person TEXT," +
    "scheduled_date TEXT," +
    "status TEXT NOT NULL," +
    "conveyance_expense INTEGER DEFAULT 0," +
    "created_at TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS service_payments (" +
    "id TEXT PRIMARY KEY," +
    "service_request_id TEXT NOT NULL," +
    "amount INTEGER NOT NULL DEFAULT 0," +
    "payment_mode TEXT," +
    "paid_at TEXT NOT NULL," +
    "created_at TEXT NOT NULL," +
    "FOREIGN KEY(service_request_id) REFERENCES service_requests(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS order_payments (" +
    "id TEXT PRIMARY KEY," +
    "order_id TEXT NOT NULL," +
    "amount INTEGER NOT NULL DEFAULT 0," +
    "payment_mode TEXT," +
    "paid_at TEXT NOT NULL," +
    "created_at TEXT NOT NULL," +
    "FOREIGN KEY(order_id) REFERENCES product_orders(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS site_visit_surveys (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "service_request_id TEXT NOT NULL," +
    "technician_id TEXT NOT NULL," +
    "is_existing_installation INTEGER DEFAULT 0," +
    "existing_setup_notes TEXT," +
    "work_needed TEXT," +
    "camera_count INTEGER DEFAULT 0," +
    "cameras TEXT," +
    "nvr_dvr TEXT," +
    "cables TEXT," +
    "mounting TEXT," +
    "additional_parts TEXT," +
    "notes TEXT," +
    "photos TEXT," +
    "submitted_at TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS suppliers (" +
    "id TEXT PRIMARY KEY," +
    "name TEXT NOT NULL," +
    "contact_person TEXT," +
    "mobile TEXT," +
    "email TEXT," +
    "address TEXT," +
    "gst_number TEXT," +
    "notes TEXT," +
    "created_at TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS purchases (" +
    "id TEXT PRIMARY KEY," +
    "supplier_id TEXT NOT NULL," +
    "product_name TEXT NOT NULL," +
    "product_id TEXT," +
    "quantity INTEGER NOT NULL DEFAULT 1," +
    "unit_cost INTEGER NOT NULL DEFAULT 0," +
    "total_cost INTEGER NOT NULL DEFAULT 0," +
    "purchase_date TEXT NOT NULL," +
    "invoice_number TEXT," +
    "payment_status TEXT DEFAULT 'paid'," +
    "payment_mode TEXT," +
    "payment_date TEXT," +
    "notes TEXT," +
    "created_at TEXT NOT NULL," +
    "FOREIGN KEY(supplier_id) REFERENCES suppliers(id)," +
    "FOREIGN KEY(product_id) REFERENCES products(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS purchase_orders (" +
    "id TEXT PRIMARY KEY," +
    "po_number TEXT NOT NULL," +
    "supplier_id TEXT NOT NULL," +
    "po_date TEXT NOT NULL," +
    "expected_date TEXT," +
    "notes TEXT," +
    "status TEXT NOT NULL DEFAULT 'ordered'," +
    "total_amount INTEGER NOT NULL DEFAULT 0," +
    "created_at TEXT NOT NULL," +
    "FOREIGN KEY(supplier_id) REFERENCES parties(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS purchase_order_items (" +
    "id TEXT PRIMARY KEY," +
    "po_id TEXT NOT NULL," +
    "product_id TEXT," +
    "product_name TEXT NOT NULL," +
    "quantity INTEGER NOT NULL DEFAULT 1," +
    "unit_cost INTEGER NOT NULL DEFAULT 0," +
    "FOREIGN KEY(po_id) REFERENCES purchase_orders(id)," +
    "FOREIGN KEY(product_id) REFERENCES products(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS supplier_quotes (" +
    "id TEXT PRIMARY KEY," +
    "quote_number TEXT NOT NULL," +
    "supplier_id TEXT NOT NULL," +
    "quote_date TEXT NOT NULL," +
    "valid_until TEXT," +
    "notes TEXT," +
    "status TEXT NOT NULL DEFAULT 'pending'," +
    "total_amount INTEGER NOT NULL DEFAULT 0," +
    "created_at TEXT NOT NULL," +
    "approved_at TEXT," +
    "pdf_path TEXT," +
    "pdf_name TEXT," +
    "FOREIGN KEY(supplier_id) REFERENCES parties(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS supplier_quote_items (" +
    "id TEXT PRIMARY KEY," +
    "quote_id TEXT NOT NULL," +
    "product_id TEXT," +
    "product_name TEXT NOT NULL," +
    "quantity INTEGER NOT NULL DEFAULT 1," +
    "unit_cost INTEGER NOT NULL DEFAULT 0," +
    "FOREIGN KEY(quote_id) REFERENCES supplier_quotes(id)," +
    "FOREIGN KEY(product_id) REFERENCES products(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS parties (" +
    "id TEXT PRIMARY KEY," +
    "name TEXT NOT NULL," +
    "mobile TEXT," +
    "email TEXT," +
    "address TEXT," +
    "gst_number TEXT," +
    "contact_person TEXT," +
    "notes TEXT," +
    "is_supplier INTEGER DEFAULT 0," +
    "is_customer INTEGER DEFAULT 0," +
    "created_at TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS bank_accounts (" +
    "id TEXT PRIMARY KEY," +
    "bank_name TEXT NOT NULL," +
    "account_holder TEXT NOT NULL," +
    "account_number TEXT NOT NULL," +
    "ifsc TEXT NOT NULL," +
    "upi_id TEXT," +
    "is_primary INTEGER DEFAULT 0," +
    "show_qr INTEGER DEFAULT 1," +
    "created_at TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS enquiries (" +
    "id TEXT PRIMARY KEY," +
    "customer_name TEXT NOT NULL," +
    "customer_mobile TEXT NOT NULL," +
    "type TEXT NOT NULL," +
    "product_interest TEXT," +
    "visit_address TEXT," +
    "preferred_date TEXT," +
    "budget INTEGER," +
    "status TEXT NOT NULL DEFAULT 'new'," +
    "notes TEXT," +
    "created_at TEXT NOT NULL," +
    "updated_by TEXT" +
    ");" +

    "CREATE TABLE IF NOT EXISTS business_settings (" +
    "key TEXT PRIMARY KEY," +
    "value TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS delivery_challans (" +
    "id TEXT PRIMARY KEY," +
    "challan_number TEXT NOT NULL," +
    "source_type TEXT NOT NULL," +
    "source_id TEXT NOT NULL," +
    "customer_name TEXT NOT NULL," +
    "customer_mobile TEXT," +
    "customer_address TEXT," +
    "dispatch_date TEXT NOT NULL," +
    "receiver_name TEXT," +
    "transport TEXT," +
    "vehicle_no TEXT," +
    "notes TEXT," +
    "created_by TEXT," +
    "created_at TEXT NOT NULL," +
    "billing_status TEXT DEFAULT 'pending'," +
    "linked_order_id TEXT," +
    "total_value INTEGER DEFAULT 0," +
    "stock_deducted INTEGER DEFAULT 0," +
    "delivered_at TEXT," +
    "received_by TEXT," +
    "void_reason TEXT," +
    "voided_by TEXT," +
    "voided_at TEXT" +
    ");" +

    "CREATE TABLE IF NOT EXISTS delivery_challan_items (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT," +
    "challan_id TEXT NOT NULL," +
    "item_name TEXT NOT NULL," +
    "qty INTEGER NOT NULL DEFAULT 1," +
    "unit_price INTEGER DEFAULT 0," +
    "total_price INTEGER DEFAULT 0," +
    "FOREIGN KEY(challan_id) REFERENCES delivery_challans(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS sales_quotations (" +
    "id TEXT PRIMARY KEY," +
    "quote_number TEXT NOT NULL," +
    "customer_name TEXT NOT NULL," +
    "customer_mobile TEXT," +
    "customer_address TEXT," +
    "quote_date TEXT NOT NULL," +
    "valid_until TEXT," +
    "total_amount INTEGER NOT NULL DEFAULT 0," +
    "status TEXT NOT NULL DEFAULT 'pending'," +
    "converted_at TEXT," +
    "notes TEXT," +
    "created_by TEXT," +
    "created_at TEXT NOT NULL," +
    "service_request_id TEXT," +
    "enquiry_id TEXT" +
    ");" +

    "CREATE TABLE IF NOT EXISTS sales_quotation_items (" +
    "id TEXT PRIMARY KEY," +
    "quote_id TEXT NOT NULL," +
    "product_id TEXT," +
    "product_name TEXT NOT NULL," +
    "quantity INTEGER NOT NULL DEFAULT 1," +
    "unit_price INTEGER NOT NULL DEFAULT 0," +
    "unit_cost INTEGER NOT NULL DEFAULT 0," +
    "source TEXT," +
    "supplier_id TEXT," +
    "sq_id TEXT," +
    "sq_number TEXT," +
    "FOREIGN KEY(quote_id) REFERENCES sales_quotations(id)," +
    "FOREIGN KEY(product_id) REFERENCES products(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS quotation_versions (" +
    "id TEXT PRIMARY KEY," +
    "quote_id TEXT NOT NULL," +
    "version_number INTEGER NOT NULL DEFAULT 1," +
    "data_snapshot TEXT," +
    "created_by TEXT," +
    "created_at TEXT NOT NULL," +
    "FOREIGN KEY(quote_id) REFERENCES sales_quotations(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS audit_logs (" +
    "id TEXT PRIMARY KEY," +
    "user_id TEXT," +
    "user_name TEXT," +
    "user_role TEXT," +
    "action TEXT NOT NULL," +
    "entity_type TEXT NOT NULL," +
    "entity_id TEXT," +
    "old_value TEXT," +
    "new_value TEXT," +
    "ip_address TEXT," +
    "created_at TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS expenses (" +
    "id TEXT PRIMARY KEY," +
    "category TEXT NOT NULL," +
    "description TEXT," +
    "amount INTEGER NOT NULL DEFAULT 0," +
    "paid_to TEXT," +
    "payment_mode TEXT DEFAULT 'Cash'," +
    "receipt_url TEXT," +
    "related_service_id TEXT," +
    "related_order_id TEXT," +
    "recorded_by TEXT," +
    "recorded_by_name TEXT," +
    "expense_date TEXT NOT NULL," +
    "created_at TEXT NOT NULL," +
    "FOREIGN KEY(related_service_id) REFERENCES service_requests(id)," +
    "FOREIGN KEY(related_order_id) REFERENCES product_orders(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS sla_definitions (" +
    "id TEXT PRIMARY KEY," +
    "device_type TEXT NOT NULL," +
    "response_hours INTEGER NOT NULL DEFAULT 24," +
    "resolution_hours INTEGER NOT NULL DEFAULT 72," +
    "active INTEGER NOT NULL DEFAULT 1," +
    "created_at TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS stock_alerts (" +
    "id TEXT PRIMARY KEY," +
    "product_id TEXT NOT NULL," +
    "alert_type TEXT NOT NULL DEFAULT 'low_stock'," +
    "threshold INTEGER NOT NULL DEFAULT 5," +
    "current_stock INTEGER NOT NULL DEFAULT 0," +
    "active INTEGER NOT NULL DEFAULT 1," +
    "dismissed_at TEXT," +
    "last_notified TEXT," +
    "created_at TEXT NOT NULL," +
    "FOREIGN KEY(product_id) REFERENCES products(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS recurring_schedules (" +
    "id TEXT PRIMARY KEY," +
    "service_request_id TEXT," +
    "customer_name TEXT," +
    "customer_mobile TEXT," +
    "device_type TEXT," +
    "description TEXT," +
    "frequency TEXT NOT NULL DEFAULT 'quarterly'," +
    "next_due_date TEXT NOT NULL," +
    "last_completed TEXT," +
    "active INTEGER NOT NULL DEFAULT 1," +
    "created_by TEXT," +
    "created_at TEXT NOT NULL," +
    "FOREIGN KEY(service_request_id) REFERENCES service_requests(id)" +
    ");" +

    "CREATE TABLE IF NOT EXISTS communication_log (" +
    "id TEXT PRIMARY KEY," +
    "entity_type TEXT NOT NULL," +
    "entity_id TEXT NOT NULL," +
    "channel TEXT NOT NULL DEFAULT 'note'," +
    "direction TEXT NOT NULL DEFAULT 'outgoing'," +
    "subject TEXT," +
    "body TEXT," +
    "sent_by TEXT," +
    "sent_by_name TEXT," +
    "created_at TEXT NOT NULL" +
    ");" +

    "CREATE TABLE IF NOT EXISTS refresh_tokens (" +
    "id TEXT PRIMARY KEY," +
    "user_id TEXT NOT NULL," +
    "token_hash TEXT NOT NULL," +
    "expires_at TEXT NOT NULL," +
    "revoked_at TEXT," +
    "created_at TEXT NOT NULL" +
    ");"
  );

  const productColumns = db.prepare("PRAGMA table_info(products)").all();
  const columnNames = productColumns.map((column) => column.name);

  if (!columnNames.includes("discount_percent")) {
    db.exec("ALTER TABLE products ADD COLUMN discount_percent INTEGER NOT NULL DEFAULT 0");
  }

  if (!columnNames.includes("updated_by_employee_name")) {
    db.exec("ALTER TABLE products ADD COLUMN updated_by_employee_name TEXT");
  }

  if (!columnNames.includes("stock")) {
    db.exec("ALTER TABLE products ADD COLUMN stock INTEGER NOT NULL DEFAULT 10");
  }

  if (!columnNames.includes("supplier_id")) {
    db.exec("ALTER TABLE products ADD COLUMN supplier_id TEXT");
  }

  if (!columnNames.includes("hsn_code")) {
    db.exec("ALTER TABLE products ADD COLUMN hsn_code TEXT");
  }

  if (!columnNames.includes("gst_rate")) {
    db.exec("ALTER TABLE products ADD COLUMN gst_rate INTEGER NOT NULL DEFAULT 0");
  }

  if (!columnNames.includes("loose_stock")) {
    db.exec("ALTER TABLE products ADD COLUMN loose_stock INTEGER DEFAULT 0");
  }

  if (!columnNames.includes("image_url")) {
    db.exec("ALTER TABLE products ADD COLUMN image_url TEXT");
  }

  const orderColumns = db.prepare("PRAGMA table_info(product_orders)").all();
  const orderColumnNames = orderColumns.map((column) => column.name);
  if (!orderColumnNames.includes("payment_status")) {
    db.exec("ALTER TABLE product_orders ADD COLUMN payment_status TEXT DEFAULT 'pending'");
    db.exec("UPDATE product_orders SET payment_status = 'paid' WHERE status = 'Delivered'");
  }
  if (!orderColumnNames.includes("payment_mode")) {
    db.exec("ALTER TABLE product_orders ADD COLUMN payment_mode TEXT");
  }
  if (!orderColumnNames.includes("payment_date")) {
    db.exec("ALTER TABLE product_orders ADD COLUMN payment_date TEXT");
    db.exec("UPDATE product_orders SET payment_date = created_at WHERE payment_status = 'paid'");
  }
  if (!orderColumnNames.includes("taxable_amount")) {
    db.exec("ALTER TABLE product_orders ADD COLUMN taxable_amount INTEGER DEFAULT 0");
    db.exec("ALTER TABLE product_orders ADD COLUMN cgst_total INTEGER DEFAULT 0");
    db.exec("ALTER TABLE product_orders ADD COLUMN sgst_total INTEGER DEFAULT 0");
    db.exec("ALTER TABLE product_orders ADD COLUMN igst_total INTEGER DEFAULT 0");
    db.exec("ALTER TABLE product_orders ADD COLUMN gst_total INTEGER DEFAULT 0");
  }
  if (!orderColumnNames.includes("amount_paid")) {
    db.exec("ALTER TABLE product_orders ADD COLUMN amount_paid INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE product_orders SET amount_paid = total_amount WHERE payment_status = 'paid'");
  }

  const orderItemColumns = db.prepare("PRAGMA table_info(order_items)").all();
  const orderItemColumnNames = orderItemColumns.map(c => c.name);
  if (!orderItemColumnNames.includes("hsn_code")) {
    db.exec("ALTER TABLE order_items ADD COLUMN hsn_code TEXT");
    db.exec("ALTER TABLE order_items ADD COLUMN gst_rate INTEGER DEFAULT 0");
    db.exec("ALTER TABLE order_items ADD COLUMN taxable_amount INTEGER DEFAULT 0");
    db.exec("ALTER TABLE order_items ADD COLUMN cgst_amount INTEGER DEFAULT 0");
    db.exec("ALTER TABLE order_items ADD COLUMN sgst_amount INTEGER DEFAULT 0");
  }
  if (!orderItemColumnNames.includes("qty")) {
    db.exec("ALTER TABLE order_items ADD COLUMN qty INTEGER DEFAULT 1");
  }

  const serviceRequestColumns = db.prepare("PRAGMA table_info(service_requests)").all();
  const serviceRequestColumnNames = serviceRequestColumns.map((column) => column.name);

  if (!serviceRequestColumnNames.includes("payment_mode")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN payment_mode TEXT");
  }
  if (!serviceRequestColumnNames.includes("payment_date")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN payment_date TEXT");
    if (serviceRequestColumnNames.includes("bill_date")) {
      db.exec("UPDATE service_requests SET payment_date = bill_date WHERE payment_status = 'paid'");
    }
  }

  if (!serviceRequestColumnNames.includes("request_subject_type")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN request_subject_type TEXT");
  }

  if (!serviceRequestColumnNames.includes("request_subject_name")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN request_subject_name TEXT");
  }

  if (!serviceRequestColumnNames.includes("bill_status")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN bill_status TEXT DEFAULT 'none'");
  }
  if (!serviceRequestColumnNames.includes("bill_number")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN bill_number TEXT");
  }
  if (!serviceRequestColumnNames.includes("bill_date")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN bill_date TEXT");
  }
  if (!serviceRequestColumnNames.includes("bill_amount")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN bill_amount INTEGER DEFAULT 0");
  }
  if (!serviceRequestColumnNames.includes("bill_details")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN bill_details TEXT");
  }

  // Migrate legacy bill numbers (BILL-xxxx) to MONTH-YEAR-suffix format, e.g. AUG-2026-6ls6
  {
    const legacyBills = db.prepare("SELECT id, bill_number, bill_date FROM service_requests WHERE bill_number LIKE 'BILL-%' AND bill_date IS NOT NULL").all();
    const updateBillNo = db.prepare("UPDATE service_requests SET bill_number = ? WHERE id = ?");
    for (const b of legacyBills) {
      const suffix = b.bill_number.replace(/^BILL-BILL-/i, "").replace(/^BILL-/i, "").toLowerCase();
      const dateParts = String(b.bill_date).slice(0, 10).split("-");
      if (dateParts.length < 2) continue;
      const month = new Date(dateParts.join("-") + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase();
      updateBillNo.run(`${month}-${dateParts[0]}-${suffix}`, b.id);
    }
  }

  const serviceRequestColumnsNow = db.prepare("PRAGMA table_info(service_requests)").all().map((column) => column.name);
  if (!serviceRequestColumnsNow.includes("payment_status")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN payment_status TEXT DEFAULT 'none'");
  }
  if (!serviceRequestColumnsNow.includes("payment_mode")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN payment_mode TEXT");
  }
  // Ensure existing billed requests have at least 'pending' status if not already set
  db.exec("UPDATE service_requests SET payment_status = 'pending' WHERE bill_status = 'billed' AND (payment_status IS NULL OR payment_status = 'none')");

  if (!serviceRequestColumnsNow.includes("estimated_cost")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN estimated_cost INTEGER DEFAULT 0");
  }
  if (!serviceRequestColumnsNow.includes("taxable_amount")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN taxable_amount INTEGER DEFAULT 0");
    db.exec("ALTER TABLE service_requests ADD COLUMN cgst_total INTEGER DEFAULT 0");
    db.exec("ALTER TABLE service_requests ADD COLUMN sgst_total INTEGER DEFAULT 0");
    db.exec("ALTER TABLE service_requests ADD COLUMN gst_total INTEGER DEFAULT 0");
  }

  // Partial payment tracking for service bills
  const serviceColumnsNow = db.prepare("PRAGMA table_info(service_requests)").all().map((column) => column.name);
  if (!serviceColumnsNow.includes("amount_paid")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN amount_paid INTEGER NOT NULL DEFAULT 0");
  }
  if (!serviceColumnsNow.includes("discount_amount")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0");
  }
  // Backfill amount_paid only for legacy fully-paid bills that never went through the payment flow.
  // Never overwrite existing amount_paid: it already reflects actual Cash/UPI collections and discounts.
  db.exec("UPDATE service_requests SET amount_paid = bill_amount WHERE payment_status = 'paid' AND bill_amount IS NOT NULL AND amount_paid = 0 AND (discount_amount IS NULL OR discount_amount = 0)");
  // Backfill payment ledger from already-paid service bills. Idempotent on restart: skips any bill that
  // already has a payment row (from the incremental payment flow or a previous backfill) and skips
  // discounted bills, so the ledger never overstates actual cash/UPI collected.
  db.exec(`
    INSERT OR IGNORE INTO service_payments (id, service_request_id, amount, payment_mode, paid_at, created_at)
    SELECT 'SP-' || id, id, bill_amount, payment_mode, payment_date, created_at
    FROM service_requests
    WHERE bill_status = 'billed' AND payment_status = 'paid' AND payment_date IS NOT NULL AND bill_amount > 0
      AND (discount_amount IS NULL OR discount_amount = 0)
      AND NOT EXISTS (SELECT 1 FROM service_payments sp WHERE sp.service_request_id = service_requests.id)
  `);
  // Repair: remove backfilled 'SP-<request_id>' rows that duplicated real per-payment ledger rows
  // (a prior version inserted them on restart even when incremental payments already existed).
  db.exec(`
    DELETE FROM service_payments
    WHERE id = 'SP-' || service_request_id
      AND EXISTS (
        SELECT 1 FROM service_payments other
        WHERE other.service_request_id = service_payments.service_request_id
          AND other.id != service_payments.id
      )
  `);

  if (!serviceRequestColumnsNow.includes("requested_parts")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN requested_parts TEXT");
  }
  if (!serviceRequestColumnsNow.includes("part_request_status")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN part_request_status TEXT DEFAULT 'none'");
  }
  if (!serviceRequestColumnsNow.includes("survey_status")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN survey_status TEXT DEFAULT 'none'");
  }

  if (!serviceRequestColumnsNow.includes("cancel_reason")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN cancel_reason TEXT");
  }
  if (!serviceRequestColumnsNow.includes("canceled_at")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN canceled_at TEXT");
  }
  if (!serviceRequestColumnsNow.includes("completed_at")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN completed_at TEXT");
    db.exec("UPDATE service_requests SET completed_at = scheduled_date WHERE status = 'Completed'");
  }
  if (!serviceRequestColumnsNow.includes("used_items")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN used_items TEXT");
  }
  if (!serviceRequestColumnsNow.includes("conveyance_expense")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN conveyance_expense INTEGER DEFAULT 0");
  }
  if (!serviceRequestColumnsNow.includes("status_notes")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN status_notes TEXT");
  }

  // Rename legacy request type labels (cosmetic migration, idempotent)
  db.exec("UPDATE service_requests SET device_type = 'Device Service' WHERE device_type = 'Old Device Service'");
  db.exec("UPDATE service_requests SET device_type = 'Installation Service' WHERE device_type = 'Old Installation Service'");

  const purchaseColumns = db.prepare("PRAGMA table_info(purchases)").all();
  const purchaseColumnNames = purchaseColumns.map((column) => column.name);
  if (!purchaseColumnNames.includes("payment_status")) {
    db.exec("ALTER TABLE purchases ADD COLUMN payment_status TEXT DEFAULT 'paid'");
  }
  if (!purchaseColumnNames.includes("payment_mode")) {
    db.exec("ALTER TABLE purchases ADD COLUMN payment_mode TEXT");
  }
  if (!purchaseColumnNames.includes("payment_date")) {
    db.exec("ALTER TABLE purchases ADD COLUMN payment_date TEXT");
    db.exec("UPDATE purchases SET payment_date = purchase_date WHERE payment_status = 'paid'");
  }
  if (!purchaseColumnNames.includes("taxable_amount")) {
    db.exec("ALTER TABLE purchases ADD COLUMN taxable_amount INTEGER DEFAULT 0");
    db.exec("ALTER TABLE purchases ADD COLUMN cgst_total INTEGER DEFAULT 0");
    db.exec("ALTER TABLE purchases ADD COLUMN sgst_total INTEGER DEFAULT 0");
    db.exec("ALTER TABLE purchases ADD COLUMN gst_total INTEGER DEFAULT 0");
    db.exec("ALTER TABLE purchases ADD COLUMN gst_invoice_number TEXT");
  }

  const purchaseColumnsNow = db.prepare("PRAGMA table_info(purchases)").all();
  const purchaseColNamesNow = purchaseColumnsNow.map((column) => column.name);
  if (!purchaseColNamesNow.includes("amount_paid")) {
    db.exec("ALTER TABLE purchases ADD COLUMN amount_paid INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE purchases SET amount_paid = total_cost WHERE payment_status = 'paid' AND total_cost IS NOT NULL");
  }

  try { db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_parties_mobile ON parties(mobile)"); } catch (e) {}

  const supplierQuoteColumns = db.prepare("PRAGMA table_info(supplier_quotes)").all();
  const supplierQuoteColumnNames = supplierQuoteColumns.map((column) => column.name);
  if (!supplierQuoteColumnNames.includes("pdf_path")) {
    db.exec("ALTER TABLE supplier_quotes ADD COLUMN pdf_path TEXT");
    db.exec("ALTER TABLE supplier_quotes ADD COLUMN pdf_name TEXT");
  }
  const supplierQuoteColumnsNow = db.prepare("PRAGMA table_info(supplier_quotes)").all();
  const supplierQuoteColNamesNow = supplierQuoteColumnsNow.map((column) => column.name);
  if (!supplierQuoteColNamesNow.includes("for_enquiry_id")) {
    db.exec("ALTER TABLE supplier_quotes ADD COLUMN for_enquiry_id TEXT");
  }

  // Enquiry workflow columns
  const enquiryColumns = db.prepare("PRAGMA table_info(enquiries)").all();
  const enquiryColNames = enquiryColumns.map(c => c.name);
  if (!enquiryColNames.includes("supplier_id")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN supplier_id TEXT");
  }
  if (!enquiryColNames.includes("cost_price")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN cost_price INTEGER DEFAULT 0");
  }
  if (!enquiryColNames.includes("quoted_price")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN quoted_price INTEGER DEFAULT 0");
  }
  if (!enquiryColNames.includes("quantity")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN quantity INTEGER DEFAULT 1");
  }
  if (!enquiryColNames.includes("product_id")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN product_id TEXT");
  }
  if (!enquiryColNames.includes("po_id")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN po_id TEXT");
  }
  if (!enquiryColNames.includes("po_ids")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN po_ids TEXT");
  }
  if (!enquiryColNames.includes("supplier_quote_id")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN supplier_quote_id TEXT");
  }
  if (!enquiryColNames.includes("quote_options")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN quote_options TEXT");
  }
  if (!enquiryColNames.includes("valid_until")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN valid_until TEXT");
  }
  if (!enquiryColNames.includes("advance_amount")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN advance_amount INTEGER DEFAULT 0");
    db.exec("ALTER TABLE enquiries ADD COLUMN advance_mode TEXT");
    db.exec("ALTER TABLE enquiries ADD COLUMN advance_date TEXT");
  }
  if (!enquiryColNames.includes("final_received")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN final_received INTEGER DEFAULT 0");
    db.exec("ALTER TABLE enquiries ADD COLUMN final_mode TEXT");
    db.exec("ALTER TABLE enquiries ADD COLUMN final_date TEXT");
  }
  if (!enquiryColNames.includes("supplier_advance_amount")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN supplier_advance_amount INTEGER DEFAULT 0");
    db.exec("ALTER TABLE enquiries ADD COLUMN supplier_advance_mode TEXT");
    db.exec("ALTER TABLE enquiries ADD COLUMN supplier_advance_date TEXT");
    db.exec("ALTER TABLE enquiries ADD COLUMN customer_advance_amount INTEGER DEFAULT 0");
    db.exec("ALTER TABLE enquiries ADD COLUMN customer_advance_mode TEXT");
    db.exec("ALTER TABLE enquiries ADD COLUMN customer_advance_date TEXT");

    // Migration: If Suganthraj has 5000 in legacy advance_amount, move it to supplier_advance
    db.exec("UPDATE enquiries SET supplier_advance_amount = advance_amount, supplier_advance_mode = advance_mode, supplier_advance_date = advance_date WHERE customer_name LIKE '%Suganthraj%' AND advance_amount = 5000");
    // Clear the legacy field for him so it doesn't double count
    db.exec("UPDATE enquiries SET advance_amount = 0 WHERE customer_name LIKE '%Suganthraj%' AND supplier_advance_amount = 5000");
  }
  if (!enquiryColNames.includes("lead_source")) {
    db.exec("ALTER TABLE enquiries ADD COLUMN lead_source TEXT DEFAULT 'Walk-in'");
  }

  // Phase 1: New feature columns on existing tables
  const productColsNow = db.prepare("PRAGMA table_info(products)").all().map(c => c.name);
  if (!productColsNow.includes("min_stock")) {
    db.exec("ALTER TABLE products ADD COLUMN min_stock INTEGER NOT NULL DEFAULT 0");
  }

  const srColsNow = db.prepare("PRAGMA table_info(service_requests)").all().map(c => c.name);
  if (!srColsNow.includes("sla_response_deadline")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN sla_response_deadline TEXT");
  }
  if (!srColsNow.includes("sla_resolution_deadline")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN sla_resolution_deadline TEXT");
  }
  if (!srColsNow.includes("sla_breached")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN sla_breached INTEGER NOT NULL DEFAULT 0");
  }
  if (!srColsNow.includes("technician_location")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN technician_location TEXT");
  }
  if (!srColsNow.includes("device_intake")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN device_intake TEXT");
  }

  const sqColsNow = db.prepare("PRAGMA table_info(sales_quotations)").all().map(c => c.name);
  if (!sqColsNow.includes("current_version")) {
    db.exec("ALTER TABLE sales_quotations ADD COLUMN current_version INTEGER NOT NULL DEFAULT 1");
  }

  // Unified quotation engine: cost/source tracking on sales quotation items
  const sqiColsNow = db.prepare("PRAGMA table_info(sales_quotation_items)").all().map(c => c.name);
  if (!sqiColsNow.includes("unit_cost")) {
    db.exec("ALTER TABLE sales_quotation_items ADD COLUMN unit_cost INTEGER NOT NULL DEFAULT 0");
  }
  if (!sqiColsNow.includes("source")) {
    db.exec("ALTER TABLE sales_quotation_items ADD COLUMN source TEXT");
  }
  if (!sqiColsNow.includes("supplier_id")) {
    db.exec("ALTER TABLE sales_quotation_items ADD COLUMN supplier_id TEXT");
  }
  if (!sqiColsNow.includes("sq_id")) {
    db.exec("ALTER TABLE sales_quotation_items ADD COLUMN sq_id TEXT");
  }
  if (!sqiColsNow.includes("sq_number")) {
    db.exec("ALTER TABLE sales_quotation_items ADD COLUMN sq_number TEXT");
  }
};

const migrateParties = () => {
  const existing = db.prepare("SELECT COUNT(*) as c FROM parties").get().c;
  if (existing > 0) return;

  const insert = db.prepare(`INSERT INTO parties (id, name, mobile, email, address, gst_number, contact_person, notes, is_supplier, is_customer, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  // Migrate suppliers
  const suppliers = db.prepare("SELECT * FROM suppliers").all();
  for (const s of suppliers) {
    try {
      insert.run(s.id, s.name, s.mobile, s.email, s.address, s.gst_number, s.contact_person, s.notes, 1, 0, s.created_at);
    } catch (e) { /* skip duplicate mobile */ }
  }

  // Migrate customers from product_orders
  const orderCustomers = db.prepare("SELECT DISTINCT customer_mobile, MAX(customer_name) as name, MAX(customer_address) as address FROM product_orders GROUP BY customer_mobile").all();
  for (const c of orderCustomers) {
    if (!c.customer_mobile) continue;
    const existingParty = db.prepare("SELECT id FROM parties WHERE mobile = ?").get(c.customer_mobile);
    if (existingParty) {
      db.prepare("UPDATE parties SET is_customer = 1 WHERE id = ?").run(existingParty.id);
    } else {
      const id = `party-${Math.random().toString(36).slice(2, 8)}`;
      insert.run(id, c.name, c.customer_mobile, null, null, null, null, null, 0, 1, nowIso());
    }
  }

  // Migrate customers from service_requests
  const serviceCustomers = db.prepare("SELECT DISTINCT customer_mobile, MAX(customer_name) as name FROM service_requests GROUP BY customer_mobile").all();
  for (const c of serviceCustomers) {
    if (!c.customer_mobile) continue;
    const existingParty = db.prepare("SELECT id FROM parties WHERE mobile = ?").get(c.customer_mobile);
    if (existingParty) {
      db.prepare("UPDATE parties SET is_customer = 1 WHERE id = ?").run(existingParty.id);
    } else {
      const id = `party-${Math.random().toString(36).slice(2, 8)}`;
      insert.run(id, c.name, c.customer_mobile, null, null, null, null, null, 0, 1, nowIso());
    }
  }

  // Migrate customer users
  const userCustomers = db.prepare("SELECT mobile, name FROM users WHERE role = 'customer'").all();
  for (const c of userCustomers) {
    if (!c.mobile) continue;
    const existingParty = db.prepare("SELECT id FROM parties WHERE mobile = ?").get(c.mobile);
    if (existingParty) {
      db.prepare("UPDATE parties SET is_customer = 1 WHERE id = ?").run(existingParty.id);
    } else {
      const id = `party-${Math.random().toString(36).slice(2, 8)}`;
      insert.run(id, c.name, c.mobile, null, null, null, null, null, 0, 1, nowIso());
    }
  }
};

const nowIso = () => new Date().toISOString();

const getNextSeq = (prefix) => {
  const today = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const table = prefix === "order" ? "product_orders" : prefix === "service" ? "service_requests" : prefix + "s";
  const row = db.prepare(`SELECT id FROM ${table} WHERE id LIKE ? ORDER BY id DESC LIMIT 1`).get(`${today}%`);
  const seq = row ? parseInt(row.id.split("-")[1] || "0") + 1 : 1;
  return `${today}-${String(seq).padStart(3, "0")}`;
};

const getServiceSeq = () => {
  const today = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const row = db.prepare(`SELECT id FROM service_requests WHERE id LIKE ? ORDER BY id DESC LIMIT 1`).get(`${today}%`);
  const seq = row ? parseInt(row.id.split("-")[1] || "0") + 1 : 1;
  return `${today}-${String(seq).padStart(3, "0")}`;
};

const getChallanSeq = () => {
  const today = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const row = db.prepare(`SELECT id FROM delivery_challans WHERE id LIKE ? ORDER BY id DESC LIMIT 1`).get(`${today}%`);
  const seq = row ? parseInt(row.id.split("-")[1] || "0") + 1 : 1;
  return `${today}-${String(seq).padStart(3, "0")}`;
};

const getQuoteSeq = () => {
  const today = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const row = db.prepare(`SELECT quote_number FROM sales_quotations WHERE quote_number LIKE ? ORDER BY quote_number DESC LIMIT 1`).get(`Q-${today}-%`);
  const seq = row ? parseInt(row.quote_number.split("-")[2] || "0") + 1 : 1;
  return `Q-${today}-${String(seq).padStart(3, "0")}`;
};

const makeId = (prefix) => {
  if (prefix === "order") return getNextSeq("order");
  if (prefix === "service") return getServiceSeq();
  if (prefix === "challan") return getChallanSeq();
  if (prefix === "customer") return `C${Date.now().toString().slice(-6)}`;
  return `${prefix}-${Math.random().toString(36).slice(2, 6)}`;
};

// Indian financial year (Apr 1 - Mar 31) for a YYYY-MM-DD date, e.g. "26-27"
const getFy = (dateStr) => {
  const d = String(dateStr || "").slice(0, 10) || nowIso().slice(0, 10);
  const y = parseInt(d.slice(0, 4), 10);
  const m = parseInt(d.slice(5, 7), 10);
  if (!y || !m) return "";
  const startYear = m >= 4 ? y : y - 1;
  return `${String(startYear).slice(-2)}-${String(startYear + 1).slice(-2)}`;
};

// Next INVOICE_series bill number for the FY of the given date, e.g. INV-26-27-0001
const nextBillNumber = (dateStr) => {
  const fy = getFy(dateStr);
  const key = `bill_seq_${fy}`;
  const tx = db.transaction(() => {
    const row = db.prepare("SELECT value FROM business_settings WHERE key = ?").get(key);
    const next = (row ? parseInt(row.value, 10) || 0 : 0) + 1;
    db.prepare("INSERT INTO business_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .run(key, String(next));
    return `INV-${fy}-${String(next).padStart(4, "0")}`;
  });
  return tx();
};
const seedDatabase = () => {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const getUserByEmail = db.prepare("SELECT id FROM users WHERE email = ?");
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, mobile, created_at)
    VALUES (@id, @name, @email, @password_hash, @role, @mobile, @created_at)
  `);
  const defaultPasswords = {
    admin: process.env.DEFAULT_ADMIN_PASSWORD || "admin123",
    employee: process.env.DEFAULT_EMPLOYEE_PASSWORD || "service123",
    sales: process.env.DEFAULT_SALES_PASSWORD || "sales123",
    technician: process.env.DEFAULT_TECHNICIAN_PASSWORD || "tech123",
  };
  const adminHash = bcrypt.hashSync(defaultPasswords.admin, 10);
  const employeeHash = bcrypt.hashSync(defaultPasswords.employee, 10);
  const salesHash = bcrypt.hashSync(defaultPasswords.sales, 10);
  const technicianHash = bcrypt.hashSync(defaultPasswords.technician, 10);

  const ensureUser = (user) => {
    if (!user.email || getUserByEmail.get(user.email)) {
      return;
    }
    const existingByMobile = db.prepare("SELECT id FROM users WHERE mobile = ?").get(user.mobile);
    if (existingByMobile) {
      return;
    }

    insertUser.run({
      ...user,
      created_at: nowIso(),
    });
  };

  if (userCount > 0) {
    ensureUser({
      id: "sales-1",
      name: "Sales Manager",
      email: "sales@techlab.in",
      password_hash: salesHash,
      role: "sales",
      mobile: "9000000004",
    });
    ensureUser({
      id: "technician-1",
      name: "Service Tech",
      email: "tech@techlab.in",
      password_hash: technicianHash,
      role: "technician",
      mobile: "9000000003",
    });
    return;
  }

  const insertProduct = db.prepare(`
    INSERT INTO products (id, type, name, price, description, discount_percent, updated_by_employee_name, active, stock, hsn_code, gst_rate)
    VALUES (@id, @type, @name, @price, @description, @discount_percent, @updated_by_employee_name, 1, @stock, @hsn_code, @gst_rate)
  `);

  const insertOrder = db.prepare(`
    INSERT INTO product_orders (id, customer_mobile, customer_name, total_amount, status, created_at)
    VALUES (@id, @customer_mobile, @customer_name, @total_amount, @status, @created_at)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, product_name, price)
    VALUES (@id, @order_id, @product_id, @product_name, @price)
  `);

  const insertService = db.prepare(`
    INSERT INTO service_requests (
      id, customer_name, customer_mobile, device_type, request_subject_type, request_subject_name, issue, preferred_date,
      assigned_employee_id, assigned_employee_name, service_person, scheduled_date, status, created_at
    ) VALUES (
      @id, @customer_name, @customer_mobile, @device_type, @request_subject_type, @request_subject_name, @issue, @preferred_date,
      @assigned_employee_id, @assigned_employee_name, @service_person, @scheduled_date, @status, @created_at
    )
  `);

  insertUser.run({
    id: "admin-1",
    name: "Main Admin",
    email: "admin@techlab.in",
    password_hash: adminHash,
    role: "admin",
    mobile: "9000000001",
    created_at: nowIso(),
  });

  insertUser.run({
    id: "employee-1",
    name: "Service Coordinator",
    email: "service@techlab.in",
    password_hash: employeeHash,
    role: "employee",
    mobile: "9000000002",
    created_at: nowIso(),
  });

  insertUser.run({
    id: "sales-1",
    name: "Sales Manager",
    email: "sales@techlab.in",
    password_hash: salesHash,
    role: "sales",
    mobile: "9000000004",
    created_at: nowIso(),
  });

  insertUser.run({
    id: "technician-1",
    name: "Service Tech",
    email: "tech@techlab.in",
    password_hash: technicianHash,
    role: "technician",
    mobile: "9000000003",
    created_at: nowIso(),
  });

  insertUser.run({
    id: "customer-1",
    name: "Arun Kumar",
    email: null,
    password_hash: null,
    role: "customer",
    mobile: "9990000001",
    created_at: nowIso(),
  });

  [
    { id: "product-1", type: "Laptop", name: "HP 15 Business Laptop", price: 42999, description: "Intel Core i5, 16GB RAM, 512GB SSD, Windows 11.", discount_percent: 8, updated_by_employee_name: "Service Coordinator", stock: 10, hsn_code: "84713000", gst_rate: 18 },
    { id: "product-2", type: "Desktop", name: "Office Desktop Tower", price: 35999, description: "Core i5 desktop for office billing, browsing, and reporting.", discount_percent: 5, updated_by_employee_name: "Service Coordinator", stock: 8, hsn_code: "84715000", gst_rate: 18 },
    { id: "product-3", type: "CCTV", name: "4 Camera CCTV Kit", price: 17999, description: "Full HD cameras with DVR, cables, and app setup.", discount_percent: 12, updated_by_employee_name: "Service Coordinator", stock: 6, hsn_code: "85219000", gst_rate: 18 },
    { id: "product-4", type: "Accessory", name: "Wi-Fi Router + UPS Pack", price: 4999, description: "Networking kit for small shops and offices.", discount_percent: 0, updated_by_employee_name: "Service Coordinator", stock: 12, hsn_code: "85044010", gst_rate: 18 },
  ].forEach((product) => insertProduct.run(product));

  insertOrder.run({
    id: "order-1",
    customer_mobile: "9000000003",
    customer_name: "Arun Kumar",
    total_amount: 42999,
    status: "Ordered",
    created_at: "2026-04-06",
  });

  insertOrderItem.run({
    id: makeId("order-item"),
    order_id: "order-1",
    product_id: "product-1",
    product_name: "HP 15 Business Laptop",
    price: 42999,
  });

  insertService.run({
    id: "service-1",
    customer_name: "Arun Kumar",
    customer_mobile: "9000000003",
    device_type: "Laptop",
    request_subject_type: "owned-product",
    request_subject_name: "HP 15 Business Laptop",
    issue: "Display flickering and overheating",
    preferred_date: "2026-04-08",
    assigned_employee_id: "employee-1",
    assigned_employee_name: "Service Coordinator",
    service_person: "Mani",
    scheduled_date: "2026-04-08",
    status: "Scheduled",
    created_at: "2026-04-06",
  });
};

initializeDatabase();

const purchaseFks = db.prepare("PRAGMA foreign_key_list(purchases)").all();
if (purchaseFks.some((fk) => fk.table === "suppliers")) {
  db.pragma("foreign_keys = OFF");
  try {
    db.exec(`
      CREATE TABLE purchases_new (
        id TEXT PRIMARY KEY,
        supplier_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_id TEXT,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_cost INTEGER NOT NULL DEFAULT 0,
        total_cost INTEGER NOT NULL DEFAULT 0,
        purchase_date TEXT NOT NULL,
        invoice_number TEXT,
        payment_status TEXT DEFAULT 'paid',
        payment_mode TEXT,
        payment_date TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        taxable_amount INTEGER DEFAULT 0,
        cgst_total INTEGER DEFAULT 0,
        sgst_total INTEGER DEFAULT 0,
        gst_total INTEGER DEFAULT 0,
        gst_invoice_number TEXT,
        FOREIGN KEY(supplier_id) REFERENCES parties(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );
      INSERT INTO purchases_new (id, supplier_id, product_name, product_id, quantity, unit_cost, total_cost, purchase_date, invoice_number, payment_status, payment_mode, payment_date, notes, created_at, taxable_amount, cgst_total, sgst_total, gst_total, gst_invoice_number)
        SELECT id, supplier_id, product_name, product_id, quantity, unit_cost, total_cost, purchase_date, invoice_number, payment_status, payment_mode, payment_date, notes, created_at, taxable_amount, cgst_total, sgst_total, gst_total, gst_invoice_number FROM purchases;
      DROP TABLE purchases;
      ALTER TABLE purchases_new RENAME TO purchases;
    `);
  } finally {
    db.pragma("foreign_keys = ON");
  }
}

const seedProducts = () => {
  const upsert = db.prepare(`
    INSERT OR IGNORE INTO products (id, type, name, price, description, discount_percent, updated_by_employee_name, active, stock, hsn_code, gst_rate)
    VALUES (@id, @type, @name, @price, @description, @discount_percent, @updated_by_employee_name, 1, @stock, @hsn_code, @gst_rate)
  `);
  const P = (id, type, name, price, description, stock, hsn_code, gst_rate, discount_percent = 0) =>
    ({ id, type, name, price, description, stock, hsn_code, gst_rate, discount_percent, updated_by_employee_name: "Service Coordinator" });

  [
    P("product-1", "Laptop", "HP 15 Business Laptop", 42999, "Intel Core i5, 16GB RAM, 512GB SSD, Windows 11.", 10, "84713000", 18, 8),
    P("product-2", "Desktop", "Office Desktop Tower", 35999, "Core i5 desktop for office billing, browsing, and reporting.", 8, "84715000", 18, 5),
    P("product-3", "CCTV", "4 Camera CCTV Kit", 17999, "Full HD cameras with DVR, cables, and app setup.", 6, "85219000", 18, 12),
    P("product-4", "Accessory", "Wi-Fi Router + UPS Pack", 4999, "Networking kit for small shops and offices.", 12, "85044010", 18),
    P("product-5", "Laptop", "Dell Inspiron 15 Laptop", 45999, "Intel Core i5, 16GB RAM, 512GB SSD, Windows 11 + Office.", 6, "84713000", 18, 7),
    P("product-6", "Laptop", "Lenovo IdeaPad Slim 3", 38999, "AMD Ryzen 5, 8GB RAM, 512GB SSD, slim & light.", 8, "84713000", 18, 5),
    P("product-7", "Laptop", "Acer Aspire 5", 35999, "Intel Core i3, 8GB RAM, 256GB SSD, 15.6-inch display.", 5, "84713000", 18),
    P("product-8", "Laptop", "HP Pavilion 14", 54999, "Core i5, 16GB RAM, 512GB SSD, FHD IPS display.", 4, "84713000", 18, 6),
    P("product-9", "Laptop", "Asus VivoBook 15", 41999, "Core i5, 8GB RAM, 512GB SSD, fingerprint sensor.", 7, "84713000", 18, 5),
    P("product-10", "Laptop", "Gaming Laptop GTX 1650", 74999, "Core i5, 16GB RAM, 512GB SSD, GTX 1650 graphics.", 3, "84713000", 18, 8),
    P("product-11", "Desktop", "All-in-One Desktop", 32999, "21.5-inch touchscreen AIO with Intel Core i3.", 5, "84715000", 18),
    P("product-12", "Desktop", "Gaming Desktop", 64999, "Ryzen 5 + RTX 3050, 16GB RAM, 512GB SSD.", 3, "84715000", 18, 10),
    P("product-13", "Desktop", "Mini Desktop (Tiny PC)", 21999, "Compact Core i3 mini PC for POS and basic tasks.", 6, "84715000", 18),
    P("product-14", "CCTV", "8 Camera CCTV Kit", 29999, "8 Full HD cameras with 8-ch DVR, cables, and app setup.", 4, "85219000", 18, 12),
    P("product-15", "CCTV", "16 Camera CCTV Kit", 54999, "16 Full HD cameras with 16-ch DVR, cables, and setup.", 2, "85219000", 18, 12),
    P("product-16", "CCTV", "HD Bullet Camera", 1499, "2MP Full HD bullet camera with IR night vision.", 40, "85258020", 18),
    P("product-17", "CCTV", "HD Dome Camera", 1599, "2MP Full HD dome camera for indoor use.", 40, "85258020", 18),
    P("product-18", "CCTV", "8-Channel DVR", 4499, "8-ch H.265 DVR with mobile app remote viewing.", 8, "85219000", 18),
    P("product-19", "CCTV", "16-Channel DVR", 7999, "16-ch H.265 DVR with mobile app remote viewing.", 5, "85219000", 18),
    P("product-20", "CCTV", "32-inch CCTV Monitor", 8999, "LED monitor for CCTV and billing use.", 6, "85285200", 18),
    P("product-21", "CCTV", "1TB Surveillance Hard Disk", 3999, "1TB WD Purple for 24x7 CCTV recording.", 10, "85235100", 18),
    P("product-22", "CCTV", "2TB Surveillance Hard Disk", 5499, "2TB WD Purple for 24x7 CCTV recording.", 8, "85235100", 18),
    P("product-23", "CCTV", "CCTV Power Supply Box", 899, "10A power supply box for cameras.", 20, "85044010", 18),
    P("product-24", "CCTV", "RG59 CCTV Cable (per meter)", 25, "Coaxial + power cable for CCTV runs.", 500, "85444920", 18),
    P("product-25", "CCTV", "Wi-Fi IP Camera", 2999, "2MP Wi-Fi smart camera with two-way audio.", 10, "85258020", 18, 5),
    P("product-26", "CCTV", "PTZ Speed Dome Camera", 12999, "Full HD 20x zoom PTZ camera for large sites.", 2, "85258020", 18, 8),
    P("product-27", "Accessory", "USB Keyboard + Mouse Combo", 899, "Wired combo for desktops.", 20, "84716040", 18),
    P("product-28", "Accessory", "Wireless Mouse", 599, "2.4GHz wireless mouse.", 15, "84716040", 18),
    P("product-29", "Accessory", "External Hard Disk 1TB", 4999, "1TB portable USB 3.0 external drive.", 8, "85235100", 18, 5),
    P("product-30", "Accessory", "64GB Pendrive", 699, "USB 3.0 64GB flash drive.", 30, "85235100", 18),
    P("product-31", "Accessory", "UPS 600VA", 2499, "600VA UPS with battery backup.", 12, "85044010", 18),
    P("product-32", "Accessory", "UPS 1100VA", 4499, "1100VA UPS for PC and billing systems.", 8, "85044010", 18, 5),
    P("product-33", "Accessory", "Stabilizer 2kVA", 2999, "Voltage stabilizer for computers.", 8, "85044010", 18),
    P("product-34", "Accessory", "Laptop Charger 65W", 1499, "65W universal laptop adapter.", 10, "85044010", 18),
    P("product-35", "Accessory", "HDMI Cable 2m", 399, "High-speed HDMI cable.", 25, "85444220", 18),
    P("product-36", "Accessory", "VGA Cable 1.8m", 249, "VGA cable for monitors.", 20, "85444220", 18),
    P("product-37", "Accessory", "8GB DDR4 RAM", 2499, "8GB DDR4 3200MHz desktop memory.", 10, "84733010", 18),
    P("product-38", "Accessory", "256GB SATA SSD", 2699, "256GB SATA III SSD for speed upgrade.", 12, "84717020", 18),
    P("product-39", "Accessory", "512GB NVMe SSD", 4499, "512GB NVMe SSD for laptops and desktops.", 10, "84717020", 18, 5),
    P("product-40", "Accessory", "HD Webcam", 1299, "Full HD webcam for video calls.", 8, "85258900", 18),
    P("product-41", "Accessory", "Headset with Mic", 1499, "USB headset for calling and support.", 10, "85183000", 18),
    P("product-42", "Accessory", "Laptop Bag 15.6-inch", 999, "Water-resistant laptop sleeve bag.", 12, "42021210", 18),
    P("product-43", "Accessory", "Anti-Virus 1-Year", 799, "1-year license for 1 PC.", 15, "85235100", 18),
    P("product-44", "Printer", "HP LaserJet Printer", 12999, "Monochrome laser printer with duplex.", 4, "84433100", 18, 5),
    P("product-45", "Printer", "Canon Inkjet Printer", 6999, "Multi-function inkjet printer with scanner.", 5, "84433100", 18),
    P("product-46", "Printer", "Epson EcoTank Printer", 14999, "Tank printer with high-yield refillable ink.", 4, "84433100", 18, 8),
    P("product-47", "Printer", "Thermal Receipt Printer", 5499, "80mm thermal POS printer for billing.", 6, "84433210", 18),
    P("product-48", "Networking", "Dual Band Wi-Fi Router", 1999, "AC1200 dual-band gigabit router.", 10, "85176290", 18),
    P("product-49", "Networking", "8-Port Network Switch", 1499, "8-port gigabit unmanaged switch.", 6, "85176290", 18),
    P("product-50", "Networking", "Network Cable 20m", 499, "Cat6 patch cable with connectors.", 20, "85444920", 18),
    P("product-51", "Networking", "Wi-Fi Access Point", 2999, "Indoor access point for office coverage.", 5, "85176290", 18),
    P("product-52", "Networking", "ADSL Modem Router Combo", 2499, "Modem + router combo with 4 LAN ports.", 6, "85176290", 18),
  ].forEach((product) => upsert.run(product));
};

const otpTableCols = db.prepare("PRAGMA table_info(otp_codes)").all().map((c) => c.name);
if (!otpTableCols.includes("id") || !otpTableCols.includes("consumed_at")) {
  db.exec("DROP TABLE IF EXISTS otp_codes");
  db.exec(
    "CREATE TABLE otp_codes (" +
    "id TEXT PRIMARY KEY," +
    "mobile TEXT NOT NULL," +
    "code TEXT NOT NULL," +
    "expires_at TEXT NOT NULL," +
    "consumed_at TEXT" +
    ");"
  );
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_orders_mobile ON product_orders(customer_mobile);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON product_orders(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created ON product_orders(created_at);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  CREATE INDEX IF NOT EXISTS idx_requests_mobile ON service_requests(customer_mobile);
  CREATE INDEX IF NOT EXISTS idx_requests_status ON service_requests(status);
  CREATE INDEX IF NOT EXISTS idx_requests_created ON service_requests(created_at);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
  CREATE INDEX IF NOT EXISTS idx_purchases_product ON purchases(product_id);
  CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
  CREATE INDEX IF NOT EXISTS idx_challans_source ON delivery_challans(source_type, source_id);
  CREATE INDEX IF NOT EXISTS idx_challan_items_challan ON delivery_challan_items(challan_id);
  CREATE INDEX IF NOT EXISTS idx_sales_quotes_created ON sales_quotations(created_at);
  CREATE INDEX IF NOT EXISTS idx_sales_quote_items_quote ON sales_quotation_items(quote_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
  CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
  CREATE INDEX IF NOT EXISTS idx_stock_alerts_product ON stock_alerts(product_id);
  CREATE INDEX IF NOT EXISTS idx_stock_alerts_active ON stock_alerts(active);
  CREATE INDEX IF NOT EXISTS idx_recurring_next_due ON recurring_schedules(next_due_date, active);
  CREATE INDEX IF NOT EXISTS idx_comm_log_entity ON communication_log(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_quote_versions_quote ON quotation_versions(quote_id);
`);

try {
  db.exec("ALTER TABLE product_orders ADD COLUMN customer_address TEXT");
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}

// Bill number display column (FY-based running series, shared across orders + service bills)
try {
  const poCols = db.prepare("PRAGMA table_info(product_orders)").all().map(c => c.name);
  if (!poCols.includes("bill_number")) {
    db.exec("ALTER TABLE product_orders ADD COLUMN bill_number TEXT");
  }
} catch (e) {
  if (!e.message.includes('duplicate column name')) throw e;
}

// Assign FY-based bill numbers to existing orders + billed service requests that lack one.
// Idempotent: only NULL rows are touched; counter per FY is max(existing INV-<fy>- numbers).
function backfillBillNumbers() {
  try {
    const settings = db.prepare("SELECT key, value FROM business_settings WHERE key LIKE 'bill_seq_%'").all();
    const counter = {};
    for (const s of settings) counter[s.key] = Number(s.value) || 0;

    const takeMax = (fy) => {
      const key = `bill_seq_${fy}`;
      const row = db.prepare(`
        SELECT MAX(CAST(substr(bill_number, -4) AS INTEGER)) AS m FROM (
          SELECT bill_number FROM product_orders WHERE bill_number LIKE ?
          UNION ALL
          SELECT bill_number FROM service_requests WHERE bill_number LIKE ?
        )
      `).get(`INV-${fy}-%`, `INV-${fy}-%`);
      const m = Number(row && row.m || 0);
      if (m > (counter[key] || 0)) counter[key] = m;
    };

    const upsert = db.prepare("INSERT INTO business_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
    const pending = [
      ...db.prepare("SELECT id, created_at AS d, 'order' AS kind FROM product_orders WHERE bill_number IS NULL AND status != 'Cancelled'").all(),
      ...db.prepare("SELECT id, COALESCE(bill_date, created_at) AS d, 'service' AS kind FROM service_requests WHERE bill_number IS NULL AND bill_status = 'billed'").all(),
      ...db.prepare("SELECT id, COALESCE(bill_date, created_at) AS d, 'service' AS kind FROM service_requests WHERE bill_number IS NOT NULL AND bill_number NOT LIKE 'INV-%' AND bill_status = 'billed'").all()
    ];
    pending.sort((a, b) => (a.d || "").localeCompare(b.d || "") || a.id.localeCompare(b.id));

    const updOrder = db.prepare("UPDATE product_orders SET bill_number = ? WHERE id = ?");
    const updService = db.prepare("UPDATE service_requests SET bill_number = ? WHERE id = ?");

    const tx = db.transaction(() => {
      for (const row of pending) {
        const fy = getFy(row.d);
        if (!fy) continue;
        takeMax(fy);
        const key = `bill_seq_${fy}`;
        const seq = (counter[key] || 0) + 1;
        counter[key] = seq;
        upsert.run(key, String(seq));
        const number = `INV-${fy}-${String(seq).padStart(4, "0")}`;
        if (row.kind === "order") updOrder.run(number, row.id);
        else updService.run(number, row.id);
      }
    });
    tx();
  } catch (e) {
    console.error("Bill number backfill failed:", e.message);
  }
}
backfillBillNumbers();

// Challan migrations
try {
  const challanColumns = db.prepare("PRAGMA table_info(delivery_challans)").all().map(c => c.name);
  if (!challanColumns.includes("billing_status")) {
    db.exec("ALTER TABLE delivery_challans ADD COLUMN billing_status TEXT DEFAULT 'pending'");
  }
  if (!challanColumns.includes("linked_order_id")) {
    db.exec("ALTER TABLE delivery_challans ADD COLUMN linked_order_id TEXT");
  }
  if (!challanColumns.includes("total_value")) {
    db.exec("ALTER TABLE delivery_challans ADD COLUMN total_value INTEGER DEFAULT 0");
  }
  if (!challanColumns.includes("stock_deducted")) {
    db.exec("ALTER TABLE delivery_challans ADD COLUMN stock_deducted INTEGER DEFAULT 0");
  }
  if (!challanColumns.includes("delivered_at")) {
    db.exec("ALTER TABLE delivery_challans ADD COLUMN delivered_at TEXT");
  }
  if (!challanColumns.includes("received_by")) {
    db.exec("ALTER TABLE delivery_challans ADD COLUMN received_by TEXT");
  }
  if (!challanColumns.includes("void_reason")) {
    db.exec("ALTER TABLE delivery_challans ADD COLUMN void_reason TEXT");
  }
  if (!challanColumns.includes("voided_by")) {
    db.exec("ALTER TABLE delivery_challans ADD COLUMN voided_by TEXT");
  }
  if (!challanColumns.includes("voided_at")) {
    db.exec("ALTER TABLE delivery_challans ADD COLUMN voided_at TEXT");
  }

  const challanItemColumns = db.prepare("PRAGMA table_info(delivery_challan_items)").all().map(c => c.name);
  if (!challanItemColumns.includes("unit_price")) {
    db.exec("ALTER TABLE delivery_challan_items ADD COLUMN unit_price INTEGER DEFAULT 0");
  }
  if (!challanItemColumns.includes("total_price")) {
    db.exec("ALTER TABLE delivery_challan_items ADD COLUMN total_price INTEGER DEFAULT 0");
  }
} catch (e) {
  console.error("Challan migration failed:", e.message);
}

// Allow multiple delivery challans per source (e.g. several dispatch DCs per service request).
// Drop the in-table UNIQUE(source_type, source_id) autoindex by rebuilding the table without it.
try {
  const uniqRow = db.prepare(`
    SELECT COUNT(*) AS c
    FROM sqlite_master m
    JOIN pragma_index_list('delivery_challans') il ON il.name = m.name
    JOIN pragma_index_info(il.name) ii
    WHERE m.type = 'index' AND m.tbl_name = 'delivery_challans'
      AND il.[unique] = 1
    GROUP BY il.name
    HAVING SUM(ii.[name] IN ('source_type','source_id')) = 2 AND COUNT(*) = 2
  `).get();
  const hasSourceUnique = !!uniqRow && Number(uniqRow.c) > 0;

  if (hasSourceUnique) {
    db.pragma("foreign_keys = OFF");
    try {
      db.exec("DROP TABLE IF EXISTS delivery_challans_old");
      db.exec(`
        CREATE TABLE delivery_challans_new (
          id TEXT PRIMARY KEY,
          challan_number TEXT NOT NULL,
          source_type TEXT NOT NULL,
          source_id TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          customer_mobile TEXT,
          customer_address TEXT,
          dispatch_date TEXT NOT NULL,
          receiver_name TEXT,
          transport TEXT,
          vehicle_no TEXT,
          notes TEXT,
          created_by TEXT,
          created_at TEXT NOT NULL,
          billing_status TEXT DEFAULT 'pending',
          linked_order_id TEXT,
          total_value INTEGER DEFAULT 0,
          stock_deducted INTEGER DEFAULT 0,
          delivered_at TEXT,
          received_by TEXT,
          void_reason TEXT,
          voided_by TEXT,
          voided_at TEXT
        )
      `);
      const dcCols = db.prepare("PRAGMA table_info(delivery_challans)").all().map(c => c.name);
      const colNames = dcCols.join(",");
      db.exec(`INSERT INTO delivery_challans_new (${colNames}) SELECT ${colNames} FROM delivery_challans`);
      db.exec("ALTER TABLE delivery_challans RENAME TO delivery_challans_old");
      db.exec("ALTER TABLE delivery_challans_new RENAME TO delivery_challans");
      db.exec("CREATE INDEX IF NOT EXISTS idx_challans_source ON delivery_challans(source_type, source_id)");
      db.exec("DROP TABLE IF EXISTS delivery_challans_old");
    } catch (e) {
      console.error("Challan rebuild migration failed:", e.message);
    }
    db.pragma("foreign_keys = ON");
  }
} catch (e) {
  console.error("Challan unique-index migration failed:", e.message);
}

// Repair: SQLite rewrites delivery_challan_items' FK to follow the renamed parent
// table during the rebuild above (delivery_challans -> delivery_challans_old -> dropped),
// leaving a dangling reference that breaks INSERTs. Re-point it when detected.
try {
  const fkRows = db.prepare("PRAGMA foreign_key_list(delivery_challan_items)").all();
  const fkBroken = fkRows.some((r) => r.table !== "delivery_challans");
  if (fkBroken) {
    db.pragma("foreign_keys = OFF");
    try {
      db.exec("DROP TABLE IF EXISTS delivery_challan_items_new");
      db.exec("DROP TABLE IF EXISTS delivery_challan_items_old");
      db.exec(
        "CREATE TABLE delivery_challan_items_new (" +
        "id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "challan_id TEXT NOT NULL," +
        "item_name TEXT NOT NULL," +
        "qty INTEGER NOT NULL DEFAULT 1," +
        "unit_price INTEGER DEFAULT 0," +
        "total_price INTEGER DEFAULT 0," +
        "FOREIGN KEY(challan_id) REFERENCES delivery_challans(id)" +
        ")"
      );
      const itemCols = db.prepare("PRAGMA table_info(delivery_challan_items)").all().map((c) => c.name).join(",");
      db.exec(`INSERT INTO delivery_challan_items_new (${itemCols}) SELECT ${itemCols} FROM delivery_challan_items`);
      db.exec("ALTER TABLE delivery_challan_items RENAME TO delivery_challan_items_old");
      db.exec("ALTER TABLE delivery_challan_items_new RENAME TO delivery_challan_items");
      db.exec("DROP TABLE IF EXISTS delivery_challan_items_old");
      db.exec("CREATE INDEX IF NOT EXISTS idx_challan_items_challan ON delivery_challan_items(challan_id)");
    } catch (e) {
      console.error("Challan items FK repair failed:", e.message);
    }
    db.pragma("foreign_keys = ON");
  }
} catch (e) {
  console.error("Challan items FK check failed:", e.message);
}

// Link sales quotations to their originating service request (e.g. survey/start-survey flow)
try {
  const sqCols = db.prepare("PRAGMA table_info(sales_quotations)").all().map(c => c.name);
  if (!sqCols.includes("service_request_id")) {
    db.exec("ALTER TABLE sales_quotations ADD COLUMN service_request_id TEXT");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_sales_quotes_sr ON sales_quotations(service_request_id)");
} catch (e) {
  console.error("sales_quotations service_request_id migration failed:", e.message);
}

// Link sales quotations to the originating lead (enquiry) when a quote is prepared in the Leads module
try {
  const sqCols = db.prepare("PRAGMA table_info(sales_quotations)").all().map(c => c.name);
  if (!sqCols.includes("enquiry_id")) {
    db.exec("ALTER TABLE sales_quotations ADD COLUMN enquiry_id TEXT");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_sales_quotes_enquiry ON sales_quotations(enquiry_id)");
} catch (e) {
  console.error("sales_quotations enquiry_id migration failed:", e.message);
}

// Service-request supplier RFQ flow:
// - supplier_quotes: link a RFQ/quote to a service request (parts needed for a job)
// - supplier_quote_items: capture brand/model from device intake for supplier quotation
// - service_requests: JSON requisition state (quote_requested -> uploaded -> po_placed -> received)
// - purchase_orders: remember backing service request so receiving stock updates the ticket
// - supplier_quotes.po_id: PO generated on approval of the quote
try {
  const sqColsRfq = db.prepare("PRAGMA table_info(supplier_quotes)").all().map(c => c.name);
  if (!sqColsRfq.includes("service_request_id")) {
    db.exec("ALTER TABLE supplier_quotes ADD COLUMN service_request_id TEXT");
  }
  if (!sqColsRfq.includes("po_id")) {
    db.exec("ALTER TABLE supplier_quotes ADD COLUMN po_id TEXT");
  }
  const sqiColsRfq = db.prepare("PRAGMA table_info(supplier_quote_items)").all().map(c => c.name);
  if (!sqiColsRfq.includes("brand")) {
    db.exec("ALTER TABLE supplier_quote_items ADD COLUMN brand TEXT");
    db.exec("ALTER TABLE supplier_quote_items ADD COLUMN model TEXT");
  }
  const srRfqCols = db.prepare("PRAGMA table_info(service_requests)").all().map(c => c.name);
  if (!srRfqCols.includes("buyout_requisition")) {
    db.exec("ALTER TABLE service_requests ADD COLUMN buyout_requisition TEXT");
  }
  const poRfqCols = db.prepare("PRAGMA table_info(purchase_orders)").all().map(c => c.name);
  if (!poRfqCols.includes("service_request_id")) {
    db.exec("ALTER TABLE purchase_orders ADD COLUMN service_request_id TEXT");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_supplier_quotes_service ON supplier_quotes(service_request_id)");
} catch (e) {
  console.error("Service RFQ migration failed:", e.message);
}

seedDatabase();
seedProducts();
migrateParties();

// Seed default SLA definitions (idempotent)
const slaCount = db.prepare("SELECT COUNT(*) as count FROM sla_definitions").get().count;
if (slaCount === 0) {
  const insertSla = db.prepare(
    "INSERT INTO sla_definitions (id, device_type, response_hours, resolution_hours, active, created_at) VALUES (?, ?, ?, ?, 1, ?)"
  );
  const defaults = [
    ["sla-device", "Device Service", 24, 72],
    ["sla-install", "Installation Service", 24, 120],
    ["sla-cctv", "CCTV", 24, 96],
    ["sla-emergency", "Emergency", 4, 24],
    ["sla-default", "General Support", 48, 120],
  ];
  for (const d of defaults) insertSla.run(...d, nowIso());
}

module.exports = {
  db,
  makeId,
  nowIso,
  getCustomerByMobile,
  getQuoteSeq,
  getFy,
  nextBillNumber,
};
