export const DateRangeEnum = {
  LAST_30_DAYS: "30days",
  LAST_MONTH: "lastMonth",
  THIS_MONTH: "thisMonth",
  THIS_QUARTER: "thisQuarter",
  LAST_QUARTER: "lastQuarter",
  LAST_3_MONTHS: "last3Months",
  LAST_YEAR: "lastYear",
  THIS_YEAR: "thisYear",
  ALL_TIME: "allTime",
  CUSTOM: "custom",
} as const;

export type DateRangeEnumType =
  (typeof DateRangeEnum)[keyof typeof DateRangeEnum];

export type DateRangeType = {
  from: Date | null;
  to: Date | null;
  value?: string;
  label: string;
} | null;

