import { useState } from "react";
import PageLayout from "@/components/page-layout";
import DetailedCharts from "./detailed-charts";
import { DateRangeSelect, DateRangeType } from "@/components/date-range-select";
import AiInsights from "./ai-insights";
import AiAdvisorChat from "./ai-advisor-chat";
import LiquidityRadarChart from "@/components/analytics/liquidity-radar-chart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, LineChart } from "lucide-react";

const Analytics = () => {
    const [dateRange, _setDateRange] = useState<DateRangeType>(null);

    return (
        <PageLayout
            title="Analytics & Forecasting"
            subtitle="Forward liquidity forecasting, cash flow trends, and financial intelligence."
            rightAction={
                <DateRangeSelect
                    dateRange={dateRange}
                    setDateRange={_setDateRange}
                />
            }
        >
            <div className="w-full flex flex-col space-y-8">
                {/* Section 1: Forward 30-Day Liquidity Radar */}
                <div className="space-y-3">
                    <LiquidityRadarChart />
                </div>

                {/* Section 2: Cash Flow Trajectory & Intensity */}
                <div className="space-y-3">
                    <DetailedCharts dateRange={dateRange} />
                </div>

                {/* Section 3: Financial Intelligence (Apple Segmented Tabs) */}
                <div className="space-y-4">
                    <Tabs defaultValue="advisor" className="w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                            <div>
                                <h3 className="text-base font-semibold text-white tracking-tight">
                                    Financial Intelligence
                                </h3>
                                <p className="text-xs text-[#8e8e93] font-normal">
                                    Interactive natural language assistant and automated spending analysis.
                                </p>
                            </div>
                            <TabsList className="bg-white/[0.04] border border-white/[0.08]">
                                <TabsTrigger value="advisor" className="gap-1.5 cursor-pointer">
                                    <Sparkles className="size-3.5 text-[#e5c158]" />
                                    <span>AI Financial Advisor</span>
                                </TabsTrigger>
                                <TabsTrigger value="insights" className="gap-1.5 cursor-pointer">
                                    <LineChart className="size-3.5 text-[#e5c158]" />
                                    <span>Spending Insights</span>
                                </TabsTrigger>
                            </TabsList>
                        </div>

                        <TabsContent value="advisor" className="pt-2">
                            <AiAdvisorChat dateRange={dateRange} />
                        </TabsContent>

                        <TabsContent value="insights" className="pt-2">
                            <AiInsights dateRange={dateRange} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </PageLayout>
    );
};

export default Analytics;
