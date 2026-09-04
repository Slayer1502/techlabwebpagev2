export const formatCurrencyValue = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatDateValue = (value: string) => {
  const normalized = String(value || "").trim();
  return normalized ? normalized.slice(0, 10) : "-";
};

export const isSiteVisitType = (deviceType: string) => {
  return deviceType === "New Installation (Site Visit)" ||
         deviceType === "Old Installation Service" ||
         deviceType === "Installation Service";
};
