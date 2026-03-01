import { useSummaryAnalyticsQuery } from "@/features/analytics/analyticsAPI";
import SummaryCard from "./summary-card";
import { DateRangeType } from "@/components/date-range-select";
import { useTypedSelector } from "@/app/hook";

const DashboardStats = ({ dateRange }: { dateRange?: DateRangeType }) => {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data, isFetching } = useSummaryAnalyticsQuery(
    { preset: dateRange?.value },
    { skip: !dateRange }
  );
  const summaryData = data?.data;

  return (
    <div className="flex flex-row items-center">
      <div className="flex-1 lg:flex-[1] grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Budget Allocation"
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
    </div>
  );
};

export default DashboardStats;
