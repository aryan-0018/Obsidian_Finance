import { useSummaryAnalyticsQuery } from "@/features/analytics/analyticsAPI";
import SummaryCard from "./summary-card";
import { DateRangeType } from "@/components/date-range-select";
import { useTypedSelector } from "@/app/hook";
import { formatCurrency } from "@/lib/format-currency";
import { ShieldCheck, Flame, Compass, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const DashboardStats = ({ dateRange }: { dateRange?: DateRangeType }) => {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data, isFetching } = useSummaryAnalyticsQuery(
    {
      preset: dateRange?.value,
      from: dateRange?.from ? new Date(dateRange.from).toISOString() : undefined,
      to: dateRange?.to ? new Date(dateRange.to).toISOString() : undefined,
    },
    { skip: !dateRange }
  );
  const summaryData = data?.data;
  const runway = summaryData?.runwayMetrics;

  const getRatingStyle = (rating?: string) => {
    switch (rating) {
      case "Prime":
        return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
      case "Balanced":
        return "border-sky-500/30 bg-sky-500/10 text-sky-400";
      case "Caution":
        return "border-amber-500/30 bg-amber-500/10 text-amber-400";
      default:
        return "border-rose-500/30 bg-rose-500/10 text-rose-400";
    }
  };

  return (
    <div className="flex flex-col space-y-3.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Remaining Budget"
          value={summaryData?.remainingBudget}
          budgetLimit={summaryData?.budgetLimit}
          currency={currency}
          dateRange={dateRange}
          percentageChange={summaryData?.percentageChange?.balance}
          isLoading={isFetching}
          cardType="balance"
        />
        <SummaryCard
          title="Total Income"
          value={summaryData?.totalIncome}
          currency={currency}
          percentageChange={summaryData?.percentageChange?.income}
          dateRange={dateRange}
          isLoading={isFetching}
          cardType="income"
        />
        <SummaryCard
          title="Total Expenses"
          value={summaryData?.totalExpenses}
          currency={currency}
          dateRange={dateRange}
          percentageChange={summaryData?.percentageChange?.expenses}
          isLoading={isFetching}
          cardType="expenses"
        />
        <SummaryCard
          title="Savings Rate"
          value={summaryData?.savingRate?.percentage}
          currency={currency}
          expenseRatio={summaryData?.savingRate?.expenseRatio}
          isPercentageValue
          dateRange={dateRange}
          isLoading={isFetching}
          cardType="savings"
        />
      </div>

      {runway && (
        <div className="w-full obsidian-card rounded-xl px-4 py-2.5 border border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-neutral-300">
              <Compass className="h-3.5 w-3.5 text-[#e5c158]" />
              <span className="text-neutral-400">Savings Lasts:</span>
              <span className="font-semibold text-white tracking-tight">
                {runway.runwayMonths}
              </span>
            </div>

            <span className="text-neutral-600 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5 text-neutral-300">
              <Flame className="h-3.5 w-3.5 text-rose-400" />
              <span className="text-neutral-400">Daily Spending:</span>
              <span className="font-medium text-white">
                {formatCurrency(runway.dailyBurnRate, { currency })}
                <span className="text-neutral-400 text-[10px] ml-0.5">/day</span>
              </span>
            </div>

            <span className="text-neutral-600 hidden sm:inline">•</span>

            <div className="flex items-center gap-1.5 text-neutral-300">
              <Activity className="h-3.5 w-3.5 text-sky-400" />
              <span className="text-neutral-400">Projected Month:</span>
              <span className="font-medium text-white">
                {formatCurrency(runway.projectedMonthlyExpense, { currency })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#e5c158]" />
            <span className="text-neutral-400">Financial Health:</span>
            <span className="font-semibold text-white font-mono">
              {runway.healthScore}/100
            </span>
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-medium border",
                getRatingStyle(runway.healthRating)
              )}
            >
              {runway.healthRating}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;
