import DashboardDataChart from "./dashboard-data-chart";
import PageLayout from "@/components/page-layout";
//import ExpenseBreakDown from "./expense-breakdown";
import ExpensePieChart from "./expense-pie-chart";
import DashboardRecentTransactions from "./dashboard-recent-transactions";
import EditableBalanceCard from "./editable-balance-card";
import AiInsightShortcut from "./ai-insight-shortcut";
import { useState } from "react";
import { DateRangeType } from "@/components/date-range-select";
import DashboardHeader from "./_component/dashboard-header";
import DashboardStats from "./_component/dashboard-stats";
import { useTypedSelector } from "@/app/hook";

const Dashboard = () => {
  const [dateRange, _setDateRange] = useState<DateRangeType>(null);
  const { user } = useTypedSelector((state) => state.auth);

  return (
    <PageLayout
      className="space-y-6"
      renderPageHeader={
        <div className="space-y-6 w-full mt-2">
          {/* Welcome Title - AT THE VERY TOP */}
          <DashboardHeader
            title={`Welcome back, ${user?.name || "Unknow"}`}
            subtitle="This is your overview report for the selected period"
            dateRange={dateRange}
            setDateRange={_setDateRange}
          />

          {/* Top row cards - Primary focus cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            <div className="lg:col-span-2 flex flex-col">
              <EditableBalanceCard />
            </div>
            <div className="lg:col-span-1 flex flex-col">
              <AiInsightShortcut />
            </div>
          </div>

          {/* Stats block - Below the main cards */}
          <DashboardStats dateRange={dateRange} />
        </div>
      }
    >
      <div className="w-full flex flex-col space-y-6">
        {/* Dashboard Main Section */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-6 gap-8">
          <div className="lg:col-span-4">
            <DashboardDataChart dateRange={dateRange} />
          </div>
          <div className="lg:col-span-2">
            <ExpensePieChart dateRange={dateRange} />
          </div>
        </div>
        {/* Dashboard Recent Transactions */}
        <div className="w-full mt-4">
          <DashboardRecentTransactions />
        </div>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
