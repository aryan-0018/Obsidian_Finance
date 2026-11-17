import PageLayout from "@/components/page-layout";
import ScheduleReportDrawer from "./_component/schedule-report-drawer";
import InstantReportModal from "./_component/instant-report-modal";
import ReportTable from "./_component/report-table";

export default function Reports() {
  return (
    <PageLayout
      title="Reports"
      subtitle="Automated digests, periodic statements, and itemized financial summaries."
      rightAction={
        <div className="flex items-center gap-2">
          <InstantReportModal />
          <ScheduleReportDrawer />
        </div>
      }
    >
      <div className="obsidian-card rounded-2xl w-full p-4 sm:p-6 bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
        <ReportTable />
      </div>
    </PageLayout>
  );
}
