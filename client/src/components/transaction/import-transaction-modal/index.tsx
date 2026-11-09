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

const ImportTransactionModal = () => {
  const [activeMode, setActiveMode] = useState<"statement" | "csv">("statement");
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
      setStep(3); // Skip mapping step completely if perfect match
    } else {
      setMappings(autoMappings); // Pre-fill what we found
      setStep(2);
    }
  };

  const resetImport = () => {
    setFile(null);
    setCsvColumns([]);
    setMappings({});
    setStep(1);
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
        return <FileUploadStep onFileUpload={handleFileUpload} />;
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        className="!cursor-pointer border-white/[0.12] bg-white/[0.03] hover:bg-white/[0.06] text-white hover:text-[#e5c158] hover:border-[#c1a063]/40 gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
        onClick={() => setOpen(true)}
      >
        <ImportIcon className="!w-4 !h-4 text-[#e5c158]" />
        Import Statements
      </Button>

      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl obsidian-card bg-[#0e0e13]/95 backdrop-blur-2xl border border-white/[0.09] text-[#f5f5f7] p-6 sm:p-7 max-h-[90vh] overflow-y-auto rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <DialogHeader className="space-y-1 pb-3 border-b border-white/[0.06]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] flex items-center justify-center border border-[#e5c158]/25">
                <ImportIcon className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                  Import Transactions
                </DialogTitle>
                <DialogDescription className="text-xs text-[#8e8e93]">
                  Upload bank statements (PDF or CSV) or map custom spreadsheets
                </DialogDescription>
              </div>
            </div>

            {/* Segmented Tabs */}
            <div className="flex items-center p-1 bg-white/[0.04] backdrop-blur-xl rounded-xl border border-white/[0.08] gap-1 self-start sm:self-auto select-none">
              <button
                type="button"
                onClick={() => setActiveMode("statement")}
                className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  activeMode === "statement"
                    ? "bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] text-black shadow-xs font-semibold"
                    : "text-[#8e8e93] hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                Bank Statement PDF / CSV
              </button>
              <button
                type="button"
                onClick={() => setActiveMode("csv")}
                className={`h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-[0.98] ${
                  activeMode === "csv"
                    ? "bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] text-black shadow-xs font-semibold"
                    : "text-[#8e8e93] hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                <TableProperties className="h-3.5 w-3.5" />
                Manual CSV Mapper
              </button>
            </div>
          </div>
        </DialogHeader>

        <div className="pt-2">
          {activeMode === "statement" ? (
            <BankStatementTab onSuccess={() => handleClose()} />
          ) : (
            renderCsvStep()
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTransactionModal;
