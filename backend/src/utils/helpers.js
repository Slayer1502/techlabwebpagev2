const parsePagination = (query, defaultLimit = 50) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(2000, Math.max(1, parseInt(query.limit) || defaultLimit));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const isSiteVisitType = (deviceType) => {
  return deviceType === "New Installation (Site Visit)" || deviceType === "Old Installation Service" || deviceType === "Installation Service";
};

const normalizeUsedItems = (usedItems) => {
  if (!Array.isArray(usedItems)) return [];
  return usedItems
    .map((item) => ({
      type: item.type === "product" ? "product" : "service",
      name: String(item.name || "").trim(),
      qty: Math.max(1, Number(item.qty) || 1),
      price: Number(item.price) || 0,
      product_id: item.product_id || null,
    }))
    .filter((item) => item.name);
};

const formatDateValue = (value) => {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, 10) : "-";
};

const formatCurrencyValue = (amount) => `Rs. ${Number(amount || 0).toLocaleString("en-IN")}`;

const formatStaffRoleLabel = (role) => {
  if (role === "sales") return "Sales";
  if (role === "employee") return "Employee";
  if (role === "admin") return "Admin";
  if (role === "auditor") return "Auditor";
  return "Staff";
};

const formatRequestSubjectLabel = (requestSubjectType, requestSubjectName) => {
  const name = String(requestSubjectName || "").trim();
  let baseLabel = "General Support";

  if (requestSubjectType === "owned-product") baseLabel = "Owned Product";
  if (requestSubjectType === "wanted-product") baseLabel = "Wanted Product";
  if (requestSubjectType === "wanted-service") baseLabel = "Wanted Service";

  return name ? `${baseLabel}: ${name}` : baseLabel;
};

const serializeRowsToCsv = (rows, headers) => {
  const csvRows = [headers.join(",")];
  rows.forEach((row) => {
    csvRows.push(
      headers
        .map((header) => {
          const val = String(row[header] ?? "");
          const safeVal = val.replace(/^[=+\-@\t\r]/, "'$1");
          return `"${safeVal.replace(/"/g, '""')}"`;
        })
        .join(",")
    );
  });
  return csvRows.join("\n");
};

module.exports = {
  parsePagination,
  asyncHandler,
  isSiteVisitType,
  normalizeUsedItems,
  formatDateValue,
  formatCurrencyValue,
  formatStaffRoleLabel,
  formatRequestSubjectLabel,
  serializeRowsToCsv
};
