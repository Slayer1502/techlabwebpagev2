#!/usr/bin/env node
/* TECHLAB — Backup restore helper
 * Restores a backup folder back to the live project directory. It makes a
 * safety copy of the CURRENT databases before overwriting, and validates the
 * backup checksum first.
 *
 * Usage:
 *   node restore.js              -> list available backups (dry-run, no change)
 *   node restore.js --list       -> same as above
 *   node restore.js <folder>     -> restore the given backup folder (e.g. 2026-08-30_1739)
 *   node restore.js <folder> --force  -> skip the confirmation prompt
 *
 * WARNING: Stop the running server BEFORE restoring. The server holds the DB
 * open; restoring over a live DB will corrupt it.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "backup_config.json"), "utf8"));
const destRoot = (CONFIG.destination && CONFIG.destination.root) || (CONFIG.destinations && CONFIG.destinations[0] && CONFIG.destinations[0].root) || "";

const dbLive = path.join(ROOT, CONFIG.source.dbFile);
const envLive = CONFIG.source.envFile ? path.join(ROOT, CONFIG.source.envFile) : null;

function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }
function copyTree(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const it of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, it.name), d = path.join(destDir, it.name);
    if (it.isDirectory()) copyTree(s, d);
    else if (it.isFile()) fs.copyFileSync(s, d);
  }
}

function listBackups() {
  if (!fs.existsSync(destRoot)) return [];
  return fs.readdirSync(destRoot).filter(f => /^\d{4}-\d{2}-\d{2}_/.test(f)).sort();
}

function validateBackup(folder) {
  const dbFile = path.join(folder, "techlab_v2.sqlite");
  const manifestFile = path.join(folder, "manifest.txt");
  if (!fs.existsSync(dbFile)) throw new Error("Backup DB missing: " + dbFile);
  if (!fs.existsSync(manifestFile)) { console.log("WARN: no manifest, skipping checksum check."); return true; }
  const stored = (fs.readFileSync(manifestFile, "utf8").match(/sha256 techlab_v2\.sqlite = ([0-9a-f]+)/i) || [])[1];
  const actual = sha256(dbFile);
  if (stored && stored.toLowerCase() !== actual.toLowerCase()) throw new Error("Backup checksum mismatch — cannot restore this folder!");
  console.log("Backup checksum OK.");
  return true;
}

const args = process.argv.slice(2);
const folders = listBackups();

if (!args[0] || args[0] === "--list") {
  console.log("Available backups under " + destRoot + ":");
  if (!folders.length) console.log("  (none)");
  folders.forEach(f => console.log("  " + f));
  console.log("To restore:  node restore.js <folder>   e.g. node restore.js " + (folders[folders.length-1] || "2026-YY-MM_DDHH"));
  process.exit(0);
}

const target = args[0];
const srcFolder = path.join(destRoot, target);
if (!fs.existsSync(srcFolder)) { console.error("Backup folder not found: " + target); process.exit(1); }

validateBackup(srcFolder);

if (!args.includes("--force")) {
  const readline = require("readline").createInterface({ input: process.stdin, output: process.stdout });
  readline.question(`Restore ${target} over the live project? Type 'yes' to continue, 'no' to abort: `, ans => {
    readline.close();
    if (ans.trim().toLowerCase() !== "yes") { console.log("Aborted."); process.exit(0); }
    doRestore(srcFolder, target);
  });
} else {
  doRestore(srcFolder, target);
}

function doRestore(srcFolder, name) {
  try {
    const safety = path.join(ROOT, `.pre_restore_${name}_${Date.now()}`);
    fs.mkdirSync(safety, { recursive: true });
    fs.copyFileSync(dbLive, path.join(safety, "techlab_v2.sqlite"));
    if (envLive && fs.existsSync(envLive)) fs.copyFileSync(envLive, path.join(safety, ".env"));
    for (const d of (CONFIG.source.extraDirs || [])) copyTree(path.join(ROOT, d), path.join(safety, d));
    console.log("Safety copy of current data saved to: " + safety);

    // restore DB (with WAL cleanup)
    fs.copyFileSync(path.join(srcFolder, "techlab_v2.sqlite"), dbLive);
    try { fs.unlinkSync(dbLive + "-wal"); } catch {}
    try { fs.unlinkSync(dbLive + "-shm"); } catch {}
    console.log("Restored DB from backup.");

    // restore extras
    for (const d of (CONFIG.source.extraDirs || [])) {
      fs.rmSync(path.join(ROOT, d), { recursive: true, force: true });
      if (fs.existsSync(path.join(srcFolder, d))) copyTree(path.join(srcFolder, d), path.join(ROOT, d));
      console.log("Restored " + d);
    }
    if (fs.existsSync(path.join(srcFolder, ".env"))) {
      fs.copyFileSync(path.join(srcFolder, ".env"), envLive);
      console.log("Restored .env");
    }
    console.log("RESTORE DONE from " + name + ". Safety copy kept at " + safety);
  } catch (e) { console.error("Restore error:", e); process.exit(1); }
}
