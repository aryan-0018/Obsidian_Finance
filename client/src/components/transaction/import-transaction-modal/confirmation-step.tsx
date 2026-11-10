import { useState } from "react";
import { z } from "zod";
import { ChevronDown, ChevronLeft, CheckCircle2, AlertTriangle, FileSpreadsheet, Layers, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { _TRANSACTION_TYPE, PAYMENT_METHODS_ENUM, MAX_IMPORT_LIMIT } from "@/constant";
import { toast } from "sonner";
import { BulkTransactionType } from "@/features/transaction/transationType";
import { useProgressLoader } from "@/hooks/use-progress-loader";
import { useBulkImportTransactionMutation } from "@/features/transaction/transactionAPI";

const parseCustomDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const parts = dateStr.match(/(\d+)[-/](\d+)[-/](\d+)/);
  if (parts) {
    if (parts[1].length === 4) return new Date(dateStr);
    const day = parts[1].padStart(2, "0");
    const month = parts[2].padStart(2, "0");
    const year = parts[3].length === 2 ? `20${parts[3]}` : parts[3];
    return new Date(`${year}-${month}-${day}`);
  }
  return new Date(dateStr);
};

const normalizePaymentMethod = (method: string) => {
  if (!method) return undefined;
  const upper = method.toUpperCase().replace(/\s+/g, "_");
  const values = Object.values(PAYMENT_METHODS_ENUM) as string[];
  if (values.includes(upper)) {
    return upper;
  }
  return method;
};

type ConfirmationStepProps = {
  file: File | null;
  mappings: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  csvData: Record<string, any>[];
  onComplete: () => void;
  onBack: () => void;
};

const transactionSchema = z.object({
  title: z.string({
    required_error: "Title is required",
  }),
  amount: z
    .number({
      invalid_type_error: "Amount must be a number",
      required_error: "Amount is required",
    })
    .positive("Amount must be greater than zero"),
  date: z.preprocess(
    (val) => new Date(val as string),
    z.date({
      invalid_type_error: "Invalid date format",
      required_error: "Date is required",
    })
  ),
  type: z.enum([_TRANSACTION_TYPE.INCOME, _TRANSACTION_TYPE.EXPENSE], {
    invalid_type_error: "Invalid transaction type",
    required_error: "Transaction type is required",
  }),
  category: z.string({
    required_error: "Category is required",
  }),
  paymentMethod: z
    .union([
      z.literal(""),
      z.undefined(),
      z.enum(
        [
          PAYMENT_METHODS_ENUM.CARD,
          PAYMENT_METHODS_ENUM.BANK_TRANSFER,
          PAYMENT_METHODS_ENUM.MOBILE_PAYMENT,
          PAYMENT_METHODS_ENUM.AUTO_DEBIT,
          PAYMENT_METHODS_ENUM.CASH,
          PAYMENT_METHODS_ENUM.OTHER,
        ],
        {
          errorMap: (issue) => ({
            message:
              issue.code === "invalid_enum_value"
                ? `Payment method must be one of: ${Object.values(PAYMENT_METHODS_ENUM).join(", ")}`
                : "Invalid payment method",
          }),
        }
      ),
    ])
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
});

const ConfirmationStep = ({
  file,
  mappings,
  csvData,
  onComplete,
  onBack,
}: ConfirmationStepProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    progress,
    isLoading,
    startProgress,
    updateProgress,
    doneProgress,
    resetProgress,
  } = useProgressLoader({ initialProgress: 10, completionDelay: 500 });

  const [bulkImportTransaction] = useBulkImportTransactionMutation();

  const getAssignFieldToMappedTransactions = () => {
    let hasValidationErrors = false;
    const results: Partial<BulkTransactionType>[] = [];
    const newErrors: Record<string, string> = {};

    csvData.forEach((row, index) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transaction: Record<string, any> = {};
      Object.entries(mappings).forEach(([csvColumn, transactionField]) => {
        if (transactionField === "Skip" || row[csvColumn] === undefined) return;
        transaction[transactionField] =
          transactionField === "amount"
            ? Number(row[csvColumn])
            : transactionField === "date"
              ? parseCustomDate(row[csvColumn])
              : transactionField === "paymentMethod"
                ? normalizePaymentMethod(row[csvColumn])
                : transactionField === "type"
                  ? row[csvColumn]?.toUpperCase()
                  : row[csvColumn];
      });

      try {
        const validated = transactionSchema.parse({
          ...transaction,
          date: transaction.date ? new Date(transaction.date) : undefined,
        });
        results.push({
          ...validated,
          date: validated.date.toISOString(),
        });
      } catch (error) {
        hasValidationErrors = true;
        const message =
          error instanceof z.ZodError
            ? error.errors
                .map((e) => {
                  if (e.path[0] === "type")
                    return "Transaction type must be INCOME or EXPENSE";
                  if (e.path[0] === "paymentMethod")
                    return (
                      "Payment method must be: " +
                      Object.values(PAYMENT_METHODS_ENUM).join(", ")
                    );
                  return `${e.path[0]}: ${e.message}`;
                })
                .join("\n")
            : "Invalid record data";
        newErrors[index + 1] = message;
      }
    });

    setErrors(newErrors);
    return {
      transactions: results,
      hasValidationErrors:
        hasValidationErrors || Object.keys(newErrors).length > 0,
    };
  };

  const handleImport = () => {
    const { transactions, hasValidationErrors } =
      getAssignFieldToMappedTransactions();

    if (hasErrors || hasValidationErrors) return;

    if (transactions.length > MAX_IMPORT_LIMIT) {
      toast.error(`Cannot import more than ${MAX_IMPORT_LIMIT} transactions`);
      return;
    }

    resetProgress();
    startProgress(10);
    let currentProgress = 10;
    const interval = setInterval(() => {
      const increment = currentProgress < 90 ? 10 : 1;
      currentProgress = Math.min(currentProgress + increment, 90);
      updateProgress(currentProgress);
    }, 250);

    const payload = { transactions: transactions as BulkTransactionType[] };

    bulkImportTransaction(payload)
      .unwrap()
      .then(() => {
        updateProgress(100);
        toast.success(`Successfully imported ${transactions.length} transactions`);
      })
      .catch((error) => {
        resetProgress();
        toast.error(error.data?.message || "Failed to import transactions");
      })
      .finally(() => {
        clearInterval(interval);
        setTimeout(() => {
          doneProgress();
          resetProgress();
          onComplete();
        }, 500);
      });
  };

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-white tracking-tight">Review Import</h4>
        <p className="text-xs text-[#8e8e93]">
          Verify summary details before writing rows to your ledger.
        </p>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-center">
          <div className="h-7 w-7 rounded-xl bg-white/[0.04] text-[#8e8e93] mx-auto mb-1.5 flex items-center justify-center">
            <FileSpreadsheet className="size-4" />
          </div>
          <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider font-medium">Source File</p>
          <p className="text-xs font-semibold text-white truncate mt-0.5" title={file?.name}>
            {file?.name || "CSV Upload"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-center">
          <div className="h-7 w-7 rounded-xl bg-white/[0.04] text-[#8e8e93] mx-auto mb-1.5 flex items-center justify-center">
            <Layers className="size-4" />
          </div>
          <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider font-medium">Mapped Columns</p>
          <p className="text-sm font-semibold text-white mt-0.5">
            {Object.keys(mappings).length} fields
          </p>
        </div>

        <div className="rounded-2xl border border-[#e5c158]/20 bg-[#e5c158]/[0.03] p-3.5 text-center">
          <div className="h-7 w-7 rounded-xl bg-[#e5c158]/10 text-[#f5cf6d] mx-auto mb-1.5 flex items-center justify-center">
            <Database className="size-4" />
          </div>
          <p className="text-[10px] text-[#e5c158] uppercase tracking-wider font-medium">Transactions</p>
          <p className="text-sm font-bold text-[#f5cf6d] mt-0.5 tabular-nums">
            {csvData.length} rows
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-center">
          <div className="h-7 w-7 rounded-xl bg-emerald-500/10 text-emerald-400 mx-auto mb-1.5 flex items-center justify-center">
            <CheckCircle2 className="size-4" />
          </div>
          <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider font-medium">Ready State</p>
          <p className="text-xs font-semibold text-emerald-400 mt-0.5">
            {hasErrors ? "Issues Found" : "Validated"}
          </p>
        </div>
      </div>

      {hasErrors && (
        <div className="w-full rounded-2xl border border-rose-500/20 bg-rose-500/[0.04] p-3.5 max-h-56 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-rose-500/20 text-xs font-semibold text-rose-300">
            <AlertTriangle className="size-4 text-rose-400" />
            <span>Validation Issues Detected ({Object.keys(errors).length} rows need attention)</span>
          </div>
          <div className="space-y-1.5">
            {Object.entries(errors).map(([row, msg]) => (
              <details key={row} className="group rounded-xl bg-black/40 border border-white/[0.06] p-2 text-xs">
                <summary className="flex items-center justify-between cursor-pointer text-rose-300 hover:text-rose-200 select-none">
                  <span className="font-semibold">Row #{row}</span>
                  <ChevronDown className="size-3.5 text-neutral-400 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] text-[11px] text-neutral-400 font-mono whitespace-pre-wrap">
                  {msg}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-2">
          <div className="flex justify-between text-xs text-[#8e8e93]">
            <span>Importing transaction batch...</span>
            <span className="font-mono text-[#f5cf6d] font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-white/[0.06] [&>div]:bg-[#e5c158]" />
        </div>
      )}

      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
          className="rounded-xl text-[#8e8e93] hover:text-white"
        >
          <ChevronLeft className="size-4 mr-1" />
          Back
        </Button>
        <Button
          onClick={handleImport}
          disabled={isLoading || hasErrors}
          className="cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] active:scale-[0.98] transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            "Confirm & Import"
          )}
        </Button>
      </div>
    </div>
  );
};

export default ConfirmationStep;
