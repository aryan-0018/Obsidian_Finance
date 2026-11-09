import { FC } from "react";
import CountUp from "react-countup";
import {
  TrendingDownIcon,
  TrendingUpIcon,
  LucideIcon,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
} from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format-currency";
import { formatPercentage } from "@/lib/format-percentage";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DateRangeType } from "@/components/date-range-select";
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

const cardBadges: Record<CardType, { icon: LucideIcon; containerClass: string }> = {
  balance: {
    icon: Wallet,
    containerClass:
      "border-[#e5c158]/30 bg-gradient-to-br from-[#e5c158]/15 to-[#e5c158]/5 text-[#e5c158] shadow-[0_0_15px_rgba(229,193,88,0.14),inset_0_1px_0_rgba(255,255,255,0.15)]",
  },
  income: {
    icon: ArrowDownLeft,
    containerClass:
      "border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.14),inset_0_1px_0_rgba(255,255,255,0.15)]",
  },
  expenses: {
    icon: ArrowUpRight,
    containerClass:
      "border-rose-500/30 bg-gradient-to-br from-rose-500/15 to-rose-500/5 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.14),inset_0_1px_0_rgba(255,255,255,0.15)]",
  },
  savings: {
    icon: PiggyBank,
    containerClass:
      "border-sky-400/30 bg-gradient-to-br from-sky-400/15 to-sky-400/5 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.14),inset_0_1px_0_rgba(255,255,255,0.15)]",
  },
};

const getCardStatus = (
  value: number,
  cardType: CardType,
  expenseRatio?: number,
  budgetLimit?: number
): CardStatus => {
  if (cardType === "balance") {
    if (!budgetLimit || budgetLimit <= 0) {
      return {
        label: "No Limit Set",
        color: "text-[#a1a1aa]",
        Icon: Wallet,
        description: "Set a monthly budget",
      };
    }
    if (value < 0) {
      return {
        label: "Budget Exceeded",
        color: "text-[#f43f5e]",
        Icon: TrendingDownIcon,
        description: "Over monthly budget",
      };
    }
    return {
      label: "Within Budget",
      color: "text-emerald-400",
      Icon: TrendingUpIcon,
      description: "Within monthly budget",
    };
  }

  if (cardType === "savings") {
    if (value === 0) {
      return {
        label: "No Savings Record",
        color: "text-[#a1a1aa]",
        Icon: TrendingDownIcon,
      };
    }

    // Check savings percentage first
    if (value < 10) {
      return {
        label: "Low Savings",
        color: "text-[#f43f5e]",
        Icon: TrendingDownIcon,
        description: `Only ${value.toFixed(1)}% saved`,
      };
    }

    if (value < 20) {
      return {
        label: "Moderate",
        color: "text-amber-400",
        Icon: TrendingDownIcon,
        description: `${expenseRatio?.toFixed(0)}% spent`,
      };
    }

    // High savings → check if expense ratio is unusually high for warning
    if (expenseRatio && expenseRatio > 75) {
      return {
        label: "High Spend",
        color: "text-[#f43f5e]",
        Icon: TrendingDownIcon,
        description: `${expenseRatio.toFixed(0)}% spent`,
      };
    }

    if (expenseRatio && expenseRatio > 60) {
      return {
        label: "Warning: High Spend",
        color: "text-amber-500",
        Icon: TrendingDownIcon,
        description: `${expenseRatio.toFixed(0)}% spent`,
      };
    }

    return {
      label: "Good Savings",
      color: "text-[#e5c158]",
      Icon: TrendingUpIcon,
    };
  }

  if (value === 0) {
    const typeLabel = cardType === "income" ? "Income" : "Expenses";

    return {
      label: `No ${typeLabel}`,
      color: "text-[#a1a1aa]",
      Icon: TrendingDownIcon,
      description: ``,
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
  const status = getCardStatus(value, cardType, expenseRatio, budgetLimit);
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
          <Skeleton className="h-7 w-7 rounded-lg bg-white/30" />
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

  // For balance card progress
  const safeBudgetLimit = budgetLimit || 0;
  const safeRemaining = value || 0;
  const budgetSpent = Math.max(0, safeBudgetLimit - safeRemaining);
  const budgetPercentUsed = safeBudgetLimit > 0 ? Math.min(100, Math.round((budgetSpent / safeBudgetLimit) * 100)) : 0;
  const badgeConfig = cardBadges[cardType] || cardBadges.balance;
  const BadgeIcon = badgeConfig.icon;

  return (
    <div className="obsidian-card obsidian-card-interactive rounded-2xl p-5 flex flex-col justify-between">
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-2">
        <span className="text-xs sm:text-[13px] font-medium text-[#8e8e93] tracking-normal">{title}</span>
        <div
          className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-150 hover:scale-105 active:scale-95",
            badgeConfig.containerClass
          )}
          title={title}
        >
          <BadgeIcon className="h-4 w-4" />
        </div>
      </div>

      {/* Main Metric Value */}
      <div className="py-2">
        <div
          className={cn(
            "text-3xl sm:text-4xl font-semibold tracking-tight tabular-nums truncate",
            cardType === "balance" && value < 0 ? "text-[#ff453a]" : "text-white"
          )}
        >
          <CountUp
            start={0}
            end={value}
            duration={0.6}
            preserveValue
            decimals={2}
            decimalPlaces={2}
            formattingFn={formatCountupValue}
          />
        </div>
      </div>

      {/* Context / Footer Row */}
      <div className="pt-2 mt-auto border-t border-white/[0.06]">
        {cardType === "balance" ? (
          <div className="space-y-1.5">
            {/* Miniature Hairline Progress Bar */}
            {safeBudgetLimit > 0 && (
              <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    budgetPercentUsed > 90
                      ? "bg-[#f43f5e]"
                      : budgetPercentUsed > 70
                      ? "bg-amber-400"
                      : "bg-[#e5c158]"
                  )}
                  style={{ width: `${budgetPercentUsed}%` }}
                />
              </div>
            )}
            <div className="flex items-center justify-between text-xs text-[#a1a1aa]">
              <span className="text-xs">Monthly Limit:</span>
              {isEditingBudget ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    value={editBudgetValue}
                    onChange={(e) => setEditBudgetValue(e.target.value)}
                    placeholder="Limit"
                    className="w-20 h-6 text-xs bg-white/10 border-white/20 text-white px-1.5 py-0.5 rounded"
                    autoFocus
                  />
                  <Button
                    size="icon"
                    className="h-6 w-6 bg-[#e5c158] hover:bg-[#c1a063] text-black rounded"
                    onClick={() => {
                      const newLimit = parseFloat(editBudgetValue);
                      if (!isNaN(newLimit)) {
                        updateBudget({ limit: Math.round(newLimit) })
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
                <div className="flex items-center gap-1.5">
                  <span className="text-white font-medium text-xs">
                    {formatCurrency(safeBudgetLimit, { currency })}
                  </span>
                  <button
                    onClick={() => {
                      setEditBudgetValue(safeBudgetLimit.toString());
                      setIsEditingBudget(true);
                    }}
                    className="text-[#a1a1aa] hover:text-[#e5c158] transition-colors p-0.5 cursor-pointer"
                    title="Edit Budget Limit"
                  >
                    <Edit2 className="size-2.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : cardType === "savings" ? (
          <div className="flex items-center justify-between text-xs">
            <span className={cn("font-medium text-xs", status.color)}>
              {status.label}
            </span>
            {expenseRatio !== undefined && (
              <span className="text-xs text-[#a1a1aa]">
                {expenseRatio.toFixed(0)}% spent
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs">
            {showTrend && percentageChange !== 0 ? (
              <div
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
                  trendDirection === "positive"
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : "text-[#f43f5e] bg-rose-500/10 border-rose-500/20"
                )}
              >
                {trendDirection === "positive" ? (
                  <TrendingUpIcon className="size-3" />
                ) : (
                  <TrendingDownIcon className="size-3" />
                )}
                <span>
                  {formatPercentage(percentageChange || 0, {
                    showSign: true,
                    isExpense: cardType === "expenses",
                    decimalPlaces: 1,
                  })}
                </span>
                <span className="opacity-70 font-normal">vs prior</span>
              </div>
            ) : (
              <span className="text-xs text-[#a1a1aa]">
                {status.label || dateRange?.label || "Balanced"}
              </span>
            )}
            <span className="text-xs text-[#a1a1aa]/70 truncate max-w-[90px]">
              {dateRange?.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SummaryCard;
