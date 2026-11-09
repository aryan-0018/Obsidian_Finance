import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ScanText,
  Upload,
  Camera,
  CheckCircle2,
  RefreshCw,
  Store,
  Calendar,
  CreditCard,
  Tag,
  Loader2,
  ChevronDown,
  ChevronUp,
  Receipt,
  Copy,
} from "lucide-react";
import { AIScanReceiptData } from "@/features/transaction/transationType";
import { toast } from "sonner";
import { useAiScanReceiptMutation } from "@/features/transaction/transactionAPI";

interface ReceiptScannerProps {
  loadingChange: boolean;
  onScanComplete: (data: AIScanReceiptData) => void;
  onLoadingChange: (isLoading: boolean) => void;
}

const CATEGORY_OPTIONS = [
  "dining",
  "groceries",
  "transportation",
  "utilities",
  "entertainment",
  "shopping",
  "healthcare",
  "travel",
  "housing",
  "investments",
  "other",
];

const ReceiptScanner = ({
  loadingChange,
  onScanComplete,
  onLoadingChange,
}: ReceiptScannerProps) => {
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<AIScanReceiptData | null>(null);
  const [scanStage, setScanStage] = useState<string>("");
  const [progressVal, setProgressVal] = useState<number>(0);
  const [showItems, setShowItems] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [aiScanReceipt] = useAiScanReceiptMutation();

  const processFile = async (file: File) => {
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");

    if (!isImage && !isPdf) {
      toast.error("Please upload an image (JPG, PNG, WEBP) or PDF receipt.");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15MB limit.");
      return;
    }

    // Set preview
    if (isImage) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setReceiptPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }

    const formData = new FormData();
    formData.append("receipt", file);

    onLoadingChange(true);
    setProgressVal(15);
    setScanStage("Scanning receipt image...");

    const progressTimer = setInterval(() => {
      setProgressVal((prev) => {
        if (prev < 45) {
          setScanStage("Reading receipt text...");
          return prev + 12;
        }
        if (prev < 80) {
          setScanStage("Finding store name, items & total...");
          return prev + 8;
        }
        if (prev < 95) {
          setScanStage("Sorting category & payment info...");
          return prev + 2;
        }
        return prev;
      });
    }, 400);

    try {
      const res = await aiScanReceipt(formData).unwrap();
      clearInterval(progressTimer);
      setProgressVal(100);
      setScanStage("Receipt read successfully!");

      const data = res.data;
      setExtractedData(data);
      onScanComplete(data);
      toast.success(`Extracted: ${data.title} (₹${data.amount})`);
    } catch (err: unknown) {
      clearInterval(progressTimer);
      const error = err as { data?: { message?: string }; message?: string };
      const errMsg =
        error?.data?.message ||
        error?.message ||
        "Could not extract receipt details. Please enter manually.";
      toast.error(errMsg);
      setExtractedData(null);
    } finally {
      clearInterval(progressTimer);
      onLoadingChange(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleReset = () => {
    setReceiptPreview(null);
    setExtractedData(null);
    setProgressVal(0);
    setScanStage("");
    setIsEditing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleUpdateField = (field: keyof AIScanReceiptData, val: any) => {
    if (!extractedData) return;
    const updated = { ...extractedData, [field]: val };
    setExtractedData(updated);
    onScanComplete(updated);
  };

  const handleCopyItemsToDescription = () => {
    if (!extractedData?.items || extractedData.items.length === 0) return;
    const lineSummary = extractedData.items
      .map(
        (it) =>
          `${it.quantity && it.quantity > 1 ? `${it.quantity}x ` : ""}${it.name} (₹${it.price})`
      )
      .join(", ");

    const updated = {
      ...extractedData,
      description: lineSummary,
    };
    setExtractedData(updated);
    onScanComplete(updated);
    toast.success("Copied item breakdown to description!");
  };

  return (
    <div className="space-y-3.5 rounded-2xl border border-white/[0.10] bg-white/[0.03] backdrop-blur-md p-4 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-xl bg-[#e5c158]/15 text-[#e5c158] flex items-center justify-center border border-[#e5c158]/25">
            <ScanText className="h-4 w-4" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-white flex items-center gap-1.5">
              Receipt Scanner
              <Badge
                variant="outline"
                className="text-[9px] px-2 py-0.5 h-4.5 rounded-full border-white/[0.08] text-[#a1a1aa] bg-white/[0.03] font-normal"
              >
                Auto-fill
              </Badge>
            </Label>
          </div>
        </div>

        {extractedData && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs text-[#e5c158] hover:underline cursor-pointer"
            >
              {isEditing ? "Done Editing" : "Edit Values"}
            </button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 text-xs text-[#a1a1aa] hover:text-white rounded-lg px-2.5"
            >
              <RefreshCw className="h-3 w-3 mr-1.5" />
              Scan Another
            </Button>
          </div>
        )}
      </div>

      {/* Main Drag-Drop or Scanning Area */}
      {!loadingChange && !extractedData && (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="group relative flex flex-col items-center justify-center p-5 border border-dashed border-white/[0.12] hover:border-[#e5c158]/70 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 text-center select-none"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="h-10 w-10 rounded-2xl bg-[#e5c158]/10 group-hover:bg-[#e5c158]/20 text-[#e5c158] flex items-center justify-center mb-2 transition-colors border border-[#e5c158]/25 shadow-xs">
            <Upload className="h-4.5 w-4.5" />
          </div>

          <p className="text-xs font-semibold text-white">
            Drag & drop receipt photo or use options below
          </p>
          <p className="text-[10px] text-[#8e8e93] mt-0.5 font-normal">
            JPG, PNG, WEBP, PDF up to 15MB • Auto-detects store, amount, items & date
          </p>

          <div className="flex items-center gap-2 mt-3.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] border border-white/[0.10] text-xs font-medium text-white transition-all cursor-pointer active:scale-95"
            >
              <Upload className="h-3.5 w-3.5 text-[#e5c158]" />
              Browse File
            </button>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e5c158]/15 hover:bg-[#e5c158]/25 border border-[#e5c158]/35 text-xs font-medium text-[#e5c158] transition-all cursor-pointer active:scale-95"
            >
              <Camera className="h-3.5 w-3.5" />
              Take Photo
            </button>
          </div>
        </div>
      )}

      {/* Active Scanning Progress Screen */}
      {loadingChange && (
        <div className="rounded-xl border border-white/[0.08] bg-[#0b0b0e] p-4 space-y-3.5 shadow-sm">
          <div className="flex items-center gap-3.5">
            {receiptPreview ? (
              <div className="relative h-16 w-16 shrink-0 rounded-xl border border-white/[0.08] overflow-hidden bg-black">
                <img
                  src={receiptPreview}
                  alt="Receipt"
                  className="h-full w-full object-cover opacity-90"
                />
              </div>
            ) : (
              <div className="h-16 w-16 shrink-0 rounded-xl border border-[#e5c158]/20 bg-[#e5c158]/5 flex items-center justify-center text-[#e5c158]">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-white flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 text-[#e5c158] animate-spin" />
                  {scanStage}
                </span>
                <span className="text-xs font-mono text-[#e5c158]">
                  {progressVal}%
                </span>
              </div>
              <Progress value={progressVal} className="h-1.5 rounded-full bg-white/[0.06]" />
            </div>
          </div>
        </div>
      )}

      {/* Extracted Receipt Summary Card */}
      {extractedData && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#e5c158]" />
              <span className="text-xs font-semibold text-white">Receipt Details Extracted</span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                <span className="size-1 rounded-full bg-emerald-400 animate-pulse" />
                Auto-filled
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {extractedData.confidence && (
                <span className="text-[10px] text-[#e5c158] bg-[#e5c158]/10 px-2 py-0.5 rounded-full border border-[#e5c158]/20 font-medium hidden sm:inline">
                  {extractedData.confidence} Confidence
                </span>
              )}
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-[#e5c158]">₹</span>
                  <Input
                    type="number"
                    value={extractedData.amount}
                    onChange={(e) => handleUpdateField("amount", parseFloat(e.target.value) || 0)}
                    className="h-7 w-24 bg-white/[0.05] border-white/[0.15] text-xs font-mono font-semibold text-[#e5c158]"
                  />
                </div>
              ) : (
                <Badge className="bg-white/[0.05] text-[#e5c158] border border-white/[0.08] text-xs tabular-nums font-semibold px-2.5 py-0.5 rounded-full">
                  ₹{Number(extractedData.amount).toLocaleString("en-IN")}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            {receiptPreview && (
              <div className="relative h-14 w-14 shrink-0 rounded-lg border border-white/[0.10] overflow-hidden bg-black">
                <img
                  src={receiptPreview}
                  alt="Receipt Preview"
                  className="h-full w-full object-cover opacity-80"
                />
              </div>
            )}

            <div className="flex-1 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#a1a1aa]">
                <Store className="h-3.5 w-3.5 text-[#e5c158] shrink-0" />
                {isEditing ? (
                  <Input
                    value={extractedData.title}
                    onChange={(e) => handleUpdateField("title", e.target.value)}
                    className="h-6 bg-white/[0.05] border-white/[0.10] text-xs text-white"
                  />
                ) : (
                  <span className="truncate text-white font-medium">{extractedData.title}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[#a1a1aa]">
                <Calendar className="h-3.5 w-3.5 text-[#e5c158] shrink-0" />
                {isEditing ? (
                  <Input
                    type="date"
                    value={extractedData.date}
                    onChange={(e) => handleUpdateField("date", e.target.value)}
                    className="h-6 bg-white/[0.05] border-white/[0.10] text-xs text-white font-mono"
                  />
                ) : (
                  <span className="text-white font-mono">{extractedData.date}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[#a1a1aa]">
                <Tag className="h-3.5 w-3.5 text-[#e5c158] shrink-0" />
                {isEditing ? (
                  <select
                    value={extractedData.category?.toLowerCase()}
                    onChange={(e) => handleUpdateField("category", e.target.value)}
                    className="h-6 rounded bg-white/[0.05] border border-white/[0.10] text-xs text-white px-1.5 focus:border-[#e5c158] outline-none capitalize"
                  >
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c} className="bg-[#121216] text-white capitalize">
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="capitalize text-white">{extractedData.category}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[#a1a1aa]">
                <CreditCard className="h-3.5 w-3.5 text-[#e5c158] shrink-0" />
                <span className="text-white">{extractedData.paymentMethod}</span>
              </div>
            </div>
          </div>

          {/* Subtotal & Tax Breakdown Strip if present */}
          {(Number(extractedData.tax || 0) > 0 || Number(extractedData.discount || 0) > 0) && (
            <div className="flex items-center justify-between text-[11px] text-[#a1a1aa] pt-2 border-t border-white/[0.06] px-1">
              {Number(extractedData.subtotal || 0) > 0 && (
                <span>Subtotal: ₹{Number(extractedData.subtotal).toLocaleString("en-IN")}</span>
              )}
              {Number(extractedData.tax || 0) > 0 && (
                <span className="text-[#a1a1aa]">Tax / GST: +₹{Number(extractedData.tax).toLocaleString("en-IN")}</span>
              )}
              {Number(extractedData.discount || 0) > 0 && (
                <span className="text-emerald-400">Discount: -₹{Number(extractedData.discount).toLocaleString("en-IN")}</span>
              )}
            </div>
          )}

          {/* Itemized Line Items Accordion if extracted */}
          {extractedData.items && extractedData.items.length > 0 && (
            <div className="pt-1 border-t border-white/[0.06]">
              <div className="flex items-center justify-between py-1">
                <button
                  type="button"
                  onClick={() => setShowItems(!showItems)}
                  className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
                >
                  <Receipt className="h-3 w-3 text-[#e5c158]" />
                  <span className="font-medium">
                    Itemized Breakdown ({extractedData.items.length} items found)
                  </span>
                  {showItems ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={handleCopyItemsToDescription}
                  className="inline-flex items-center gap-1 text-[10px] text-[#e5c158] hover:text-[#f4d068] transition-colors cursor-pointer"
                  title="Copy items into transaction description"
                >
                  <Copy className="h-3 w-3" />
                  Copy to Note
                </button>
              </div>

              {showItems && (
                <div className="space-y-1 pt-1.5 max-h-36 overflow-y-auto pr-1">
                  {extractedData.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-[11px] py-1 px-2 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                    >
                      <span className="text-neutral-200 truncate flex-1 pr-2">
                        {it.name} {it.quantity && it.quantity > 1 ? `(x${it.quantity})` : ""}
                      </span>
                      <span className="font-mono text-[#e5c158] font-medium shrink-0">
                        ₹{Number(it.price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReceiptScanner;
