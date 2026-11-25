/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Copy,
  FileText,
  Loader,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { formatCurrency } from "@/lib/format-currency";
import useEditTransactionDrawer from "@/hooks/use-edit-transaction-drawer";
import { _TRANSACTION_TYPE } from "@/constant";
import {
  useDeleteTransactionMutation,
  useDuplicateTransactionMutation,
  useUpdateTransactionMutation,
} from "@/features/transaction/transactionAPI";
import { toast } from "sonner";
import { useTypedSelector } from "@/app/hook";

export const AmountCell = ({
  amount,
  type,
}: {
  amount: number;
  type: string;
}) => {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";
  const absAmount = Math.abs(amount || 0);
  const isIncome = type === _TRANSACTION_TYPE.INCOME;
  const isTransfer = type === _TRANSACTION_TYPE.TRANSFER;

  return (
    <div
      className={`text-right font-medium tracking-tight text-sm tabular-nums ${
        isIncome
          ? "text-[#e5c158]"
          : isTransfer
            ? "text-[#a1a1aa]"
            : "text-white/85"
      }`}
    >
      {isTransfer ? "⇄ " : type === _TRANSACTION_TYPE.EXPENSE ? "-" : "+"}
      {formatCurrency(absAmount, { currency })}
    </div>
  );
};

export const EditableDateCell = ({ row }: { row: any }) => {
  const transaction = row.original;
  const transactionId = transaction._id || transaction.id;
  const parsedDate = transaction.date ? new Date(transaction.date) : new Date();
  const currentDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  const [open, setOpen] = useState(false);
  const [updateTransaction, { isLoading }] = useUpdateTransactionMutation();

  const handleSelectDate = async (newDate: Date | undefined) => {
    if (!newDate) return;
    setOpen(false);
    try {
      const utcNoon = new Date(
        Date.UTC(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 12, 0, 0)
      );
      await updateTransaction({
        id: transactionId,
        transaction: {
          date: utcNoon.toISOString(),
        },
      }).unwrap();
      toast.success(`Date updated to ${format(newDate, "MMM dd, yyyy")}`);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update date");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={isLoading}
          className="group flex items-center gap-1.5 text-xs text-left hover:text-[#c1a063] transition-colors cursor-pointer py-1 px-1.5 -ml-1.5 rounded hover:bg-neutral-800/50"
          title="Click to edit date"
        >
          <span>{format(currentDate, "MMM dd, yyyy")}</span>
          {isLoading ? (
            <Loader className="size-3 animate-spin text-[#c1a063]" />
          ) : (
            <CalendarIcon className="size-3 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 z-[9999] bg-[#161616] border border-[#c1a063]/30 text-white pointer-events-auto"
        align="start"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div onPointerDown={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <CalendarComponent
            mode="single"
            selected={currentDate}
            onSelect={handleSelectDate}
            onDayClick={handleSelectDate}
            initialFocus
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const ActionsCell = ({ row }: { row: any }) => {
  const transactionId = row.original._id || row.original.id;
  const { onOpenDrawer } = useEditTransactionDrawer();

  const [duplicateTransaction, { isLoading: isDuplicating }] =
    useDuplicateTransactionMutation();

  const [deleteTransaction, { isLoading: isDeleting }] =
    useDeleteTransactionMutation();

  const handleDuplicate = (e: Event) => {
    e.preventDefault();
    if (isDuplicating) return;
    duplicateTransaction(transactionId)
      .unwrap()
      .then(() => {
        toast.success("Transaction duplicated successfully");
      })
      .catch((error) => {
        toast.error(error.data?.message || "Failed to duplicate transaction");
      });
  };

  const handleDelete = (e: Event) => {
    e.preventDefault();
    if (isDeleting) return;
    deleteTransaction(transactionId)
      .unwrap()
      .then(() => {
        toast.success("Transaction deleted successfully");
      })
      .catch((error) => {
        toast.error(error.data?.message || "Failed to delete transaction");
      });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-44 obsidian-card rounded-2xl bg-[#111111]/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_15px_35px_rgba(0,0,0,0.6)] p-1.5 text-white"
        align="end"
        onCloseAutoFocus={(e) => {
          if (isDeleting || isDuplicating) {
            e.preventDefault();
          }
        }}
      >
        <DropdownMenuItem
          onClick={() => onOpenDrawer(transactionId)}
          className="rounded-xl cursor-pointer hover:bg-white/5 focus:bg-white/10 text-xs"
        >
          <Pencil className="mr-2 h-3.5 w-3.5 text-[#c1a063]" />
          Edit
        </DropdownMenuItem>
        {row.original.receiptUrl &&
          /^https?:\/\//i.test(row.original.receiptUrl) && (
            <DropdownMenuItem
              asChild
              className="rounded-xl cursor-pointer hover:bg-white/5 focus:bg-white/10 text-xs"
            >
              <a
                href={row.original.receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
            >
              <FileText className="mr-2 h-3.5 w-3.5 text-[#c1a063]" />
              View Receipt
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="relative rounded-xl cursor-pointer hover:bg-white/5 focus:bg-white/10 text-xs"
          disabled={isDuplicating}
          onSelect={handleDuplicate}
        >
          <Copy className="mr-2 h-3.5 w-3.5 text-[#c1a063]" />
          Duplicate
          {isDuplicating && (
            <Loader className="ml-1 h-3.5 w-3.5 absolute right-2 animate-spin text-[#c1a063]" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/[0.06] my-1" />
        <DropdownMenuItem
          className="relative rounded-xl cursor-pointer hover:bg-rose-500/10 focus:bg-rose-500/15 text-xs text-rose-400 focus:text-rose-300"
          disabled={isDeleting}
          onSelect={handleDelete}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-400" />
          Delete
          {isDeleting && (
            <Loader className="ml-1 h-3.5 w-3.5 absolute right-2 animate-spin text-rose-400" />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
