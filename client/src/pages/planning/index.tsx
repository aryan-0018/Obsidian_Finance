import PageLayout from "@/components/page-layout";
import BudgetsSection from "./_components/budgets-section";
import GoalsSection from "./_components/goals-section";
import RecurringSummarySection from "./_components/recurring-summary-section";

export default function Planning() {
  return (
    <PageLayout
      title="Planning"
      subtitle="Monthly category budgets, savings goals, recurring bills, and weekly summaries."
      className="space-y-10"
    >
      <div className="space-y-10">
        <BudgetsSection />
        <GoalsSection />
        <RecurringSummarySection />
      </div>
    </PageLayout>
  );
}
