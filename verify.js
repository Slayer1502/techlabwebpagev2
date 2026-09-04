#!/usr/bin/env node
/* TECHLAB — Backup integrity verifier
 * Re-checks a backup folder: recomputes the SHA-256 of the stored DB and
 * compares it against manifest.txt, and sanity-checks the expected files exist.
 *
 * Usage:
 *   node verify.js                 -> verify the most recent backup
 *   node verify.js <folder>        -> verify a specific backup folder/name
 *   node verify.js --all           -> verify every backup folder
 */
"use strict";
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, "backup_config.json"), "utf8"));
const destRoot = CONFIG.destination.root;

function sha256(file) { return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"); }

function verifyFolder(folder) {
  const dbFile = path.join(folder, "techlab_v2.sqlite");
  const manifestFile = path.join(folder, "manifest.txt");
  let ok = true;

  const name = path.basename(folder);
  if (!fs.existsSync(dbFile)) { console.log(`[${name}] MISSING DB`); return false; }
  if (!fs.existsSync(manifestFile)) { console.log(`[${name}] MISSING manifest (cannot checksum-verify)`); return false; }

  const stored = (fs.readFileSync(manifestFile, "utf8").match(/sha256 techlab_v2\.sqlite = ([0-9a-f]+)/i) || [])[1];
  const actual = sha256(dbFile);

  const dbMatch = stored ? (stored.toLowerCase() === actual.toLowerCase()) : false;
  if (!stored) console.log(`[${name}] no stored hash in manifest`);
  else if (dbMatch) console.log(`[${name}] DB checksum OK (${actual.slice(0, 16)}...)`);
  else { console.log(`[${name}] DB CHECKSUM MISMATCH!\n  stored: ${stored}\n  actual: ${actual}`); ok = false; }

  // verify .env and uploads presence
  if (!fs.existsSync(path.join(folder, ".env"))) console.log(`[${name}] WARN: .env missing`);
  if (!fs.existsSync(path.join(folder, "uploads"))) console.log(`[${name}] WARN: uploads dir missing`);

  return ok;
}

const args = process.argv.slice(2);
if (args[0] === "--all") {
  const folders = fs.readdirSync(destRoot).filter(f => /^\d{4}-\d{2}-\d{2}_/.test(f));
  let allOk = true;
  for (const f of folders.sort()) allOk = verifyFolder(path.join(destRoot, f)) && allOk;
  console.log(allOk ? "\nALL BACKUPS VERIFIED OK" : "\nSOME BACKUPS FAILED");
  process.exit(allOk ? 0 : 1);
} else if (args[0]) {
  const p = path.resolve(args[0]);
  const target = fs.existsSync(p) ? p : path.join(destRoot, args[0]);
  if (!fs.existsSync(target)) { console.error("Folder not found: " + args[0]); process.exit(1); }
  process.exit(verifyFolder(target) ? 0 : 1);
} else {
  const folders = fs.readdirSync(destRoot).filter(f => /^\d{4}-\d{2}-\d{2}_/.test(f)).sort();
  if (!folders.length) { console.error("No backups found under " + destRoot); process.exit(1); }
  const latest = path.join(destRoot, folders[folders.length - 1]);
  console.log("Verifying latest backup: " + latest);
  process.exit(verifyFolder(latest) ? 0 : 1);
}
