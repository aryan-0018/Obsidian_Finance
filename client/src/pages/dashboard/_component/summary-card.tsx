import { FC } from "react";
import CountUp from "react-countup";
import { TrendingDownIcon, TrendingUpIcon, LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format-currency";
import { formatPercentage } from "@/lib/format-percentage";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DateRangeEnum, DateRangeType } from "@/components/date-range-select";
import { useState } from "react";
import { Edit2, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUpdateBudgetMutation } from "@/features/budget/budgetAPI";
import { toast } from "sonner";

type CardType = "balance" | "income" | "expenses" | "savings";
type CardStatus = {
  label: string;
  color: string;
  Icon: LucideIcon;
  description?: string;
};
interface SummaryCardProps {
  title: string;
  value?: number;
  dateRange?: DateRangeType;
  percentageChange?: number;
  isPercentageValue?: boolean;
  isLoading?: boolean;
  expenseRatio?: number;
  budgetLimit?: number;
  currency?: string;
  cardType: CardType;
}

const getCardStatus = (
  value: number,
  cardType: CardType,
  expenseRatio?: number
): CardStatus => {
  if (cardType === "savings") {
    if (value === 0) {
      return {
        label: "No Savings Record",
        color: "text-gray-400",
        Icon: TrendingDownIcon,
      };
    }

    // Check savings percentage first
    if (value < 10) {
      return {
        label: "Low Savings",
        color: "text-red-400",
        Icon: TrendingDownIcon,
        description: `Only ${value.toFixed(1)}% saved`,
      };
    }

    if (value < 20) {
      return {
        label: "Moderate",
        color: "text-yellow-400",
        Icon: TrendingDownIcon,
        description: `${expenseRatio?.toFixed(0)}% spent`,
      };
    }

    // High savings → check if expense ratio is unusually high for warning
    if (expenseRatio && expenseRatio > 75) {
      return {
        label: "High Spend",
        color: "text-red-400",
        Icon: TrendingDownIcon,
        description: `${expenseRatio.toFixed(0)}% spent`,
      };
    }

    if (expenseRatio && expenseRatio > 60) {
      return {
        label: "Warning: High Spend",
        color: "text-orange-400",
        Icon: TrendingDownIcon,
        description: `${expenseRatio.toFixed(0)}% spent`,
      };
    }

    return {
      label: "Good Savings",
      color: "text-green-400",
      Icon: TrendingUpIcon,
    };
  }

  if (value === 0) {
    const typeLabel =
      cardType === "income"
        ? "Income"
        : cardType === "expenses"
          ? "Expenses"
          : "Balance";

    return {
      label: `No ${typeLabel}`,
      color: "text-gray-400",
      Icon: TrendingDownIcon,
      description: ``,
    };
  }

  // For balance card when negative
  if (cardType === "balance" && value < 0) {
    return {
      label: "Overdrawn",
      color: "text-red-400",
      Icon: TrendingDownIcon,
      description: "Balance is negative",
    };
  }

  return {
    label: "",
    color: "",
    Icon: TrendingDownIcon,
  };
};

const getTrendDirection = (value: number, cardType: CardType) => {
  if (cardType === "expenses") {
    // For expenses, lower is better
    return value <= 0 ? "positive" : "negative";
  }
  // For income and balance, higher is better
  return value >= 0 ? "positive" : "negative";
};

const SummaryCard: FC<SummaryCardProps> = ({
  title,
  value = 0,
  dateRange,
  percentageChange,
  isPercentageValue,
  isLoading,
  expenseRatio,
  budgetLimit,
  currency = "INR",
  cardType = "balance",
}) => {
  const status = getCardStatus(value, cardType, expenseRatio);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [editBudgetValue, setEditBudgetValue] = useState("");
  const [updateBudget] = useUpdateBudgetMutation();
  const showTrend =
    percentageChange !== undefined &&
    percentageChange !== null &&
    cardType !== "savings";

  const trendDirection =
    showTrend && percentageChange !== 0
      ? getTrendDirection(percentageChange, cardType)
      : null;

  if (isLoading) {
    return (
      <Card className="!border-none !border-0 !gap-0 !bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 !pb-5">
          <Skeleton className="h-4 w-24 bg-white/30" />
        </CardHeader>
        <CardContent className="space-y-8">
          <Skeleton className="h-10.5 w-full bg-white/30" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12 bg-white/30" />
            <Skeleton className="h-3 w-16 bg-white/30" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCountupValue = (val: number) => {
    return isPercentageValue
      ? formatPercentage(val, { decimalPlaces: 1 })
      : formatCurrency(val, {
        currency,
        isExpense: cardType === "expenses",
        showSign: cardType === "balance" && val < 0,
      });
  };

  return (
    <Card className="!border-none !border-0 !gap-0 !bg-white/5">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 !pb-5">
        <CardTitle className="text-[15px] text-gray-300 font-medium">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className={cn(
            "text-4xl font-bold",
            cardType === "balance" && value < 0 ? "text-red-400" : "text-white"
          )}
        >
          <CountUp
            start={0}
            end={value}
            preserveValue
            decimals={2}
            decimalPlaces={2}
            formattingFn={formatCountupValue}
          />
        </div>

        {cardType === "balance" && (
          <div className="flex items-center gap-2 mt-4 text-sm text-neutral-400">
            <span>Budget Limit:</span>
            {isEditingBudget ? (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={editBudgetValue}
                  onChange={(e) => setEditBudgetValue(e.target.value)}
                  placeholder="Enter limit"
                  className="w-24 h-7 text-xs bg-white/10 border-white/20 text-white focus:border-[#c1a063] focus:ring-[#c1a063] px-2 py-1"
                  autoFocus
                />
                <Button
                  size="icon"
                  className="h-7 w-7 bg-[#c1a063] hover:bg-[#a88a4e] text-black"
                  onClick={() => {
                    const newLimit = parseFloat(editBudgetValue);
                    if (!isNaN(newLimit)) {
                      // Convert Rupee input to paise before sending to backend
                      updateBudget({ limit: Math.round(newLimit * 100) })
                        .unwrap()
                        .then(() => {
                          toast.success("Budget limit updated");
                          setIsEditingBudget(false);
                        })
                        .catch(() => toast.error("Failed to update budget"));
                    }
                  }}
                >
                  <Check className="size-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">
                  {formatCurrency(budgetLimit || 0, { currency })}
                </span>
                <button
                  onClick={() => {
                    setEditBudgetValue((budgetLimit || 0).toString());
                    setIsEditingBudget(true);
                  }}
                  className="text-neutral-500 hover:text-[#c1a063] transition-colors"
                  title="Edit Budget Limit"
                >
                  <Edit2 className="size-3" />
                </button>
              </div>
            )}
          </div>
        )}

        <div className="text-sm text-muted-foreground mt-2">
          {cardType === "savings" ? (
            <div className="flex items-center gap-1.5">
              <status.Icon className={cn("size-3.5", status.color)} />
              <span className={status.color}>
                {status.label} {value !== 0 && `(${formatPercentage(value)})`}
              </span>
              {status.description && (
                <span className="text-gray-400 ml-1">
                  • {status.description}
                </span>
              )}
            </div>
          ) : dateRange?.value === DateRangeEnum.ALL_TIME ? (
            <span className="text-gray-400">Showing {dateRange?.label}</span>
          ) : value === 0 || status.label ? (
            <div className="flex items-center gap-1.5">
              <status.Icon className={cn("size-3.5", status.color)} />
              <span className={status.color}>{status.label}</span>
              {status.description && (
                <span className="text-gray-400">• {status.description}</span>
              )}
              {!status.description && (
                <span className="text-gray-400">• {dateRange?.label}</span>
              )}
            </div>
          ) : showTrend ? (
            <div className="flex items-center gap-1.5">
              {percentageChange !== 0 && (
                <div
                  className={cn(
                    "flex items-center gap-0.5",
                    trendDirection === "positive"
                      ? "text-green-500"
                      : "text-red-500"
                  )}
                >
                  {trendDirection === "positive" ? (
                    <TrendingUpIcon className="size-3" />
                  ) : (
                    <TrendingDownIcon className="size-3" />
                  )}
                  {/*                   Math.abs(percentageChange || 0) */}
                  <span>
                    {formatPercentage(percentageChange || 0, {
                      showSign: percentageChange !== 0,
                      isExpense: cardType === "expenses",
                      decimalPlaces: 1,
                    })}
                  </span>
                </div>
              )}

              {percentageChange === 0 && (
                <div className="flex items-center gap-0.5 text-gray-400">
                  <TrendingDownIcon className="size-3" />
                  <span>
                    {formatPercentage(0, {
                      showSign: false,
                      decimalPlaces: 1,
                    })}
                  </span>
                </div>
              )}
              <span className="text-gray-400">• {dateRange?.label}</span>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
