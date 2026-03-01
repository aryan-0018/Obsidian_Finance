import { DateRangeSelect, DateRangeType } from "@/components/date-range-select";
import AddTransactionDrawer from "@/components/transaction/add-transaction-drawer";

interface Props {
  title: string;
  subtitle: string;
  dateRange?: DateRangeType;
  setDateRange?: (range: DateRangeType) => void;
}

const DashboardHeader = ({ title, subtitle, dateRange, setDateRange }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 mb-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl lg:text-4xl font-medium text-[#e8e0d4] tracking-tight">{title}</h2>
        <p className="text-[#9a9080] text-sm">{subtitle}</p>
      </div>
      <div className="flex flex-row items-center justify-center gap-4 mt-2">
        <DateRangeSelect dateRange={dateRange || null} setDateRange={(range) => setDateRange?.(range)} />
        <AddTransactionDrawer />
      </div>
    </div>
  );
};

export default DashboardHeader;
