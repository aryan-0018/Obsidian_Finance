import { Label, Pie, PieChart, Cell } from "recharts";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { DateRangeType } from "@/components/date-range-select";
import { formatCurrency } from "@/lib/format-currency";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercentage } from "@/lib/format-percentage";
import { EmptyState } from "@/components/empty-state";
import { useExpensePieChartBreakdownQuery } from "@/features/analytics/analyticsAPI";
import { useTypedSelector } from "@/app/hook";

const COLORS = [
  "#e5c158",
  "#0A84FF",
  "#FF453A",
  "#BF5AF2",
  "#30D158",
  "#FF9F0A",
];

// Create chart config for shadcn UI chart
const chartConfig = {
  amount: {
    label: "Amount",
  },
} satisfies ChartConfig;

const ExpensePieChart = (props: { dateRange?: DateRangeType }) => {
  const { dateRange } = props;
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data, isFetching } = useExpensePieChartBreakdownQuery({
    preset: dateRange?.value,
    from: dateRange?.from ? new Date(dateRange.from).toISOString() : undefined,
    to: dateRange?.to ? new Date(dateRange.to).toISOString() : undefined,
  });
  const categories = data?.data?.breakdown || [];
  const totalSpent = data?.data?.totalSpent || 0;

  if (isFetching) {
    return <PieChartSkeleton />;
  }
  // Custom legend component
  const CustomLegend = () => {
    return (
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 mt-4">
        {categories.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            ></div>
            <div className="flex justify-between w-full">
              <span className="text-xs font-medium text-white truncate capitalize">
                {entry.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8e8e93] whitespace-nowrap font-medium tabular-nums">
                  {formatCurrency(entry.value, { currency })}
                </span>
                <span className="text-xs text-white/50 font-normal tabular-nums">
                  ({formatPercentage(entry.percentage, { decimalPlaces: 0 })})
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className="obsidian-card rounded-2xl overflow-hidden bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
      <CardHeader className="pb-3 border-b border-white/[0.06] mb-2 px-5 pt-5">
        <CardTitle className="text-base sm:text-lg font-semibold text-white tracking-tight">Expense Distribution</CardTitle>
        <CardDescription className="text-xs text-[#8e8e93] font-normal">Distribution across {dateRange?.label}</CardDescription>
      </CardHeader>
      <CardContent className="h-[313px]">
        <div className="w-full">
          {categories?.length === 0 ? (
            <EmptyState
              title="No expenses found"
              description="There are no expenses recorded for this period."
            />
          ) : (
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent />}
                />

                <Pie
                  data={categories}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={2.5}
                  stroke="#070709"
                >
                  {categories.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}

                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-white text-2xl font-semibold tracking-tight tabular-nums"
                            >
                              {formatCurrency(totalSpent, { currency })}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 20}
                              className="fill-[#8e8e93] text-xs font-medium"
                            >
                              Total Spent
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
                <ChartLegend content={<CustomLegend />} />
              </PieChart>
            </ChartContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const PieChartSkeleton = () => (
  <Card className="obsidian-card rounded-2xl border border-white/[0.08]">
    <CardHeader className="pb-2 border-b border-white/[0.06] px-5 pt-5">
      <Skeleton className="h-6 w-48 bg-white/[0.06]" />
      <Skeleton className="h-4 w-32 mt-1 bg-white/[0.04]" />
    </CardHeader>
    <CardContent className="h-[313px] px-5 pt-4">
      <div className="w-full flex items-center justify-center">
        <div className="relative w-[200px] h-[200px]">
          <Skeleton className="rounded-full w-full h-full bg-white/[0.03]" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Skeleton className="h-8 w-24 mb-2 bg-white/[0.06]" />
            <Skeleton className="h-4 w-16 bg-white/[0.04]" />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-2.5 w-2.5 rounded-full bg-white/[0.06]" />
              <Skeleton className="h-4 w-20 bg-white/[0.04]" />
            </div>
            <Skeleton className="h-4 w-12 bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default ExpensePieChart;
