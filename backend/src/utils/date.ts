import {
  startOfDay,
  endOfDay,
  endOfMonth,
  endOfYear,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
} from "date-fns";
import { DateRangeEnum, DateRangePreset } from "../enums/date-range.enum";

export const getDateRange = (
  preset?: DateRangePreset | string,
  customFrom?: Date,
  customTo?: Date
) => {
  if (customFrom && customTo) {
    const fromD = startOfDay(new Date(customFrom));
    const toD = endOfDay(new Date(customTo));
    return {
      from: fromD,
      to: toD,
      value: DateRangeEnum.CUSTOM,
      label: "Custom Period",
    };
  }

  const now = new Date();
  const today = endOfDay(now);
  const last30Days = {
    from: subDays(today, 29),
    to: today,
    value: DateRangeEnum.LAST_30_DAYS,
    label: "Last 30 Days",
  };

  const normalized = (preset || "").toString().trim().toLowerCase();

  switch (normalized) {
    case "alltime":
    case "all_time":
      return {
        from: null,
        to: null,
        value: DateRangeEnum.ALL_TIME,
        label: "All Time",
      };

    case "30days":
    case "last_30_days":
    case "last30days":
      return last30Days;

    case "thismonth":
    case "this_month":
      return {
        from: startOfMonth(now),
        to: endOfDay(now),
        value: DateRangeEnum.THIS_MONTH,
        label: "This Month",
      };

    case "lastmonth":
    case "last_month": {
      const prevM = subMonths(now, 1);
      return {
        from: startOfMonth(prevM),
        to: endOfMonth(prevM),
        value: DateRangeEnum.LAST_MONTH,
        label: "Last Month",
      };
    }

    case "thisquarter":
    case "this_quarter":
      return {
        from: startOfQuarter(now),
        to: endOfDay(now),
        value: DateRangeEnum.THIS_QUARTER,
        label: "This Quarter",
      };

    case "lastquarter":
    case "last_quarter": {
      const prevQ = subQuarters(now, 1);
      return {
        from: startOfQuarter(prevQ),
        to: endOfQuarter(prevQ),
        value: DateRangeEnum.LAST_QUARTER,
        label: "Last Quarter",
      };
    }

    case "last3months":
    case "last_3_months":
      return {
        from: startOfMonth(subMonths(now, 3)),
        to: endOfMonth(subMonths(now, 1)),
        value: DateRangeEnum.LAST_3_MONTHS,
        label: "Last 3 Months",
      };

    case "thisyear":
    case "this_year":
      return {
        from: startOfYear(now),
        to: endOfDay(now),
        value: DateRangeEnum.THIS_YEAR,
        label: "This Year",
      };

    case "lastyear":
    case "last_year": {
      const prevY = subYears(now, 1);
      return {
        from: startOfYear(prevY),
        to: endOfYear(prevY),
        value: DateRangeEnum.LAST_YEAR,
        label: "Last Year",
      };
    }

    default:
      return last30Days;
  }
};
