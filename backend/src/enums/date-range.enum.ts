export enum DateRangeEnum {
  LAST_30_DAYS = "30days",
  LAST_MONTH = "lastMonth",
  THIS_MONTH = "thisMonth",
  THIS_QUARTER = "thisQuarter",
  LAST_QUARTER = "lastQuarter",
  LAST_3_MONTHS = "last3Months",
  LAST_YEAR = "lastYear",
  THIS_YEAR = "thisYear",
  ALL_TIME = "allTime",
  CUSTOM = "custom",
}

export type DateRangePreset = `${DateRangeEnum}`;
