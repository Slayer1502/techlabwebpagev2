const mapProductPricing = (product) => {
  if (!product) return null;
  const discountPercent = Number(product.discount_percent || 0);
  const discountedPrice = Math.round(product.price * (1 - discountPercent / 100));
  const gstRate = Number(product.gst_rate || 0);

  return {
    ...product,
    discountPercent,
    originalPrice: product.price,
    finalPrice: discountedPrice,
    gstRate,
    gstAmount: gstRate ? Math.round(discountedPrice * gstRate / 100) : 0,
    taxableAmount: discountedPrice,
    totalPrice: gstRate ? discountedPrice + Math.round(discountedPrice * gstRate / 100) : discountedPrice,
    unit_type: product.unit_type || 'standard',
    base_unit: product.base_unit || null,
    sub_unit: product.sub_unit || null,
    conversion_factor: product.conversion_factor || 1,
    loose_stock: product.loose_stock || 0,
    imageUrl: product.image_url || null
  };
};

const parseProductPayload = (payload) => {
  const type = String(payload.type || "").trim();
  const name = String(payload.name || "").trim();
  const description = String(payload.description || "").trim();
  const price = Number(payload.price);
  const discountPercent = Number(payload.discountPercent ?? 0);
  const stock = Number(payload.stock ?? 10);
  const supplierId = payload.supplierId ? String(payload.supplierId).trim() : null;
  const costPrice = payload.costPrice != null ? Number(payload.costPrice) : null;
  const hsnCode = payload.hsnCode ? String(payload.hsnCode).trim() : null;
  const gstRate = Number(payload.gstRate ?? 0);
  const unitType = String(payload.unitType || "standard").trim();
  const baseUnit = payload.baseUnit ? String(payload.baseUnit).trim() : null;
  const subUnit = payload.subUnit ? String(payload.subUnit).trim() : null;
  const conversionFactor = Number(payload.conversionFactor ?? 1);
  const imageUrl = payload.imageUrl ? String(payload.imageUrl).trim() : null;

  if (supplierId && (costPrice == null || costPrice <= 0)) {
    return { error: "Cost price is required when a supplier is selected" };
  }

  if (!type || !name || !description) {
    return { error: "Type, name, and description are required" };
  }

  if (!Number.isInteger(price) || price <= 0) {
    return { error: "Price must be a whole number greater than 0" };
  }

  if (!Number.isInteger(discountPercent) || discountPercent < 0 || discountPercent > 80) {
    return { error: "Discount must be an integer between 0 and 80" };
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return { error: "Stock must be a non-negative integer" };
  }

  return {
    value: {
      type,
      name,
      description,
      price,
      discountPercent,
      stock,
      supplierId,
      costPrice,
      hsnCode,
      gstRate,
      unitType,
      baseUnit,
      subUnit,
      conversionFactor,
      imageUrl
    },
  };
};

module.exports = { mapProductPricing, parseProductPayload };
