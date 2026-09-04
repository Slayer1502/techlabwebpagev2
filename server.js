const path = require("path");
const express = require("express");
const fs = require("fs");
const config = require("./backend/config");
const modularApp = require("./backend/src/app");
const cookieParser = require("cookie-parser");

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const reportsDir = path.join(__dirname, "reports");
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const srcDir = __dirname;
const destDir = path.join(__dirname, "android-app", "www");

const syncFiles = () => {
  const filesToSync = [
    "script.js", "styles.css", "index.html", "login.html", "admin.html",
    "sales.html", "employee.html", "customer.html", "products.html",
    "services.html", "service_dashboard.html", "technician.html", "xlsx.full.min.js"
  ];
  console.log("Syncing frontend files to Android app...");
  filesToSync.forEach(file => {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });
  console.log("Sync complete.");
};

syncFiles();

const app = express();
const PORT = config.PORT;
const isProduction = config.IS_PRODUCTION;

app.use(cookieParser());
app.use(express.json());

// Global Logger
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  next();
});

// CORS & CSP Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
  res.header("Access-Control-Allow-Credentials", "true");

  res.header("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' *;");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Mount Modular Application
app.use(modularApp);

// Static Files (Modern UI)
const distPath = path.join(__dirname, "frontend", "dist");
if (fs.existsSync(distPath)) {
  console.log("Serving modern UI from /frontend/dist");
  app.use(express.static(distPath));
} else {
  console.log("Modern UI build not found, serving legacy files");
  app.use(express.static(__dirname));
}

app.use("/uploads", express.static(uploadsDir));

// SPA Support: Route all non-API requests to index.html
app.get("*all", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
    return next();
  }
  const indexPath = path.join(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.sendFile(path.join(__dirname, "index.html"));
  }
});

const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  const nets = require("os").networkInterfaces();
  const ip = Object.values(nets).flat().find(ip => ip.family === "IPv4" && !ip.internal)?.address || "localhost";
  console.log(`TECHLAB server running on http://localhost:${PORT}`);
  console.log(`Network access: http://${ip}:${PORT}`);
});
