const currencyLocaleMap: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  CAD: "en-CA",
  AUD: "en-AU",
  JPY: "ja-JP",
};

export const formatCurrency = (
  value: number,
  options: {
    currency?: string;
    decimalPlaces?: number;
    compact?: boolean;
    showSign?: boolean;
    isExpense?: boolean;
  } = {}
): string => {
  const {
    currency = "INR",
    decimalPlaces = 2,
    compact = false,
    showSign = false,
    isExpense = false,
  } = options;

  const displayValue = isExpense ? -Math.abs(value) : value;
  const locale = currencyLocaleMap[currency.toUpperCase()] || "en-IN";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
    notation: compact ? "compact" : "standard",
    signDisplay: showSign ? "always" : "auto",
  }).format(displayValue);
};
