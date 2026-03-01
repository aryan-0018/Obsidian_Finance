import PageLayout from "@/components/page-layout";
import DetailedCharts from "./detailed-charts";
import { useState } from "react";
import { DateRangeType } from "@/components/date-range-select";
import DashboardSummary from "@/pages/dashboard/dashboard-summary";
import AiInsights from "./ai-insights";
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
                <div className="mb-6">
                    <h2 className="text-2xl font-light tracking-tight text-foreground">Advanced Analytics</h2>
                    <p className="text-muted-foreground mt-1">Deep dive into your financial trajectory and category intensity.</p>
                </div>

                {/* Main Shared Portfolio Logic */}
                <EditableBalanceCard />

                {/* AI Insights Engine */}
                <AiInsights />

                {/* Advanced Analytics Charts */}
                <DetailedCharts dateRange={dateRange} />
            </PageLayout>
        </div>
    );
};

export default Analytics;
