import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { PlusIcon, XIcon, Send } from "lucide-react";
import { useState, useEffect } from "react";
import TransactionForm from "./transaction-form";

const AddTransactionDrawer = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ modal?: string }>;
      if (
        customEvent.detail?.modal === "ADD_TRANSACTION" ||
        customEvent.detail?.modal === "RECEIPT_SCANNER"
      ) {
        setOpen(true);
      }
    };
    window.addEventListener("obsidian:open-modal", handleOpen);
    return () => window.removeEventListener("obsidian:open-modal", handleOpen);
  }, []);

  const onCloseDrawer = () => {
    setOpen(false);
  };


  return (
    <Drawer direction="right" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className="!cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)]">
          <PlusIcon className="h-4 w-4" />
          Add Transaction
        </Button>
      </DrawerTrigger>
      <DrawerContent className="inset-y-0 right-0 h-full w-full sm:max-w-md overflow-y-auto bg-[#0e0e12] border-l border-white/[0.08]">
        <DrawerHeader className="relative pb-3 pt-5 border-b border-white/[0.06]">
          <div>
            <DrawerTitle className="text-xl font-semibold tracking-tight text-white">
              New Transaction
            </DrawerTitle>
            <DrawerDescription className="text-xs text-[#8e8e93]">
              Record an income, expense, or scan a receipt photo
            </DrawerDescription>
          </div>
          <DrawerClose className="absolute top-5 right-4 h-7 w-7 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#8e8e93] hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-95">
            <XIcon className="h-4 w-4" />
          </DrawerClose>
        </DrawerHeader>
        <div className="mx-4 mt-3 mb-1 px-3 py-2 rounded-xl bg-[#e5c158]/10 border border-[#c1a063]/25 flex items-center gap-2 text-xs text-[#fcfcfc]">
          <Send className="h-3.5 w-3.5 shrink-0 text-[#e5c158]" />
          <span><strong>Tip:</strong> Snap receipt photos or text expenses directly via Telegram.</span>
        </div>
        <TransactionForm onCloseDrawer={onCloseDrawer} />
      </DrawerContent>
    </Drawer>
  );
};

export default AddTransactionDrawer;
