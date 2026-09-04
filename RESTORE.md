# TECHLAB v2 — Disaster Recovery (RESTORE)

Recovery guide for total hardware failure of the production server (ULTRA9 =
192.168.1.15). Run on a **new machine** to bring TECHLAB v2 fully back online.

## What is backed up and where

Backups are written by `node backup.js` (scheduled daily at 23:00 as
`TechlabDailyBackup`) to two destinations:

- **Google Drive (true off-machine safety net):** `H:\My Drive\TECHLAB`
  (office account `techlabkarur@gmail.com`)
- **On-prem share (same PC's own F: drive):** `\\192.168.1.15\F\OFC FILES\TECHLAB`

Each snapshot is a timestamped folder `YYYY-MM-DD_HHMM` containing:

- `techlab_v2.sqlite` — the live database (WAL-safe snapshot)
- `.env` — real secrets (NOT in Git)
- `uploads/` — user uploads (NOT in Git)
- `reports/` — generated reports (NOT in Git)
- `manifest.txt` — sha256 checksums for verification

Only **code** is on GitHub (`https://github.com/Slayer1502/techlabwebpagev2`,
branch `main`). DB, `.env`, `uploads/`, and `reports/` exist **only** in backups
and must be restored from a snapshot.

## Prerequisites on the new machine

- Node.js (matches runtime; project ran on `C:\Program Files\nodejs\node.exe`)
- Google Drive for Desktop installed, signed in as `techlabkarur@gmail.com`,
  with `H:\My Drive` mounted (backups live in `H:\My Drive\TECHLAB`)
- Write access to the target server directory

## Steps

### 1. Get the code

```powershell
git clone https://github.com/Slayer1502/techlabwebpagev2.git
cd techlabwebpagev2
git checkout main
npm install
```

### 2. Locate the newest snapshot

Backups are in `H:\My Drive\TECHLAB\` (or the on-prem share). Use the restore
helper to list them:

```powershell
node restore.js --list
```

Pick the newest folder (e.g. `2026-09-04_1034`).

> Mount Google Drive first and let it sync so the newest snapshot is present
> locally before restoring.

### 3. Stop the server

The server holds the DB open; never restore over a live database.

- Close/stop any running `node server.js`
- If it runs as a service or scheduled task, stop that first

### 4. Restore the snapshot

```powershell
# From the repo root, targeting the GDrive copy:
node restore.js H:\My Drive\TECHLAB\2026-09-04_1034 --force
```

`restore.js` makes a safety copy of the current DB before overwriting and
validates the backup checksum from `manifest.txt` first.

If `node restore.js` reads `backup_config.json` (which points at the local
destinations), you can also copy the snapshot manually:

```powershell
Copy-Item "H:\My Drive\TECHLAB\2026-09-04_1034\*" -Recurse -Force
```

and place `techlab_v2.sqlite`, `.env`, `uploads/`, `reports/` into the project
root.

### 5. Verify and start

```powershell
node --check server.js        # sanity check
node server.js                # or npm start  (port 3000)
```

Open `http://localhost:3000` (or the server's LAN IP) and confirm the app and
data are intact.

### 6. Re-establish the automated backup

1. Sign into Google Drive for Desktop (`techlabkarur@gmail.com`) and confirm
   `H:\My Drive` is mounted.
2. Confirm `backup_config.json` still lists both `destinations`
   (`onprem-share` and `google-drive`).
3. Register the daily task (run in the project folder):

```powershell
schtasks /Create /TN "TechlabDailyBackup" /SC DAILY /ST 23:00 /
  TR "\"C:\Program Files\nodejs\node.exe\" \"G:\Techlab_webpage\backup.js\"" /
  /RU "ULTRA9\ULTRA9" /RL LIMITED /F
```

4. Run one manual backup to confirm both destinations succeed:

```powershell
node backup.js
```

## Notes

- On-prem backups land on the same PC's F: drive, so they do **not** survive a
  total machine failure. The Google Drive copy is the real off-machine safety
  net — verify it shows up at drive.google.com (techlabkarur@gmail.com →
  `TECHLAB`) regularly.
- The scheduled task runs only while the user is logged on; if it does not run,
  the GDrive app skips the `H:\` destination. Keep Drive for Desktop running.
- Retention: 7 daily + 4 weekly snapshots (Sundays = weekly), enforced by
  `backup.js`.
- v1 code (untouched) lives at `F:\github\techlab\v1\Techlab_webpage` on the
  old machine and is not needed for v2 recovery.
