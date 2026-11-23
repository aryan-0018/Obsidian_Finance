// Convert unit to paise when saving
export function convertToSmallestUnit(amount: number) {
  return Math.round(amount * 100);
}

// Convert paise to unit when retrieving
export function convertToUnit(amount: number) {
  return amount / 100;
}

export function formatCurrency(amount: number, currency: string = "INR") {
  const code = currency || "INR";
  const locale = code === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
  }).format(amount);
}
