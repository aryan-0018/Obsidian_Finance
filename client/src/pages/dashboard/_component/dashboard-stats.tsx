import { useSummaryAnalyticsQuery } from "@/features/analytics/analyticsAPI";
import SummaryCard from "./summary-card";
import { DateRangeType } from "@/components/date-range-select";
import { useTypedSelector } from "@/app/hook";

const DashboardStats = ({ dateRange }: { dateRange?: DateRangeType }) => {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data, isLoading } = useSummaryAnalyticsQuery(
    {
      preset: dateRange?.value,
      from: dateRange?.from ? new Date(dateRange.from).toISOString() : undefined,
      to: dateRange?.to ? new Date(dateRange.to).toISOString() : undefined,
    },
    {
      skip: !dateRange,
      pollingInterval: 20000,
      skipPollingIfUnfocused: true,
    }
  );
  const summaryData = data?.data;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SummaryCard
        title="Remaining Budget"
        value={summaryData?.remainingBudget}
        budgetLimit={summaryData?.budgetLimit}
        currency={currency}
        dateRange={dateRange}
        percentageChange={summaryData?.percentageChange?.balance}
        isLoading={isLoading}
        cardType="balance"
      />
      <SummaryCard
        title="Total Income"
        value={summaryData?.totalIncome}
        currency={currency}
        percentageChange={summaryData?.percentageChange?.income}
        dateRange={dateRange}
        isLoading={isLoading}
        cardType="income"
      />
      <SummaryCard
        title="Total Expenses"
        value={summaryData?.totalExpenses}
        currency={currency}
        dateRange={dateRange}
        percentageChange={summaryData?.percentageChange?.expenses}
        isLoading={isLoading}
        cardType="expenses"
      />
      <SummaryCard
        title="Savings Rate"
        value={summaryData?.savingRate?.percentage}
        currency={currency}
        expenseRatio={summaryData?.savingRate?.expenseRatio}
        isPercentageValue
        dateRange={dateRange}
        isLoading={isLoading}
        cardType="savings"
      />
    </div>
  );
};

export default DashboardStats;
