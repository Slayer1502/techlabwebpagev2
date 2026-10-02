export const formatCurrencyValue = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatDateValue = (value: string) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "-";
  const datePart = normalized.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [year, month, day] = datePart.split("-");
    return `${day}-${month}-${year}`;
  }
  return datePart;
};

export const getEnquiryQuoteTotal = (quoteOptionsRaw: string | undefined | null) => {
  try {
    const parsed = quoteOptionsRaw ? JSON.parse(quoteOptionsRaw) : [];
    if (!Array.isArray(parsed)) return 0;
    return parsed.reduce((s, l) => s + ((Number(l?.quotedPrice) || 0) * (Number(l?.quantity) || 1)), 0);
  } catch {
    return 0;
  }
};

export const getEnquiryMargin = (quoteOptionsRaw: string | undefined | null) => {
  try {
    const parsed = quoteOptionsRaw ? JSON.parse(quoteOptionsRaw) : [];
    if (!Array.isArray(parsed)) return { totalCost: 0, totalQuoted: 0, margin: 0, marginPercent: 0 };
    const totalCost = parsed.reduce((s, l) => s + (Number(l?.costPrice) || 0), 0);
    const totalQuoted = parsed.reduce((s, l) => s + ((Number(l?.quotedPrice) || 0) * (Number(l?.quantity) || 1)), 0);
    const margin = totalQuoted - totalCost;
    const marginPercent = totalCost > 0 ? Math.round((margin / totalCost) * 100) : 0;
    return { totalCost, totalQuoted, margin, marginPercent };
  } catch {
    return { totalCost: 0, totalQuoted: 0, margin: 0, marginPercent: 0 };
  }
};

export const isSiteVisitType = (deviceType: string) => {
  return deviceType === "New Installation (Site Visit)" ||
         deviceType === "Old Installation Service" ||
         deviceType === "Installation Service";
};
