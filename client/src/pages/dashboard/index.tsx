import { useState } from "react";
import PageLayout from "@/components/page-layout";
import DashboardHeader from "./_component/dashboard-header";
import DashboardStats from "./_component/dashboard-stats";
import EditableBalanceCard from "./editable-balance-card";
import FreedomClockWidget from "@/components/freedom/freedom-clock-widget";
import DashboardDataChart from "./dashboard-data-chart";
import ExpensePieChart from "./expense-pie-chart";
import DashboardRecentTransactions from "./dashboard-recent-transactions";
import { DateRangeType } from "@/components/date-range-select";
import { useTypedSelector } from "@/app/hook";

const Dashboard = () => {
  const [dateRange, _setDateRange] = useState<DateRangeType>(null);
  const { user } = useTypedSelector((state) => state.auth);

  return (
    <PageLayout
      className="space-y-6"
      renderPageHeader={
        <DashboardHeader
          title={`Welcome back, ${user?.name || "User"}`}
          subtitle="This is your overview report for the selected period"
          dateRange={dateRange}
          setDateRange={_setDateRange}
        />
      }
    >
      <div className="w-full flex flex-col space-y-6">
        {/* Hero Section: Balance & Financial Runway in unified harmony */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <EditableBalanceCard />
          <FreedomClockWidget />
        </div>

        {/* Key Financial Metrics */}
        <DashboardStats dateRange={dateRange} />

        {/* Trajectory & Expense Breakdown */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-6 gap-6">
          <div className="lg:col-span-4">
            <DashboardDataChart dateRange={dateRange} />
          </div>
          <div className="lg:col-span-2">
            <ExpensePieChart dateRange={dateRange} />
          </div>
        </div>

        {/* Inset Recent Activity */}
        <div className="w-full">
          <DashboardRecentTransactions />
        </div>
      </div>
    </PageLayout>
  );
};

export default Dashboard;
