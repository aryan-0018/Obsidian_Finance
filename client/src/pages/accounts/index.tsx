import PageLayout from "@/components/page-layout";
import AccountsSection from "./_components/accounts-section";
import SharedExpensesSection from "./_components/shared-expenses-section";

export default function Accounts() {
  return (
    <PageLayout
      title="Accounts"
      subtitle="Bank accounts, cards, internal transfers, and shared expenses."
      className="space-y-10"
    >
      <div className="space-y-10">
        <AccountsSection />
        <SharedExpensesSection />
      </div>
    </PageLayout>
  );
}
