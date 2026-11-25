import {
  ArrowUpDown,
  CircleDot,
  LucideIcon,
  RefreshCw,
  Send,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { TransactionType } from "@/features/transaction/transationType";
import { _TRANSACTION_FREQUENCY, _TRANSACTION_TYPE } from "@/constant";
import { AmountCell, EditableDateCell, ActionsCell } from "./table-cells";

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
    cell: ({ row }) => {
      const raw = row.getValue("createdAt");
      const d = raw ? new Date(String(raw)) : null;
      return d && !Number.isNaN(d.getTime()) ? format(d, "MMM dd, yyyy") : "-";
    },
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
            {row.original.accountId &&
              typeof row.original.accountId === "object" && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/[0.04] text-[#d4d4d8] border border-white/[0.08] shrink-0 font-normal"
                  title="Linked account"
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        row.original.accountId.color || "#e5c158",
                    }}
                  />
                  {row.original.accountId.name}
                  {row.original.toAccountId &&
                    typeof row.original.toAccountId === "object" &&
                    ` → ${row.original.toAccountId.name}`}
                </span>
              )}
            {row.original.receiptUrl &&
              /^https?:\/\//i.test(row.original.receiptUrl) && (
                <a
                  href={row.original.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View attached receipt"
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#c1a063]/10 text-[#c1a063] border border-[#c1a063]/25 hover:bg-[#c1a063]/20 shrink-0 font-normal transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <FileText className="h-2.5 w-2.5" /> Receipt
                </a>
              )}
          </div>
          <div className="flex items-center gap-1.5 md:hidden text-[11px] text-[#a1a1aa]">
            <span className="capitalize">{category}</span>
            {date && !Number.isNaN(new Date(date).getTime()) && (
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
      const typeVal = row.getValue("type") as string;
      const isIncome = typeVal === _TRANSACTION_TYPE.INCOME;
      const isTransfer = typeVal === _TRANSACTION_TYPE.TRANSFER;
      return (
        <div className="capitalize">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium tracking-wide ${
              isIncome
                ? "bg-[#e5c158]/10 text-[#e5c158] border-[#e5c158]/25"
                : isTransfer
                  ? "bg-white/[0.06] text-[#d4d4d8] border-white/[0.12]"
                  : "bg-[#f43f5e]/10 text-[#f43f5e] border-[#f43f5e]/25"
            }`}
          >
            {typeVal}
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
          DEFAULT: { label: "One-time", icon: CircleDot },
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
            {nextDate &&
              isRecurring &&
              !Number.isNaN(new Date(nextDate).getTime()) && (
                <span className="text-xs text-muted-foreground">
                  Next: {format(new Date(nextDate), "MMM dd yyyy")}
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
