import PageLayout from "@/components/page-layout";
import AddTransactionDrawer from "@/components/transaction/add-transaction-drawer";
import TransactionTable from "@/components/transaction/transaction-table";
import ImportTransactionModal from "@/components/transaction/import-transaction-modal";
import ExportTransactionModal from "@/components/transaction/export-transaction-modal";

export default function Transactions() {
  return (
    <PageLayout
      title="All Transactions"
      subtitle="View, search, and manage your financial records."
      rightAction={
        <>
          <ExportTransactionModal />
          <ImportTransactionModal />
          <AddTransactionDrawer />
        </>
      }
    >
      <div className="w-full">
        <TransactionTable pageSize={20} />
      </div>
    </PageLayout>
  );
}
