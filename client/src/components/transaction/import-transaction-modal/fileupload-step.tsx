import { useState, useRef } from "react";
import { toast } from "sonner";
import { usePapaParse } from "react-papaparse";
import { FileSpreadsheet, FileCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MAX_FILE_SIZE, MAX_IMPORT_LIMIT } from "@/constant";
import { useProgressLoader } from "@/hooks/use-progress-loader";

interface CsvRow {
  [key: string]: string | undefined;
}

type FileUploadStepProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFileUpload: (file: File, columns: any[], data: any[]) => void;
  onCancel?: () => void;
};

const FileUploadStep = ({ onFileUpload, onCancel }: FileUploadStepProps) => {
  const { readString } = usePapaParse();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const {
    progress,
    isLoading,
    startProgress,
    updateProgress,
    doneProgress,
    resetProgress,
  } = useProgressLoader({ initialProgress: 10, completionDelay: 500 });

  const processFile = async (file: File) => {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv") && file.type !== "text/csv") {
      toast.error("Please upload a valid .csv file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(
        `File size exceeds the limit of ${MAX_FILE_SIZE / 1024 / 1024} MB`
      );
      return;
    }

    setSelectedFileName(file.name);
    resetProgress();
    startProgress();

    try {
      const fileText = await file.text();
      readString<CsvRow>(fileText, {
        header: true,
        skipEmptyLines: true,
        fastMode: true,
        complete: (results) => {
          if (results.data.length > MAX_IMPORT_LIMIT) {
            toast.error(
              `You can only import up to ${MAX_IMPORT_LIMIT} transactions.`
            );
            resetProgress();
            return;
          }

          updateProgress(50);

          const columns =
            results.meta.fields?.map((name: string) => ({
              id: name,
              name,
              sampleData:
                results.data[0]?.[name]?.slice(0, MAX_IMPORT_LIMIT) || "",
            })) || [];

          doneProgress();

          setTimeout(() => {
            onFileUpload(file, columns, results.data);
          }, 400);
        },
        error: (error) => {
          console.error("Error parsing CSV:", error);
          toast.error("Failed to parse CSV file.");
          resetProgress();
        },
      });
    } catch (error) {
      console.error("Error reading file:", error);
      toast.error("Error reading the selected file.");
      resetProgress();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 sm:p-7 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center select-none flex flex-col items-center justify-center ${
          isDragging
            ? "border-[#e5c158] bg-[#e5c158]/10"
            : selectedFileName
              ? "border-[#e5c158]/50 bg-[#e5c158]/[0.04]"
              : "border-white/[0.12] bg-[#141419]/60 hover:bg-[#181820] hover:border-white/[0.25]"
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />

        <div className="h-12 w-12 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/20 flex items-center justify-center mb-3">
          <FileSpreadsheet className="size-6 text-[#e5c158]" />
        </div>

        {selectedFileName ? (
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#e5c158]/15 border border-[#e5c158]/30 text-[#f5cf6d] text-xs font-mono font-medium">
              <FileCheck className="size-4 text-[#e5c158]" />
              <span className="truncate max-w-[240px]">{selectedFileName}</span>
            </div>
            <p className="text-xs text-[#8e8e93]">Click or drag to choose another CSV</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">Select a CSV spreadsheet</p>
            <p className="text-xs text-[#8e8e93]">
              Supports exports from Excel, Google Sheets, or custom CSV files
            </p>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="p-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] space-y-2">
          <div className="flex justify-between text-xs text-[#8e8e93]">
            <span>Parsing spreadsheet records...</span>
            <span className="font-mono text-[#f5cf6d] font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 bg-white/[0.06] [&>div]:bg-[#e5c158]" />
        </div>
      )}

      <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
        {onCancel && (
          <Button
            variant="ghost"
            onClick={onCancel}
            className="rounded-xl text-[#8e8e93] hover:text-white"
          >
            Cancel
          </Button>
        )}
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] active:scale-[0.98] transition-all"
        >
          <Sparkles className="size-4 mr-1.5" />
          Browse CSV File
        </Button>
      </div>
    </div>
  );
};

export default FileUploadStep;
