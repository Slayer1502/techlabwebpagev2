#!/usr/bin/env node
/* TECHLAB — Local Off-Box Backup
 * Produces a WAL-safe, consistent snapshot of the live SQLite database using
 * better-sqlite3's online backup API, then ships it to an off-box local drive
 * (ULTRA9 F:\OFC FILES\TECHLAB) and prunes old backups per retention policy.
 *
 * Designed to run ON THE SERVER (192.168.1.10) via Windows Task Scheduler.
 * All source paths are resolved relative to this file's location, so it works
 * regardless of the current working directory.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Database = require("better-sqlite3");

const ROOT = __dirname;
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "backup_config.json"), "utf8"));
const LOCK = path.join(ROOT, ".backup_locked");
const STAGING = path.join(ROOT, ".backup_staging");

function pad(n) { return String(n).padStart(2, "0"); }
function stamp() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}_${pad(n.getHours())}${pad(n.getMinutes())}`;
}

const manifest = [];
function log(msg) { const line = `[${new Date().toISOString()}] ${msg}`; console.log(line); manifest.push(line); }
function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

function copyTree(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) { log("WARN: source dir missing, skipped: " + srcDir); return 0; }
  fs.mkdirSync(destDir, { recursive: true });
  let count = 0;
  for (const it of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, it.name), d = path.join(destDir, it.name);
    if (it.isDirectory()) count += copyTree(s, d);
    else if (it.isFile()) { fs.copyFileSync(s, d); count++; }
  }
  return count;
}

function finalize(dbSrc, snapPath) {
  try {
    const srcCfg = CONFIG.source;

    for (const d of (srcCfg.extraDirs || [])) {
      const n = path.basename(d);
      const c = copyTree(path.join(ROOT, d), path.join(STAGING, n));
      log(`copied ${n}: ${c} files`);
    }
    if (srcCfg.envFile && fs.existsSync(path.join(ROOT, srcCfg.envFile))) {
      fs.copyFileSync(path.join(ROOT, srcCfg.envFile), path.join(STAGING, ".env"));
      log("copied .env");
    }

    const dbHash = sha256(snapPath);
    manifest.push("sha256 techlab_v2.sqlite = " + dbHash);
    fs.writeFileSync(path.join(STAGING, "manifest.txt"), manifest.join("\n") + "\n", "utf8");

    const destList = CONFIG.destinations || [{ root: CONFIG.destination && CONFIG.destination.root, label: "default" }];
    for (const dest of destList) {
      const destRoot = dest.root;
      if (!destRoot) { log(`SKIP ${dest.label || "dest"}: no root defined`); continue; }
      if (!fs.existsSync(destRoot)) {
        try {
          fs.mkdirSync(destRoot, { recursive: true });
        } catch (e) {
          log(`SKIP ${dest.label || "dest"}: not reachable -> ${destRoot}`);
          continue;
        }
      }
      const destFolder = path.join(destRoot, stamp());
      fs.mkdirSync(destFolder, { recursive: true });
      copyTree(STAGING, destFolder);
      log(`shipped snapshot (${dest.label}) -> ${destFolder}`);

      const destDb = path.join(destFolder, "techlab_v2.sqlite");
      if (fs.existsSync(destDb)) {
        const destHash = sha256(destDb);
        const ok = destHash === dbHash;
        log(`${dest.label}: ${ok ? "VERIFY OK" : "VERIFY FAILED: hash mismatch!"}`);
        if (!ok) process.exitCode = 1;
      } else { log(`VERIFY WARN (${dest.label}): dest DB not found.`); }
    }

    fs.rmSync(STAGING, { recursive: true, force: true });
    pruneBackups();
    log("BACKUP DONE");
  } catch (e) { console.error("finalize error:", e); process.exitCode = 1; }
  finally { fs.rmSync(LOCK, { force: true }); }
}

function dateOf(name) { const m = /^(\d{4})-(\d{2})-(\d{2})_/.exec(name || ""); return m ? new Date(+m[1], +m[2]-1, +m[3]).getTime() : null; }
function pruneBackups() {
  const destList = CONFIG.destinations || [{ root: CONFIG.destination && CONFIG.destination.root, label: "default" }];
  for (const dest of destList) {
    const destRoot = dest.root;
    const tag = dest.label || "dest";
    if (!destRoot || !fs.existsSync(destRoot)) continue;
    const folders = fs.readdirSync(destRoot).map(f => ({ name: f, time: dateOf(f) })).filter(f => f.time != null).sort((a,b) => a.time-b.time);
    if (!folders.length) continue;
    const daily = folders.filter(f => new Date(f.time).getDay() !== 0);
    const weekly = folders.filter(f => new Date(f.time).getDay() === 0);
    const drop = (list, keep) => list.slice(0, Math.max(0, list.length - keep)).forEach(f => { try { fs.rmSync(path.join(destRoot, f.name), { recursive: true, force: true }); log(`pruned (${tag}): ` + f.name); } catch(e){ log(`prune err (${tag}) ` + f.name + ": " + e.message); } });
    drop(daily, CONFIG.retention.dailyToKeep);
    drop(weekly, CONFIG.retention.weeklyToKeep);
  }
}

try {
  const dbSrc = path.join(ROOT, CONFIG.source.dbFile);
  if (!fs.existsSync(dbSrc)) throw new Error("Source DB not found: " + dbSrc);

  if (fs.existsSync(LOCK) && (Date.now() - fs.statSync(LOCK).mtimeMs) < 30*60*1000) { log("ABORT: another backup running."); process.exit(1); }
  fs.writeFileSync(LOCK, String(process.pid));
  log("Source DB: " + dbSrc);
  const destList = CONFIG.destinations || [{ root: CONFIG.destination && CONFIG.destination.root, label: "default" }];
  destList.forEach(d => log("Destination (" + (d.label || "default") + "): " + d.root));

  const db = new Database(dbSrc, { readonly: true });
  fs.rmSync(STAGING, { recursive: true, force: true });
  fs.mkdirSync(STAGING, { recursive: true });
  const snapPath = path.join(STAGING, "techlab_v2.sqlite");
  db.backup(snapPath).then(() => { db.close(); log("SQLite online backup (WAL-safe) complete."); finalize(dbSrc, snapPath); })
    .catch(err => { db.close(); console.error("backup err:", err); process.exitCode = 1; });
} catch (e) { console.error(e); process.exitCode = 1; }
