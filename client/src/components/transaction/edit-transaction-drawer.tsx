import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import TransactionForm from "./transaction-form";
import useEditTransactionDrawer from "@/hooks/use-edit-transaction-drawer";

const EditTransactionDrawer = () => {
  const { open, transactionId, onCloseDrawer } =
    useEditTransactionDrawer();
  return (
    <Drawer open={open} onOpenChange={onCloseDrawer} direction="right">
      <DrawerContent className="inset-y-0 right-0 h-full w-full sm:max-w-md overflow-y-auto bg-[#0e0e13]/95 backdrop-blur-2xl border-l border-white/[0.09]">
        <DrawerHeader>
          <DrawerTitle className="text-xl font-semibold tracking-tight text-white">
            Edit Transaction
          </DrawerTitle>
          <DrawerDescription className="text-xs text-[#8e8e93]">
            Edit a transaction to track your finances
          </DrawerDescription>
        </DrawerHeader>
        <TransactionForm isEdit transactionId={transactionId}
                onCloseDrawer={onCloseDrawer}
        />
      </DrawerContent>
    </Drawer>
  );
};

export default EditTransactionDrawer;
