import PageLayout from "@/components/page-layout";
import DetailedCharts from "./detailed-charts";
import { useState } from "react";
import { DateRangeType } from "@/components/date-range-select";
import DashboardSummary from "@/pages/dashboard/dashboard-summary";
import AiInsights from "./ai-insights";
import AiAdvisorChat from "./ai-advisor-chat";
import EditableBalanceCard from "@/pages/dashboard/editable-balance-card";

const Analytics = () => {
    const [dateRange, _setDateRange] = useState<DateRangeType>(null);

    return (
        <div className="w-full flex flex-col">
            <PageLayout
                className="space-y-6"
                renderPageHeader={
                    <DashboardSummary
                        dateRange={dateRange}
                        setDateRange={_setDateRange}
                    />
                }
            >
                <div className="mb-6 space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight text-white">Advanced Analytics</h2>
                    <p className="text-[#8e8e93] text-xs sm:text-sm font-normal">Deep dive into your financial spending and category trends.</p>
                </div>

                {/* Main Shared Portfolio Logic */}
                <EditableBalanceCard />

                {/* AI Interactive Chat Advisor */}
                <AiAdvisorChat dateRange={dateRange} />

                {/* AI Insights Engine */}
                <AiInsights dateRange={dateRange} />

                {/* Advanced Analytics Charts */}
                <DetailedCharts dateRange={dateRange} />
            </PageLayout>
        </div>
    );
};

export default Analytics;
