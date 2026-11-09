/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ArrowUpDown,
  Calendar as CalendarIcon,
  CircleDot,
  Copy,
  Loader,
  LucideIcon,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  //StopCircleIcon,
  Trash2,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/format-currency";
import useEditTransactionDrawer from "@/hooks/use-edit-transaction-drawer";
import { TransactionType } from "@/features/transaction/transationType";
import { _TRANSACTION_FREQUENCY, _TRANSACTION_TYPE } from "@/constant";
import {
  useDeleteTransactionMutation,
  useDuplicateTransactionMutation,
  useUpdateTransactionMutation,
} from "@/features/transaction/transactionAPI";
import { toast } from "sonner";
import { useTypedSelector } from "@/app/hook";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useState } from "react";

// eslint-disable-next-line react-refresh/only-export-components
const AmountCell = ({ amount, type }: { amount: number; type: string }) => {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  return (
    <div
      className={`text-right font-medium tracking-tight text-sm tabular-nums ${
        type === _TRANSACTION_TYPE.INCOME
          ? "text-[#30d158]"
          : "text-[#ff453a]"
      }`}
    >
      {type === _TRANSACTION_TYPE.EXPENSE ? "-" : "+"}
      {formatCurrency(amount, { currency })}
    </div>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
const EditableDateCell = ({ row }: { row: any }) => {
  const transaction = row.original;
  const transactionId = transaction._id || transaction.id;
  const currentDate = new Date(transaction.date);
  const [open, setOpen] = useState(false);
  const [updateTransaction, { isLoading }] = useUpdateTransactionMutation();

  const handleSelectDate = async (newDate: Date | undefined) => {
    if (!newDate) return;
    setOpen(false);
    try {
      const d = new Date(newDate);
      d.setHours(12, 0, 0, 0);
      await updateTransaction({
        id: transactionId,
        transaction: {
          date: d.toISOString(),
        },
      }).unwrap();
      toast.success(`Date updated to ${format(d, "MMM dd, yyyy")}`);
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

type FrequencyInfo = {
  label: string;
  icon: LucideIcon;
};
type FrequencyMapType = {
  [key: string]: FrequencyInfo;
  DEFAULT: FrequencyInfo;
};

export const transactionColumns: ColumnDef<TransactionType>[] = [
  {
    id: "select",
    meta: { className: "w-8 text-center" },
    header: ({ table }) => (
      <Checkbox
        className="border-white/20 data-[state=checked]:bg-[#c1a063] data-[state=checked]:border-[#c1a063] text-black rounded-[4px]"
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        className="border-white/20 data-[state=checked]:bg-[#c1a063] data-[state=checked]:border-[#c1a063] text-black rounded-[4px]"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "createdAt",
    meta: { className: "hidden xl:table-cell" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date Created
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => format(row.getValue("createdAt"), "MMM dd, yyyy"),
  },
  {
    accessorKey: "title",
    meta: { className: "min-w-[120px]" },
    header: "Title",
    cell: ({ row }) => {
      const title = row.getValue("title") as string;
      const desc = row.original.description || "";
      const isTelegram = desc.toLowerCase().includes("telegram");
      const category = row.original.category;
      const date = row.original.date;
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white text-xs sm:text-sm">{title}</span>
            {isTelegram && (
              <span
                title={desc}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-[#a1a1aa] border border-white/[0.08] shrink-0 font-normal"
              >
                <Send className="h-2.5 w-2.5 text-[#e5c158]" /> Telegram
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 md:hidden text-[11px] text-[#a1a1aa]">
            <span className="capitalize">{category}</span>
            {date && (
              <>
                <span>•</span>
                <span>{format(new Date(date), "MMM dd")}</span>
              </>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "category",
    meta: { className: "hidden md:table-cell" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        className="!pl-0"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Category
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const category = row.original.category;
      return (
        <span className="capitalize text-[13px] text-[#fcfcfc] font-normal">
          {category}
        </span>
      );
    },
  },
  {
    accessorKey: "type",
    meta: { className: "table-cell" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Type
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const isIncome = row.getValue("type") === _TRANSACTION_TYPE.INCOME;
      return (
        <div className="capitalize">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium tracking-wide ${
              isIncome
                ? "bg-[#e5c158]/10 text-[#e5c158] border-[#e5c158]/25"
                : "bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/25"
            }`}
          >
            {row.getValue("type")}
          </span>
        </div>
      );
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "amount",
    meta: { className: "table-cell text-right" },
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const type = row.getValue("type") as string;
      return <AmountCell amount={amount} type={type} />;
    },
  },
  {
    accessorKey: "date",
    meta: { className: "hidden md:table-cell" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Transaction Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <EditableDateCell row={row} />,
  },
  {
    accessorKey: "paymentMethod",
    meta: { className: "hidden lg:table-cell" },
    header: "Payment Method",
    cell: ({ row }) => {
      const paymentMethod = row.original.paymentMethod;
      if (!paymentMethod) return "N/A";
      //remove _
      const paymentMethodWithoutUnderscore = paymentMethod
        ?.replace("_", " ")
        ?.toLowerCase();
      return <div className="capitalize">{paymentMethodWithoutUnderscore}</div>;
    },
  },
  {
    accessorKey: "recurringInterval",
    meta: { className: "hidden xl:table-cell" },
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Frequently
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const frequency = row.getValue("recurringInterval");
      const nextDate = row.original?.nextRecurringDate;
      const isRecurring = row.original?.isRecurring;

      const frequencyMap: FrequencyMapType = isRecurring
        ? {
          [_TRANSACTION_FREQUENCY.DAILY]: { label: "Daily", icon: RefreshCw },
          [_TRANSACTION_FREQUENCY.WEEKLY]: {
            label: "Weekly",
            icon: RefreshCw,
          },
          [_TRANSACTION_FREQUENCY.MONTHLY]: {
            label: "Monthly",
            icon: RefreshCw,
          },
          [_TRANSACTION_FREQUENCY.YEARLY]: {
            label: "Yearly",
            icon: RefreshCw,
          },
          DEFAULT: { label: "One-time", icon: CircleDot }, // Fallback
        }
        : { DEFAULT: { label: "One-time", icon: CircleDot } };

      const frequencyKey = isRecurring ? (frequency as string) : "DEFAULT";
      const frequencyInfo =
        frequencyMap?.[frequencyKey] || frequencyMap.DEFAULT;
      const { label, icon: Icon } = frequencyInfo;

      return (
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span>{label}</span>
            {nextDate && isRecurring && (
              <span className="text-xs text-muted-foreground">
                Next: {format(nextDate, "MMM dd yyyy")}
              </span>
            )}
          </div>
        </div>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "actions",
    meta: { className: "table-cell w-10 text-right" },
    enableHiding: false,
    cell: ({ row }) => <ActionsCell row={row} />,
  },
];

// eslint-disable-next-line react-refresh/only-export-components
const ActionsCell = ({ row }: { row: any }) => {
  //const isRecurring = row.original.isRecurring;
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
        <DropdownMenuItem onClick={() => onOpenDrawer(transactionId)} className="rounded-xl cursor-pointer hover:bg-white/5 focus:bg-white/10 text-xs">
          <Pencil className="mr-2 h-3.5 w-3.5 text-[#c1a063]" />
          Edit
        </DropdownMenuItem>
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
