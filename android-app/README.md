# TECHLAB Web App

Sales and service management platform for CCTV installation businesses — handles product sales, service requests, site visit surveys, technician dispatch, billing, and service request cancellation.

## Tech Stack

- **Backend:** Node.js, Express, better-sqlite3
- **Frontend:** Vanilla JavaScript, single-page app with role-based rendering
- **Mobile:** Capacitor-based Android app (see `android-app/`)

## Setup

```bash
npm install
npm start
```

Server runs on `http://localhost:3000`.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@techlab.in | admin123 |
| Sales | sales@techlab.in | sales123 |
| Technician | tech@techlab.in | tech123 |
| Employee | service@techlab.in | service123 |
| Customer | Any 10-digit mobile | OTP: `123456` |

## Project Structure

```
Techlab_webpage/
├── server.js              # Express API server (all routes)
├── script.js              # Frontend JS (role-based SPA rendering)
├── styles.css             # Global styles
├── xlsx.full.min.js       # SheetJS library for Excel export
├── backend/
│   └── db.js              # SQLite schema, migrations, helpers
├── admin.html             # Admin dashboard
├── sales.html             # Sales POS + service management
├── technician.html        # Technician task management
├── employee.html          # Employee dashboard
├── customer.html          # Customer portal
├── services.html          # Service request list
├── service_dashboard.html # Service overview
├── login.html             # Login page
├── products.html          # Product catalog
├── uploads/               # Uploaded photos
├── android-app/           # Capacitor Android app (see android-app/README.md)
└── techlab.sqlite         # SQLite database
```

## Site Visit Workflow

The full lifecycle for site visit service requests (New Installation / Old Installation Service):

1. **Customer** creates a service request with preferred date
2. **Admin/Sales** schedules and assigns a technician
3. **Technician** fills the site visit survey:
   - Cameras — click Dome/Bullet/PTZ buttons to add/increment rows (form factor), with fallback IP/Analog/Wireless dropdown when no NVR/DVR selected
   - NVR/DVR — selecting NVR auto-sets cameras to IP and shows PoE section; selecting DVR auto-sets cameras to Analog and shows SMPS section; channels auto-fill to next power-of-2 based on camera count (4, 8, 16, 32, 64)
   - Cables — Cat6/Cat6a include a boxes/coils quantity (min 1)
   - Mounting hardware, additional parts, site photos
4. **Sales** reviews the survey → can download as Excel, then sets `survey_status = 'reviewed'` (status stays Scheduled)
5. **Sales** orders parts and marks them ready for collection
6. **Technician** collects parts from sales office
7. **Technician** goes on-site, completes the physical work
8. **Technician** opens the survey (interactive mode), enters actual cable meters used, clicks **Job Complete**
   - Actual meter usage is saved to the survey
   - Service status set to Completed
9. **Sales** generates the bill for the customer

> **Note:** Sales/Admin can cancel any non-completed request via the Cancel button, storing a reason and unassigning the technician.

## Recent Changes

### Survey Review Bug Fix
Sales "Approve Survey" no longer prematurely marks the service as Completed. It only sets `survey_status = 'reviewed'`, allowing the technician to complete work and mark the job done afterward.

**Affected files:** `server.js:1814`, `script.js` (modal button text + success message)

### NVR/DVR Auto-Fill (Power-of-2)
NVR channels field auto-calculates based on total cameras selected, rounded up to the nearest valid channel count (4, 8, 16, 32, 64). The input remains editable for manual override.

**How it works:**
- `nextPowerOf2(n)` returns the next valid NVR/DVR channel count
- Recalculates on camera qty change, row add/remove, and NVR toggle to "Yes"
- Uses `MutationObserver` on camera rows for add/remove detection

**Affected files:** `script.js` (helper functions + event listeners), `android-app/www/script.js`

### Cat6 Cable Boxes
Cat6/Cat6a cable rows include an additional "Boxes" quantity field (min 1, default 1). Hidden for other cable types. Stored in the cables JSON array.

**Affected files:** `script.js` (`addCableRow`, survey submit, `renderSurveyView`), `android-app/www/script.js`

### Job Completion with Actual Meter Usage
Technician opens the survey in interactive mode after completing on-site work. Each cable row shows an "Actual used (m)" input. After entering actual meters, technician clicks "Job Complete".

**New endpoint:** `POST /api/technician/service-requests/:id/job-complete`
- Accepts `{ actual_meter_usage: { "0": 178, "1": 40 } }` (cable index → meters)
- Updates `site_visit_surveys.cables` JSON with `actual_meters` per cable
- Sets service request status to `Completed`

**Affected files:** `server.js:1842`, `script.js` (`renderSurveyView` interactive mode), `android-app/www/script.js`, `android-app/www/server.js`

### Tech Card Updates
Site visit tasks with `survey_status` of `submitted` or `reviewed` now show a single "Complete Job" button that opens the interactive survey view (replaces separate "Mark Complete" + "View Survey" buttons).

**Affected files:** `script.js` (`renderTechCard`), `android-app/www/script.js`

### Service Request Cancellation
Sales and Admin can cancel service requests that are Pending or Scheduled. Cancellation stores a reason and timestamp, unassigns the technician, and resets part request status.

**New endpoint:** `PATCH /api/sales/service-requests/:id/cancel`
- Accepts `{ reason: "string" }`
- Sets `status = 'Canceled'`, `cancel_reason`, `canceled_at`
- Clears technician assignment and part request status
- Cannot cancel Completed or already Canceled requests

**DB migration:** Adds `cancel_reason TEXT` and `canceled_at TEXT` columns to `service_requests`.

**Affected files:** `server.js:755`, `script.js` (cancel modal, button, history card), `backend/db.js`, `android-app/www/*`

### Camera Quick-Select Buttons
Site visit survey camera section replaced dropdown with Dome/Bullet/PTZ chip buttons for faster field entry.

**Behavior:**
- Default: one Dome row with count=0
- Click existing type button → increment count
- Click new type button → create row with count=1
- Each row has [−] decrement, [+] increment, [×] remove buttons
- Count cannot go below 0; count=0 rows excluded from submission
- Fallback dropdown (IP/Analog/Wireless) shown when no NVR/DVR selected

**Camera data structure changed:** `{ type: "Dome" }` → `{ formFactor: "Dome", technology: "IP" }`

**Affected files:** `script.js` (`addCameraRow`, button handlers, data submission, survey view, bill auto-details), `styles.css`, `android-app/www/*`

### NVR/DVR Auto-Selection with PoE/SMPS
Selecting NVR or DVR auto-sets camera technology and shows a power section.

**Behavior:**
- NVR selected → cameras auto-set to IP, "PoE Switch" section appears
- DVR selected → cameras auto-set to Analog, "SMPS Power Supply" section appears
- No NVR/DVR → fallback technology dropdown on each camera row
- Power channels sync with NVR/DVR channels
- Power section title updates dynamically ("PoE Switch" / "SMPS Power Supply")

**NVR/DVR data structure extended:** Added `power: { type, channels, brand }` field.

**Affected files:** `script.js` (`updateCameraTechnology`, `updatePowerType`, power section HTML, data submission, survey view), `android-app/www/*`

### Survey Excel Download
Sales can download site visit survey data as Excel for offline review and record-keeping.

**New function:** `generateSurveyExcel(survey, requestId)` — uses SheetJS (xlsx) library
- Generates single-sheet Excel with all survey sections: header, cameras, NVR/DVR, power, cables, mounting, parts
- Downloads as `{request-id}-survey.xlsx`
- Library loaded locally from `xlsx.full.min.js` (also dynamically loaded as fallback)

**New file:** `xlsx.full.min.js` (SheetJS library, ~944KB)

**Affected files:** `script.js` (function + sales survey modal button), `index.html` (script tag), `android-app/www/*`
