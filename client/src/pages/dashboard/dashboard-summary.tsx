import { useTypedSelector } from "@/app/hook";
import DashboardHeader from "./_component/dashboard-header";
import DashboardStats from "./_component/dashboard-stats";
import { DateRangeType } from "@/components/date-range-select";

interface DashboardSummaryProps {
  dateRange?: DateRangeType;
  setDateRange?: (range: DateRangeType) => void;
  title?: string;
  subtitle?: string;
}

const DashboardSummary = ({
  dateRange,
  setDateRange,
  title,
  subtitle,
}: DashboardSummaryProps) => {
  const { user } = useTypedSelector((state) => state.auth);

  return (
    <div className="w-full">
      <DashboardHeader
        title={title || `Welcome back, ${user?.name || "User"}`}
        subtitle={subtitle || "This is your overview report for the selected period"}
        dateRange={dateRange}
        setDateRange={setDateRange}
      />
      <DashboardStats dateRange={dateRange} />
    </div>
  );
};

export default DashboardSummary;
