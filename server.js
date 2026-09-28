const path = require("path");
const http = require("http");
const express = require("express");
const fs = require("fs");
const helmet = require("helmet");
const config = require("./backend/config");
const modularApp = require("./backend/src/app");
const cookieParser = require("cookie-parser");
const { initWebSocket } = require("./backend/src/ws");
const { csrfValidate } = require("./backend/src/middleware/csrf");
const logger = require("./backend/src/utils/logger");

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const reportsDir = path.join(__dirname, "reports");
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

const srcDir = path.join(__dirname, "public");
const destDir = path.join(__dirname, "android-app", "www");

const syncFiles = () => {
  const filesToSync = [
    "script.js", "styles.css", "index.html", "login.html", "admin.html",
    "sales.html", "employee.html", "customer.html", "products.html",
    "services.html", "service_dashboard.html", "technician.html", "xlsx.full.min.js"
  ];
  logger.info("Syncing frontend files to Android app...");
  filesToSync.forEach(file => {
    const src = path.join(srcDir, file);
    const dest = path.join(destDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  });
  logger.info("Sync complete.");
};

syncFiles();

const { backfillPurchaseOrderPayments } = require("./backend/src/services/purchaseOrderService");
backfillPurchaseOrderPayments();

const app = express();
const PORT = config.PORT;
const isProduction = config.IS_PRODUCTION;

app.use(cookieParser());
app.use(express.json());

// Global Logger
app.use((req, res, next) => {
  logger.debug({ method: req.method, url: req.url }, "request");
  next();
});

// Helmet — security headers (CSP handled manually below)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS allowlist
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://192.168.1.15:3000",
  "http://103.210.204.164:3000",
];

// CORS & CSP Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  }

  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie, X-CSRF-Token");

  // Hardened Content-Security-Policy
  res.header("Content-Security-Policy",
    "default-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "script-src 'self'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// CSRF protection for state-changing API requests (skip auth endpoints that set the cookie)
app.use("/api", (req, res, next) => {
  if (req.path.startsWith("/auth/")) return next();
  return csrfValidate(req, res, next);
});

// Mount Modular Application
app.use(modularApp);

// Static Files (Modern UI)
const distPath = path.join(__dirname, "frontend", "dist");
const legacyPath = path.join(__dirname, "public");
if (fs.existsSync(distPath)) {
  logger.info("Serving modern UI from /frontend/dist");
  app.use(express.static(distPath));
} else {
  logger.info("Modern UI build not found, serving legacy files from /public");
  app.use(express.static(legacyPath));
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
    res.sendFile(path.join(legacyPath, "index.html"));
  }
});

const HOST = process.env.HOST || "0.0.0.0";

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, HOST, () => {
  const nets = require("os").networkInterfaces();
  const ip = Object.values(nets).flat().find(ip => ip.family === "IPv4" && !ip.internal)?.address || "localhost";
  logger.info(`TECHLAB server running on http://localhost:${PORT}`);
  logger.info(`Network access: http://${ip}:${PORT}`);
  logger.info("WebSocket server running");
});
