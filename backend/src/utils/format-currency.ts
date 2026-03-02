// Convert unit to paise when saving
export function convertToSmallestUnit(amount: number) {
  return Math.round(amount * 100);
}

// Convert paise to unit when retrieving
//convertFromSmallestUnit
export function convertToUnit(amount: number) {
  return amount / 100;
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}
