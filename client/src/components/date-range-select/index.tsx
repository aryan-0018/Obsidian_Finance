import { useEffect, useState } from "react";
import {
  format,
  subDays,
  subMonths,
  subYears,
  startOfMonth,
  startOfYear,
  endOfDay,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDownIcon, Calendar as CalendarIcon, ArrowLeft } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";

import {
  DateRangeEnum,
  type DateRangeEnumType,
  type DateRangeType,
} from "./types";

export { DateRangeEnum, type DateRangeEnumType, type DateRangeType };

type DateRangePreset = {
  label: string;
  value: string;
  getRange: () => DateRangeType;
};

interface DateRangeSelectProps {
  dateRange: DateRangeType;
  setDateRange: (range: DateRangeType) => void;
  defaultRange?: DateRangeEnumType;
}

const now = new Date();
const today = endOfDay(now);

const presets: DateRangePreset[] = [
  {
    label: "Last 30 Days",
    value: DateRangeEnum.LAST_30_DAYS,
    getRange: () => ({
      from: subDays(today, 29),
      to: today,
      value: DateRangeEnum.LAST_30_DAYS,
      label: "for Past 30 Days",
    }),
  },
  {
    label: "Last Month",
    value: DateRangeEnum.LAST_MONTH,
    getRange: () => ({
      from: startOfMonth(subMonths(today, 1)),
      to: startOfMonth(today),
      value: DateRangeEnum.LAST_MONTH,
      label: "for Last Month",
    }),
  },
  {
    label: "Last 3 Months",
    value: DateRangeEnum.LAST_3_MONTHS,
    getRange: () => ({
      from: startOfMonth(subMonths(today, 3)),
      to: startOfMonth(today),
      value: DateRangeEnum.LAST_3_MONTHS,
      label: "for Past 3 Months",
    }),
  },
  {
    label: "Last Year",
    value: DateRangeEnum.LAST_YEAR,
    getRange: () => ({
      from: startOfYear(subYears(today, 1)),
      to: startOfYear(today),
      value: DateRangeEnum.LAST_YEAR,
      label: "for Past Year",
    }),
  },
  {
    label: "This Month",
    value: DateRangeEnum.THIS_MONTH,
    getRange: () => ({
      from: startOfMonth(today),
      to: today,
      value: DateRangeEnum.THIS_MONTH,
      label: "for This Month",
    }),
  },
  {
    label: "This Quarter",
    value: DateRangeEnum.THIS_QUARTER,
    getRange: () => ({
      from: startOfQuarter(today),
      to: today,
      value: DateRangeEnum.THIS_QUARTER,
      label: "for This Quarter",
    }),
  },
  {
    label: "Last Quarter",
    value: DateRangeEnum.LAST_QUARTER,
    getRange: () => ({
      from: startOfQuarter(subQuarters(today, 1)),
      to: endOfQuarter(subQuarters(today, 1)),
      value: DateRangeEnum.LAST_QUARTER,
      label: "for Last Quarter",
    }),
  },
  {
    label: "This Year",
    value: DateRangeEnum.THIS_YEAR,
    getRange: () => ({
      from: startOfYear(today),
      to: today,
      value: DateRangeEnum.THIS_YEAR,
      label: "for This Year",
    }),
  },
  {
    label: "All Time",
    value: DateRangeEnum.ALL_TIME,
    getRange: () => ({
      from: null,
      to: null,
      value: DateRangeEnum.ALL_TIME,
      label: "across All Time",
    }),
  },
];

export const DateRangeSelect = ({
  dateRange,
  setDateRange,
  defaultRange = DateRangeEnum.LAST_30_DAYS,
}: DateRangeSelectProps) => {
  const [open, setOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customRange, setCustomRange] = useState<DateRange | undefined>(
    dateRange?.from
      ? { from: dateRange.from, to: dateRange.to || undefined }
      : undefined
  );

  const displayText = dateRange
    ? presets.find((p) => p.value === dateRange.value)?.label ||
      (dateRange.from
        ? `${format(dateRange.from, "MMM dd, y")} - ${
            dateRange.to ? format(dateRange.to, "MMM dd, y") : "Present"
          }`
        : "Select a duration")
    : "Select a duration";

  // Set default range on initial render
  useEffect(() => {
    if (!dateRange) {
      const defaultPreset = presets.find((p) => p.value === defaultRange);
      if (defaultPreset) {
        setDateRange(defaultPreset.getRange());
      }
    }
  }, [dateRange, defaultRange, setDateRange]);

  const handleApplyCustom = () => {
    if (customRange?.from) {
      setDateRange({
        from: customRange.from,
        to: customRange.to || customRange.from,
        value: DateRangeEnum.CUSTOM,
        label: `${format(customRange.from, "MMM dd, y")} - ${
          customRange.to ? format(customRange.to, "MMM dd, y") : format(customRange.from, "MMM dd, y")
        }`,
      });
      setOpen(false);
      setIsCustomMode(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setIsCustomMode(false);
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            `w-[220px] flex items-center justify-between text-left font-normal !bg-[var(--secondary-dark-color)]
            border-gray-700 !text-white !cursor-pointer`,
            !dateRange && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {isCustomMode ? (
          <div className="p-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-800 mb-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs flex items-center gap-1 cursor-pointer"
                onClick={() => setIsCustomMode(false)}
              >
                <ArrowLeft className="h-3 w-3" />
                Presets
              </Button>
              <span className="text-xs font-medium text-muted-foreground">Custom Range</span>
            </div>
            <Calendar
              mode="range"
              selected={customRange}
              onSelect={(range) => {
                setCustomRange(range);
              }}
              initialFocus
            />
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-800 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setIsCustomMode(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="cursor-pointer"
                disabled={!customRange?.from}
                onClick={handleApplyCustom}
              >
                Apply Range
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid py-1 min-w-[180px]">
            {presets.map((preset) => (
              <Button
                key={preset.value}
                variant="ghost"
                className={cn(
                  "justify-start text-left cursor-pointer",
                  dateRange?.value === preset.value && "bg-accent text-primary"
                )}
                onClick={() => {
                  setDateRange(preset.getRange());
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
            <div className="border-t border-gray-800 my-1" />
            <Button
              variant="ghost"
              className={cn(
                "justify-start text-left cursor-pointer flex items-center gap-2 text-primary font-medium",
                dateRange?.value === DateRangeEnum.CUSTOM && "bg-accent"
              )}
              onClick={() => setIsCustomMode(true)}
            >
              <CalendarIcon className="h-4 w-4" />
              Custom Date Range...
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
