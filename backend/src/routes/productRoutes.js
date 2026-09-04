const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { authRequired } = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../../../uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `prod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});

// Public
router.get("/public/products", productController.getPublicProducts);

// Staff
router.post("/staff/products", authRequired(["admin", "sales"]), productController.staffCreateOrUpdateProduct);
router.patch("/staff/products/:id", authRequired(["admin", "sales"]), productController.staffUpdateProduct);
router.delete("/staff/products/:id", authRequired(["admin", "sales"]), productController.staffDeleteProduct);
router.post("/staff/products/upload", authRequired(["admin", "sales"]), upload.single("image"), productController.uploadProductImage);
router.post("/staff/products/generate-ai", authRequired(["admin", "sales"]), require("../controllers/aiController").generateImage);

module.exports = router;
