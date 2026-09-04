const productService = require("../services/productService");
const { parseProductPayload } = require("../utils/productHelpers");
const { parsePagination } = require("../utils/helpers");

const getPublicProducts = async (req, res) => {
  const { limit, offset, page } = parsePagination(req.query, 1000);
  const products = productService.getAllActiveProducts(limit, offset);
  res.json({ products, page, limit });
};

const staffCreateOrUpdateProduct = async (req, res) => {
  const parsed = parseProductPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  if (parsed.value.supplierId) {
    const supplier = productService.validateSupplier(parsed.value.supplierId);
    if (!supplier) {
      return res.status(404).json({ error: "Supplier not found" });
    }
  }

  const { db } = require("../../db");
  const actor = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);

  const result = productService.createOrUpdateProduct(parsed.value, actor.name);
  return res.status(result.isUpdate ? 200 : 201).json({ message: result.message });
};

const staffUpdateProduct = async (req, res) => {
  const parsed = parseProductPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const product = productService.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const duplicate = productService.getProductByName(parsed.value.name);
  if (duplicate && duplicate.id !== product.id) {
    return res.status(400).json({ error: "Another active product already uses that name" });
  }

  const { db } = require("../../db");
  const actor = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);

  productService.patchProduct(req.params.id, parsed.value, actor.name);
  res.json({ message: "Product updated successfully" });
};

const staffDeleteProduct = async (req, res) => {
  const product = productService.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  const { db } = require("../../db");
  const actor = db.prepare("SELECT name FROM users WHERE id = ?").get(req.user.id);

  productService.deleteProduct(req.params.id, actor.name);
  return res.json({ message: "Product removed successfully" });
};

const uploadProductImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
};

module.exports = {
  getPublicProducts,
  staffCreateOrUpdateProduct,
  staffUpdateProduct,
  staffDeleteProduct,
  uploadProductImage
};
