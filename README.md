# TECHLAB Shop & Service Management

A comprehensive platform for modern retail and service businesses (CCTV, Computers, IT). Handles inventory, POS sales, field technician dispatch, technical site surveys, professional billing, and financial reconciliation.

## Tech Stack

- **Backend:** Node.js, Express, better-sqlite3 (SQLite)
- **Frontend:** Vanilla JavaScript (SPA), Role-based rendering, PDFKit
- **Mobile:** Capacitor-based Android app (see `android-app/`)

## Setup

```bash
npm install
npm start
```
Server runs on `http://localhost:3000`.

## User Roles

| Role | Access Level | Purpose |
|------|-------|----------|
| **Admin** | Full | Business Intelligence, Staff Management, P&L Reports |
| **Sales** | Commercial | POS, Inventory, Customer Relationship, Payment Collection |
| **Employee** | Operational | Technician Scheduling, Dispatch, Completion Tracking |
| **Technician** | Field | Site Surveys, Job Execution, Parts Request |
| **Customer** | Self-Service | Order Tracking, Support Requests (OTP Login) |

---

## 🚀 Key Business Features

### 💵 Financial Control & Reconciliation
- **Today's Take**: Real-time summary bar showing daily **Cash** and **UPI** collections.
- **Payment Mode Tracking**: Every transaction (Sale or Service) records the specific payment method.
- **Accounts Payable**: Interactive **Supplier Dues** ledger. Click the dashboard card to see what you owe vendors and settle invoices.
- **Collection Needed**: Proactive tracking of all unpaid bills (both Product Orders and Services).

### 📦 Smart Inventory & Procurement
- **Smart Restocking**: The "+ Add" button automatically detects existing products, sums the stock, and records the supplier debt in one step.
- **Strict Stock Control**: Inventory levels are locked during simple edits to ensure every stock increase has a financial audit trail.
- **Low Stock Alerts**: Automatic dashboard warnings when products drop below 5 units.
- **Supplier Integration**: Products are linked to suppliers for accurate procurement history.

### 🔧 Professional Service Workflow
- **Automated Site Surveys**: 
    - Intelligent scaling: Junction boxes and NVR channels auto-calculate based on camera counts.
    - One-click camera entry (Dome/Bullet/PTZ).
- **Cable Costing**: Bill for the exact meters of cable utilized by technicians with custom per-meter rates.
- **Interactive Completion**: Technicians enter final field data on mobile to trigger the billing process.

### 📊 Professional Branded Reporting
- **PDF Overhaul**: High-quality, branded headers with shop details on all documents.
- **Dashboard Layouts**: Reports feature clean "Summary Boxes" and zebra-striped tables for readability.
- **Role-Based Reporting**: Admin sees sensitive financial data; staff see operational/dispatch reports.
- **Official Invoices**: Service bills are formatted as professional **Tax Invoices** with T&C and Signature areas.

---

## Site Visit Lifecycle

1. **Request**: Customer creates request → Admin/Sales assigns Technician.
2. **Survey**: Technician fills site survey (Auto-calculates boxes/channels) → Sales reviews.
3. **Execution**: Sales marks parts ready → Technician collects and performs work.
4. **Completion**: Technician enters **Actual Meters** utilized → Marks Job Complete.
5. **Billing**: Sales enters **Cable Rates** → Generates Professional Invoice.
6. **Collection**: Sales records payment mode (**Cash/UPI**) → Dashboard "Take" updates.

---

## Database Structure

- `users`: Staff and customer accounts with role-based permissions.
- `products`: Sales catalog with stock, supplier links, and cost history.
- `product_orders`: Retail sales history with payment status.
- `service_requests`: Repair and installation tickets.
- `site_visit_surveys`: Technical data and site photos.
- `suppliers` & `purchases`: Vendor management and Accounts Payable ledger.

---

## 🔐 Local Backup & Restore (Privacy-First)

The live database is in **WAL mode** (recent writes live in `techlab_v2.sqlite-wal`), so a raw file-copy can be torn/stale. Backups instead use **SQLite online backup** (`better-sqlite3`'s `db.backup()`) to produce a **consistent, WAL-safe snapshot**.

- **What is backed up:** `techlab_v2.sqlite` (consistent snapshot), `uploads/`, `reports/`, and `.env`.
- **Where:** off-box local drive `\\192.168.1.15\F\OFC FILES\TECHLAB\<timestamp>\` (on ULTRA9 — a different physical box than the server, so it survives the server's disk failing). **No data leaves the LAN.**
- **Retention:** keeps the last 7 weekday daily backups + 4 weekly (older auto-pruned by `backup.js`).

### Commands (run from the project directory)

```bash
node backup.js            # create a backup snapshot now (WAL-safe + verify + prune)
node verify.js            # verify the most recent backup's DB checksum
node verify.js <folder>   # verify a specific backup folder
node verify.js --all      # verify every backup
node restore.js --list    # list available backups
node restore.js <folder>  # restore a backup (prompts; use --force to skip prompt)
```

### Scheduled job

A Windows Task Scheduler task runs `backup.js` **daily at 23:00** on the server (Task name: `TechlabDailyBackup`). To re-create it manually:

```powershell
schtasks /Create /TN "TechlabDailyBackup" /TR "node \"<path>\backup.js\"" /SC DAILY /ST 23:00 /F
```

### Restore procedure

1. **Stop the server** (it holds the DB open; restoring over a live DB corrupts it).
2. `node restore.js <folder>` — it validates the backup checksum first and makes a **safety copy** of the current data into `.pre_restore_<name>_<ts>`.
3. Start the server.
4. Optionally confirm integrity afterward with `node verify.js <folder>`.

> ⚠️ `backup.js`, `verify.js`, `restore.js`, `.env`, and the database files must **not** be committed to git — `.env` and `*.sqlite` are already gitignored.
