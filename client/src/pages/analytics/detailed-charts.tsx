import { format } from "date-fns";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useChartAnalyticsQuery } from "@/features/analytics/analyticsAPI";
import { DateRangeType } from "@/components/date-range-select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { formatCurrency } from "@/lib/format-currency";
import { useTypedSelector } from "@/app/hook";

interface DetailedChartsProps {
    dateRange?: DateRangeType;
}

interface ChartDataPoint {
    date: string | Date;
    income: number;
    expenses: number;
    [key: string]: string | number | Date;
}

const DetailedCharts: React.FC<DetailedChartsProps> = ({ dateRange }) => {
    const { user } = useTypedSelector((state) => state.auth);
    const currency = user?.currency || "INR";

    const { data, isFetching } = useChartAnalyticsQuery({
        preset: dateRange?.value,
        from: dateRange?.from ? new Date(dateRange.from).toISOString() : undefined,
        to: dateRange?.to ? new Date(dateRange.to).toISOString() : undefined,
    });

    const chartData = data?.data?.chartData || [];

    if (isFetching) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full h-[400px]">
                <Skeleton className="w-full h-full rounded-xl" />
                <Skeleton className="w-full h-full rounded-xl" />
            </div>
        );
    }

    if (chartData.length === 0) {
        return (
            <div className="obsidian-card rounded-2xl bg-[#111111]/85 backdrop-blur-2xl border border-white/[0.08] shadow-[0_15px_35px_rgba(0,0,0,0.5)] p-8">
                <EmptyState title="Insufficient Data" description="No financial data available for advanced analytics in this period." />
            </div>
        );
    }

    // Pre-process for Net Flow
    const advancedData = chartData.map((d: ChartDataPoint) => ({
        ...d,
        netFlow: d.income - d.expenses,
    }));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
            {/* Chart 1: Smooth Net Flow Area Chart */}
            <div className="obsidian-card rounded-2xl overflow-hidden relative">
                <div className="border-b border-white/[0.06] p-5 pb-3">
                    <h3 className="text-base font-semibold text-white tracking-tight">Net Flow Trajectory</h3>
                    <p className="text-xs text-[#a1a1aa] font-normal mt-0.5">Surplus vs deficit momentum over time</p>
                </div>
                <div className="p-5 pt-3 relative z-10 h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={advancedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="netFlowGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#e5c158" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#e5c158" stopOpacity={0.01} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} dy={8} tickFormatter={(val) => format(new Date(val), "MMM d")} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={(val) => formatCurrency(val, { currency, compact: true, decimalPlaces: 0 })} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "rgba(14, 14, 18, 0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.10)", borderRadius: "14px", color: "#fff", boxShadow: "0 14px 35px rgba(0,0,0,0.7)" }}
                                itemStyle={{ color: "#e5c158" }}
                                formatter={(value: number) => formatCurrency(value, { currency })}
                                labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                            />
                            <Area type="monotone" dataKey="netFlow" stroke="#e5c158" strokeWidth={2.5} fillOpacity={1} fill="url(#netFlowGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 2: Stacked Bar Chart for Income/Expense Intensity */}
            <div className="obsidian-card rounded-2xl overflow-hidden relative">
                <div className="border-b border-white/[0.06] p-5 pb-3">
                    <h3 className="text-base font-semibold text-white tracking-tight">Cash Flow Volume</h3>
                    <p className="text-xs text-[#a1a1aa] font-normal mt-0.5">Aggregated inflow vs outflow intensity</p>
                </div>
                <div className="p-5 pt-3 relative z-10 h-[340px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={advancedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} dy={8} tickFormatter={(val) => format(new Date(val), "MMM d")} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} tickFormatter={(val) => formatCurrency(val, { currency, compact: true, decimalPlaces: 0 })} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "rgba(14, 14, 18, 0.96)", backdropFilter: "blur(20px)", borderColor: "rgba(255,255,255,0.10)", borderRadius: "14px", color: "#fff", boxShadow: "0 14px 35px rgba(0,0,0,0.7)" }}
                                formatter={(value: number) => formatCurrency(value, { currency })}
                                labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                            />
                            <Bar dataKey="income" stackId="a" fill="#e5c158" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="expenses" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default DetailedCharts;
