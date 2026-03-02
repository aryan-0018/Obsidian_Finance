import { format } from "date-fns";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
            <Card className="bg-[#111] dark:bg-black border border-[#c1a063]/20 shadow-lg">
                <CardContent className="pt-6">
                    <EmptyState title="Insufficient Data" description="No financial data available for advanced analytics in this period." />
                </CardContent>
            </Card>
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
            <Card className="bg-[#111] dark:bg-black border border-[#c1a063]/30 shadow-xl overflow-hidden relative">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#c1a063]/10 blur-3xl rounded-full pointer-events-none" />
                <CardHeader className="relative z-10 border-b border-white/10 pb-4">
                    <CardTitle className="text-xl font-light text-white tracking-widest uppercase">Net Flow Trajectory</CardTitle>
                    <CardDescription className="text-neutral-400">Income vs Expenses over time</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 relative z-10 h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={advancedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="netFlowGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#c1a063" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#c1a063" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#888", fontSize: 12 }} dy={10} tickFormatter={(val) => format(new Date(val), "MMM d")} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#888", fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#000", borderColor: "#c1a063", color: "#fff" }}
                                itemStyle={{ color: "#c1a063" }}
                                formatter={(value: number) => formatCurrency(value, { currency })}
                                labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                            />
                            <Area type="monotone" dataKey="netFlow" stroke="#c1a063" strokeWidth={3} fillOpacity={1} fill="url(#netFlowGrad)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Chart 2: Stacked Bar Chart for Income/Expense Intensity */}
            <Card className="bg-[#111] dark:bg-black border border-[#c1a063]/30 shadow-xl overflow-hidden relative">
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-slate-500/10 blur-3xl rounded-full pointer-events-none" />
                <CardHeader className="relative z-10 border-b border-white/10 pb-4">
                    <CardTitle className="text-xl font-light text-white tracking-widest uppercase">Cashflow Intensity</CardTitle>
                    <CardDescription className="text-neutral-400">Daily gross volume</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 relative z-10 h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={advancedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#888", fontSize: 12 }} dy={10} tickFormatter={(val) => format(new Date(val), "MMM d")} />
                            <YAxis tickLine={false} axisLine={false} tick={{ fill: "#888", fontSize: 12 }} tickFormatter={(val) => `₹${val / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: "#000", borderColor: "#333", color: "#fff" }}
                                formatter={(value: number) => formatCurrency(value, { currency })}
                                labelFormatter={(label) => format(new Date(label), "MMMM d, yyyy")}
                                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                            />
                            <Bar dataKey="income" stackId="a" fill="#c1a063" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="expenses" stackId="a" fill="#475569" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
};

export default DetailedCharts;
