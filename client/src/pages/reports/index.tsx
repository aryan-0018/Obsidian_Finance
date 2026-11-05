import PageLayout from "@/components/page-layout";
import ScheduleReportDrawer from "./_component/schedule-report-drawer";
import InstantReportModal from "./_component/instant-report-modal";
import ReportTable from "./_component/report-table";
import { Card, CardContent } from "@/components/ui/card";

export default function Reports() {
  return (
    <PageLayout
      title="Report History"
      subtitle="View and manage your financial reports"
      addMarginTop
      rightAction={
        <div className="flex items-center gap-3">
          <InstantReportModal />
          <ScheduleReportDrawer />
        </div>
      }
    >
      <Card className="border border-[#c1a063]/20 shadow-lg bg-[#111] mt-6 w-full">
        <CardContent className="pt-6">
          <ReportTable />
        </CardContent>
      </Card>
    </PageLayout>
  );
}
