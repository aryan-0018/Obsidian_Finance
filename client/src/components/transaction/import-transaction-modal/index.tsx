import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImportIcon, Building2, TableProperties } from "lucide-react";
import FileUploadStep from "./fileupload-step";
import ColumnMappingStep from "./column-mapping-step";
import { CsvColumn, TransactionField } from "@/@types/transaction.type";
import ConfirmationStep from "./confirmation-step";
import BankStatementTab from "./bank-statement-tab";
import { cn } from "@/lib/utils";

const ImportTransactionModal = () => {
  const [activeMode, setActiveMode] = useState<"statement" | "csv">("statement");
  const [statementStep, setStatementStep] = useState<
    "upload" | "processing" | "password_prompt" | "review" | "success"
  >("upload");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<CsvColumn[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [csvData, setCsvData] = useState<Record<string, any>[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ modal?: string }>;
      if (customEvent.detail?.modal === "IMPORT_STATEMENT") {
        setOpen(true);
      }
    };
    window.addEventListener("obsidian:open-modal", handleOpen);
    return () => window.removeEventListener("obsidian:open-modal", handleOpen);
  }, []);

  const transactionFields: TransactionField[] = [
    { fieldName: "title", required: true },
    { fieldName: "amount", required: true },
    { fieldName: "type", required: true },
    { fieldName: "date", required: true },
    { fieldName: "category", required: true },
    { fieldName: "paymentMethod", required: true },
    { fieldName: "description", required: false },
  ];

  const handleFileUpload = (
    file: File,
    columns: CsvColumn[],
    data: Record<string, unknown>[]
  ) => {
    setFile(file);
    setCsvColumns(columns);
    setCsvData(data);

    // Auto-map logic to make importing simpler
    const autoMappings: Record<string, string> = {};

    columns.forEach((col) => {
      const colLower = col.name.toLowerCase().trim();
      const matchedField = transactionFields.find(
        (f) => f.fieldName.toLowerCase() === colLower
      );
      if (matchedField) {
        autoMappings[col.name] = matchedField.fieldName;
      }
    });

    const requiredFields = transactionFields.filter((f) => f.required);
    const hasAllRequired = requiredFields.every((req) =>
      Object.values(autoMappings).includes(req.fieldName)
    );

    if (hasAllRequired) {
      setMappings(autoMappings);
      setStep(3);
    } else {
      setMappings(autoMappings);
      setStep(2);
    }
  };

  const resetImport = () => {
    setFile(null);
    setCsvColumns([]);
    setMappings({});
    setStep(1);
    setStatementStep("upload");
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => resetImport(), 300);
  };

  const handleMappingComplete = (mappings: Record<string, string>) => {
    setMappings(mappings);
    setStep(3);
  };

  const handleBack = (step: 1 | 2 | 3) => {
    setStep(step);
  };

  const renderCsvStep = () => {
    switch (step) {
      case 1:
        return (
          <FileUploadStep
            onFileUpload={handleFileUpload}
            onCancel={handleClose}
          />
        );
      case 2:
        return (
          <ColumnMappingStep
            csvColumns={csvColumns}
            mappings={mappings}
            transactionFields={transactionFields}
            onComplete={handleMappingComplete}
            onBack={() => handleBack(1)}
          />
        );
      case 3:
        return (
          <ConfirmationStep
            file={file}
            mappings={mappings}
            csvData={csvData}
            onBack={() => handleBack(2)}
            onComplete={() => handleClose()}
          />
        );
      default:
        return null;
    }
  };

  const modalWidth =
    activeMode === "statement" && statementStep === "review"
      ? "sm:max-w-4xl"
      : activeMode === "csv" && step === 2
        ? "sm:max-w-2xl"
        : activeMode === "csv" && step === 3
          ? "sm:max-w-xl"
          : "sm:max-w-[480px]";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        className="gap-2 rounded-xl border-white/[0.10] bg-white/[0.03] text-white hover:text-[#e5c158] hover:border-[#e5c158]/40 active:scale-[0.98] transition-all cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <ImportIcon className="size-4 text-[#e5c158]" />
        <span>Import</span>
      </Button>

      <DialogContent
        className={cn(
          "w-[calc(100vw-2rem)] obsidian-card rounded-3xl bg-[#0e0e13]/95 backdrop-blur-2xl border border-white/[0.09] text-white shadow-[0_32px_64px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] p-6 sm:p-7 max-h-[90vh] overflow-y-auto transition-all duration-300",
          modalWidth
        )}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/20">
              <ImportIcon className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                Import Transactions
              </DialogTitle>
              <DialogDescription className="text-[#8e8e93] text-xs font-normal">
                Upload bank statements or map custom spreadsheets.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Spacious Mode Switcher Pill */}
          {statementStep !== "review" && (
            <div className="p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] grid grid-cols-2 gap-1 select-none">
              <button
                type="button"
                onClick={() => setActiveMode("statement")}
                className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeMode === "statement"
                    ? "bg-[#181820] text-white border border-white/[0.12] shadow-sm"
                    : "text-[#8e8e93] hover:text-white"
                }`}
              >
                <Building2 className={`size-3.5 ${activeMode === "statement" ? "text-[#e5c158]" : "text-neutral-500"}`} />
                <span>Bank Statement</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("csv")}
                className={`h-9 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeMode === "csv"
                    ? "bg-[#181820] text-white border border-white/[0.12] shadow-sm"
                    : "text-[#8e8e93] hover:text-white"
                }`}
              >
                <TableProperties className={`size-3.5 ${activeMode === "csv" ? "text-[#e5c158]" : "text-neutral-500"}`} />
                <span>CSV Mapper</span>
              </button>
            </div>
          )}

          {/* Stepper for CSV Mode (shown only when in step 2 or 3) */}
          {activeMode === "csv" && step > 1 && (
            <div className="flex items-center justify-center gap-2 py-1 text-xs">
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all ${
                  step === 2
                    ? "bg-[#e5c158]/15 text-[#f5cf6d] font-semibold border border-[#e5c158]/30"
                    : "text-neutral-300"
                }`}
              >
                <span className="h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] bg-white/[0.15] text-white">
                  ✓
                </span>
                <span>Upload</span>
              </div>
              <div className="w-4 h-px bg-white/[0.10]" />
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all ${
                  step === 2
                    ? "bg-[#e5c158]/15 text-[#f5cf6d] font-semibold border border-[#e5c158]/30"
                    : step > 2
                      ? "text-neutral-300"
                      : "text-neutral-500"
                }`}
              >
                <span
                  className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] ${
                    step === 2
                      ? "bg-[#e5c158] text-black font-bold"
                      : "bg-white/[0.15] text-white"
                  }`}
                >
                  {step > 2 ? "✓" : "2"}
                </span>
                <span>Map Columns</span>
              </div>
              <div className="w-4 h-px bg-white/[0.10]" />
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl transition-all ${
                  step === 3
                    ? "bg-[#e5c158]/15 text-[#f5cf6d] font-semibold border border-[#e5c158]/30"
                    : "text-neutral-500"
                }`}
              >
                <span
                  className={`h-4.5 w-4.5 rounded-full flex items-center justify-center text-[10px] ${
                    step === 3
                      ? "bg-[#e5c158] text-black font-bold"
                      : "bg-white/[0.05] text-neutral-500"
                  }`}
                >
                  3
                </span>
                <span>Confirm</span>
              </div>
            </div>
          )}

          <div>
            {activeMode === "statement" ? (
              <BankStatementTab
                onSuccess={() => handleClose()}
                onStepChange={setStatementStep}
                onCancel={handleClose}
              />
            ) : (
              renderCsvStep()
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTransactionModal;
