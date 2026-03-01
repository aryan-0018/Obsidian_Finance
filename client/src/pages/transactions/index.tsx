import PageLayout from "@/components/page-layout";
import AddTransactionDrawer from "@/components/transaction/add-transaction-drawer";
import TransactionTable from "@/components/transaction/transaction-table";
import ImportTransactionModal from "@/components/transaction/import-transaction-modal";
import ExportTransactionModal from "@/components/transaction/export-transaction-modal";

export default function Transactions() {

  return (
    <PageLayout
      title="All Transactions"
      subtitle="Showing all transactions"
      addMarginTop
      rightAction={
        <div className="flex items-center gap-2">
          <ExportTransactionModal />
          <ImportTransactionModal />
          <AddTransactionDrawer />
        </div>
      }
    >
      <div className="w-full mt-4">
        <TransactionTable pageSize={20} />
      </div>
    </PageLayout>
  );
}
