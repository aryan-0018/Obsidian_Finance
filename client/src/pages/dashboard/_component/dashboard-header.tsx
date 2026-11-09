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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-2">
      <div className="space-y-1">
        <h2 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight">{title}</h2>
        <p className="text-[#8e8e93] text-xs lg:text-sm font-normal">{subtitle}</p>
      </div>
      <div className="flex flex-row flex-wrap items-center gap-2.5">
        <DateRangeSelect dateRange={dateRange || null} setDateRange={(range) => setDateRange?.(range)} />
        <AddTransactionDrawer />
      </div>
    </div>
  );
};

export default DashboardHeader;
