import * as React from "react";
import { format } from "date-fns";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { EmptyState } from "@/components/empty-state";
import { TrendingUpIcon, TrendingDownIcon } from "lucide-react";
import { DateRangeType } from "@/components/date-range-select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format-currency";
import { useChartAnalyticsQuery } from "@/features/analytics/analyticsAPI";
import { useTypedSelector } from "@/app/hook";

interface PropsType {
  dateRange?: DateRangeType;
}

const COLORS = ["#e5c158", "#f43f5e"];
const TRANSACTION_TYPES = ["income", "expenses"];

const chartConfig = {
  income: {
    label: "Income",
    color: COLORS[0],
  },
  expenses: {
    label: "Expenses",
    color: COLORS[1],
  },
} satisfies ChartConfig;

const DashboardDataChart: React.FC<PropsType> = (props) => {
  const { dateRange } = props;
  const isMobile = useIsMobile();
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data, isFetching } = useChartAnalyticsQuery({
    preset: dateRange?.value,
    from: dateRange?.from ? new Date(dateRange.from).toISOString() : undefined,
    to: dateRange?.to ? new Date(dateRange.to).toISOString() : undefined,
  });
  const chartData = data?.data?.chartData || [];
  const totalExpenseCount = data?.data?.totalExpenseCount || 0;
  const totalIncomeCount = data?.data?.totalIncomeCount || 0;

  if (isFetching) {
    return <ChartSkeleton />;
  }

  return (
    <Card className="obsidian-card rounded-2xl !pt-0 overflow-hidden">
      <CardHeader
        className="flex flex-col items-stretch !space-y-0 border-b border-white/[0.06] !p-0 pr-1 sm:flex-row"
      >
        <div className="flex flex-1 flex-col justify-center gap-1 px-5 py-4 sm:py-0">
          <CardTitle className="text-base sm:text-lg font-semibold text-white tracking-tight">Cash Flow Trajectory</CardTitle>
          <CardDescription className="text-xs text-[#a1a1aa] font-normal">
            <span>Inflows vs expenditures for {dateRange?.label}</span>
          </CardDescription>
        </div>
        <div className="flex">
          {TRANSACTION_TYPES.map((key) => {
            const chart = key as keyof typeof chartConfig;
            return (
              <div
                key={chart}
                className="flex flex-1 flex-col justify-center gap-1 px-3 py-3 text-center even:border-l 
                sm:border-l border-white/[0.06] sm:px-5 sm:py-5 min-w-[90px] sm:min-w-36"
              >
                <span className="w-full block text-[11px] text-[#a1a1aa] font-medium tracking-wide uppercase">
                  {chartConfig[chart].label} Entries
                </span>
                <span className="flex items-center justify-center gap-1.5 text-base sm:text-xl font-bold leading-none text-white">
                  {key === TRANSACTION_TYPES[0] ? (
                    <TrendingUpIcon className="size-3 text-[#e5c158]" />
                  ) : (
                    <TrendingDownIcon className="size-3 text-[#f43f5e]" />
                  )}
                  {key === TRANSACTION_TYPES[0]
                    ? totalIncomeCount
                    : totalExpenseCount}
                </span>
              </div>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6 sm:pt-2 h-[300px]">
        {chartData?.length === 0 ? (
          <EmptyState
            title="No transaction data"
            description="There are no transactions recorded for this period."
          />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
          >
            <AreaChart data={chartData || []}>
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.01} />
                </linearGradient>
                <linearGradient
                  id="expensesGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={COLORS[1]} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={COLORS[1]} stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.04)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={isMobile ? 20 : 25}
                tickFormatter={(value) =>
                  format(new Date(value), isMobile ? "MMM d" : "MMMM d, yyyy")
                }
              />
              <ChartTooltip
                cursor={{
                  stroke: "#94a3b8",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      format(new Date(value), "MMM d, yyyy")
                    }
                    indicator="line"
                    formatter={(value, name) => {
                      const isExpense = name === "expenses";
                      const color = isExpense ? COLORS[1] : COLORS[0];
                      return [
                        <span key={name} style={{ color }}>
                          {formatCurrency(Number(value), {
                            showSign: true,
                            compact: true,
                            isExpense,
                            currency,
                          })}
                        </span>,
                        isExpense ? "Expenses" : "Income",
                      ];
                    }}
                  />
                }
              />
              <Area
                dataKey="expenses"
                stackId="1"
                type="monotone"
                fill="url(#expensesGradient)"
                stroke={COLORS[1]}
                strokeWidth={2}
                className="drop-shadow-sm"
              />
              <Area
                dataKey="income"
                stackId="1"
                type="monotone"
                fill="url(#incomeGradient)"
                stroke={COLORS[0]}
                strokeWidth={2}
              />
              <ChartLegend
                verticalAlign="bottom"
                content={<ChartLegendContent />}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

const ChartSkeleton = () => (
  <Card className="obsidian-card rounded-2xl border border-white/[0.08] !pt-0">
    <CardHeader className="flex flex-col items-stretch !space-y-0 border-b border-white/[0.06] !p-0 pr-1 sm:flex-row">
      <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-4 sm:py-0">
        <Skeleton className="h-6 w-48 bg-white/[0.06]" />
        <Skeleton className="h-4 w-32 mt-1 bg-white/[0.04]" />
      </div>
      <div className="flex">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-1 flex-col justify-center gap-1 px-6 py-4 text-center even:border-l 
            sm:border-l border-white/[0.06] sm:px-4 sm:py-6 min-w-36"
          >
            <Skeleton className="h-4 w-20 mx-auto bg-white/[0.04]" />
            <Skeleton className="h-8 w-24 mx-auto mt-1 sm:h-10 bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </CardHeader>
    <CardContent className="px-2 pt-2 sm:px-6 sm:pt-2 h-[280px]">
      <Skeleton className="h-full w-full bg-white/[0.03] rounded-xl" />
    </CardContent>
  </Card>
);

export default DashboardDataChart;
