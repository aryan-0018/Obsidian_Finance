import PageLayout from "@/components/page-layout";
import AddTransactionDrawer from "@/components/transaction/add-transaction-drawer";
import TransactionTable from "@/components/transaction/transaction-table";
import ImportTransactionModal from "@/components/transaction/import-transaction-modal";
import ExportTransactionModal from "@/components/transaction/export-transaction-modal";

export default function Transactions() {
  return (
    <PageLayout
      title="Transactions"
      subtitle="Verified inflows, outflows, and transfers across all accounts."
      rightAction={
        <div className="flex items-center gap-2">
          <ExportTransactionModal />
          <ImportTransactionModal />
          <AddTransactionDrawer />
        </div>
      }
    >
      <div className="w-full">
        <TransactionTable pageSize={20} />
      </div>
    </PageLayout>
  );
}
