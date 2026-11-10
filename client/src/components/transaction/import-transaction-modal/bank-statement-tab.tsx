import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Eye,
  EyeOff,
  Sparkles,
  Building2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Loader2,
  ArrowUpDown,
  FileCheck,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";
import {
  useParseBankStatementMutation,
  useBulkCommitBankTransactionsMutation,
} from "@/features/transaction/transactionAPI";
import {
  BankStatementParseResponse,
  ParsedBankTransaction,
} from "@/features/transaction/transationType";

interface BankStatementTabProps {
  onSuccess: () => void;
  onStepChange?: (step: "upload" | "processing" | "password_prompt" | "review" | "success") => void;
  onCancel?: () => void;
}

export default function BankStatementTab({ onSuccess, onStepChange, onCancel }: BankStatementTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStepInternal] = useState<
    "upload" | "processing" | "password_prompt" | "review" | "success"
  >("upload");
  const [currentProgress, setCurrentProgress] = useState(10);
  const [processingStage, setProcessingStage] = useState("");
  const [parseResult, setParseResult] = useState<
    BankStatementParseResponse["data"] | null
  >(null);
  const [transactions, setTransactions] = useState<ParsedBankTransaction[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [viewFilter, setViewFilter] = useState<"all" | "new" | "duplicates">("all");
  const [importedCount, setImportedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const setStep = (newStep: "upload" | "processing" | "password_prompt" | "review" | "success") => {
    setStepInternal(newStep);
    onStepChange?.(newStep);
  };

  const [parseStatement, { isLoading: isParsing }] =
    useParseBankStatementMutation();
  const [commitTransactions, { isLoading: isCommitting }] =
    useBulkCommitBankTransactionsMutation();

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    const isAllowed =
      file.type === "application/pdf" ||
      file.type === "text/csv" ||
      file.name.match(/\.(pdf|csv|txt)$/i);

    if (!isAllowed) {
      toast.error("Please upload a PDF or CSV bank statement.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("File exceeds 25MB maximum limit.");
      return;
    }

    setSelectedFile(file);
  };

  const executeParsing = async (passToUse?: string) => {
    if (!selectedFile) {
      toast.error("Please choose a statement file to upload.");
      return;
    }

    setStep("processing");
    setCurrentProgress(15);
    setProcessingStage("Uploading statement...");

    const progressTimer = setInterval(() => {
      setCurrentProgress((prev) => {
        if (prev < 40) {
          setProcessingStage("Reading statement entries...");
          return prev + 10;
        }
        if (prev < 70) {
          setProcessingStage("Cleaning merchant names & matching categories...");
          return prev + 8;
        }
        if (prev < 90) {
          setProcessingStage("Verifying against existing records...");
          return prev + 4;
        }
        return prev;
      });
    }, 450);

    const formData = new FormData();
    formData.append("statement", selectedFile);
    const pwd = passToUse !== undefined ? passToUse : password;
    if (pwd) {
      formData.append("password", pwd.trim());
    }

    try {
      const res = await parseStatement(formData).unwrap();
      clearInterval(progressTimer);
      setCurrentProgress(100);
      setProcessingStage("Statement parsed successfully!");

      setParseResult(res.data);
      setTransactions(
        res.data.transactions.map((t) => ({
          ...t,
          selected: !t.isDuplicate,
        }))
      );

      setTimeout(() => {
        setStep("review");
      }, 400);
    } catch (err: unknown) {
      clearInterval(progressTimer);
      const error = err as { data?: { message?: string }; message?: string };
      const errMsg =
        error?.data?.message || error?.message || "Failed to parse bank statement.";

      if (
        errMsg.toLowerCase().includes("password") ||
        errMsg.toLowerCase().includes("encrypted")
      ) {
        setStep("password_prompt");
        toast.error(errMsg);
      } else {
        setStep("upload");
        toast.error(errMsg);
      }
    }
  };

  const toggleSelect = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const selectAllNew = (select: boolean) => {
    setTransactions((prev) =>
      prev.map((t) => (!t.isDuplicate ? { ...t, selected: select } : t))
    );
  };

  const handleTitleChange = (id: string, newTitle: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, title: newTitle } : t))
    );
  };

  const handleCategoryChange = (id: string, newCategory: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category: newCategory } : t))
    );
  };

  const handleToggleType = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: t.type === ("INCOME" as any) ? ("EXPENSE" as any) : ("INCOME" as any),
            }
          : t
      )
    );
  };

  const invertAllTypes = () => {
    setTransactions((prev) =>
      prev.map((t) => ({
        ...t,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: t.type === ("INCOME" as any) ? ("EXPENSE" as any) : ("INCOME" as any),
      }))
    );
    toast.success("Inverted Credits ↔ Debits for all entries");
  };

  const handleCommit = async () => {
    const selected = transactions.filter((t) => t.selected);
    if (selected.length === 0) {
      toast.error("Please select at least one transaction to import.");
      return;
    }

    try {
      const payload = selected.map((t) => ({
        title: t.title,
        amount: t.amount,
        type: t.type,
        category: t.category,
        paymentMethod: t.paymentMethod,
        date: t.date,
        description: t.rawNarration ? `Statement: ${t.rawNarration}` : "Bank Import",
      }));

      const res = await commitTransactions({ transactions: payload }).unwrap();
      setImportedCount(res.data.importedCount);
      setStep("success");
      toast.success(`Successfully imported ${res.data.importedCount} transactions`);
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(
        error?.data?.message || error?.message || "Failed to commit transactions."
      );
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.rawNarration.toLowerCase().includes(searchFilter.toLowerCase()) ||
      t.category.toLowerCase().includes(searchFilter.toLowerCase());

    if (!matchesSearch) return false;

    if (viewFilter === "new") return !t.isDuplicate;
    if (viewFilter === "duplicates") return t.isDuplicate;
    return true;
  });

  const selectedCount = transactions.filter((t) => t.selected).length;

  return (
    <div className="space-y-4">
      {/* 1. UPLOAD VIEW */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* Dropzone Card */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 sm:p-7 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center select-none flex flex-col items-center justify-center ${
              isDragging
                ? "border-[#e5c158] bg-[#e5c158]/10"
                : selectedFile
                  ? "border-[#e5c158]/50 bg-[#e5c158]/[0.04]"
                  : "border-white/[0.12] bg-[#141419]/60 hover:bg-[#181820] hover:border-white/[0.25]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="h-12 w-12 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/20 flex items-center justify-center mb-3">
              <Building2 className="size-6 text-[#e5c158]" />
            </div>

            {selectedFile ? (
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#e5c158]/15 border border-[#e5c158]/30 text-[#f5cf6d] text-xs font-mono font-medium">
                  <FileCheck className="size-4 text-[#e5c158]" />
                  <span className="truncate max-w-[240px]">{selectedFile.name}</span>
                  <span className="text-white/50 text-[11px]">
                    ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <p className="text-xs text-[#8e8e93]">Click or drag to replace statement</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Select a bank statement</p>
                <p className="text-xs text-[#8e8e93]">
                  PDF or CSV from any bank (HDFC, SBI, ICICI, Axis, Chase, etc.)
                </p>
              </div>
            )}
          </div>

          {/* Password Card */}
          <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-300 flex items-center gap-2">
                <Lock className="size-3.5 text-[#e5c158]" />
                Statement Password (Optional)
              </label>
              <span className="text-[11px] text-[#8e8e93]">
                If PDF is password-protected
              </span>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="e.g. DOB (DDMMYYYY) or PAN"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-xl bg-[#161616]/80 border-white/[0.08] text-white focus:ring-[#e5c158] pr-10 text-xs placeholder:text-[#63636e]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-white cursor-pointer"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Action Trigger Buttons */}
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
              onClick={() => executeParsing()}
              disabled={!selectedFile || isParsing}
              className="cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] active:scale-[0.98] transition-all"
            >
              <Sparkles className="size-4 mr-1.5" />
              {isParsing ? "Scanning..." : "Scan & Review"}
            </Button>
          </div>
        </div>
      )}

      {/* 2. PROCESSING & PROGRESS SCREEN */}
      {step === "processing" && (
        <div className="py-8 px-4 space-y-6 text-center">
          <div className="h-14 w-14 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/20 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(229,193,88,0.15)]">
            <ShieldCheck className="h-7 w-7 text-[#e5c158]" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-white tracking-tight">
              Processing Bank Statement
            </h3>
            <p className="text-xs text-[#8e8e93] flex items-center justify-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#e5c158]" />
              {processingStage}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <Progress value={currentProgress} className="h-1.5 bg-white/[0.06] [&>div]:bg-[#e5c158]" />
            <div className="flex justify-between text-[11px] text-[#8e8e93]">
              <span>Parsing ledger lines</span>
              <span className="text-white font-medium font-mono">{currentProgress}%</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto pt-2 text-[10px]">
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                currentProgress >= 25
                  ? "border-[#e5c158]/30 bg-[#e5c158]/10 text-[#e5c158] font-semibold"
                  : "border-white/[0.04] text-neutral-600"
              }`}
            >
              1. Upload
            </div>
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                currentProgress >= 50
                  ? "border-[#e5c158]/30 bg-[#e5c158]/10 text-[#e5c158] font-semibold"
                  : "border-white/[0.04] text-neutral-600"
              }`}
            >
              2. Read File
            </div>
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                currentProgress >= 75
                  ? "border-[#e5c158]/30 bg-[#e5c158]/10 text-[#e5c158] font-semibold"
                  : "border-white/[0.04] text-neutral-600"
              }`}
            >
              3. Parse Rows
            </div>
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                currentProgress >= 95
                  ? "border-[#e5c158]/30 bg-[#e5c158]/10 text-[#e5c158] font-semibold"
                  : "border-white/[0.04] text-neutral-600"
              }`}
            >
              4. Complete
            </div>
          </div>
        </div>
      )}

      {/* 3. PASSWORD REQUIRED PROMPT */}
      {step === "password_prompt" && (
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#141419]/80 space-y-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/20 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">
              Encrypted Statement Detected
            </h3>
            <p className="text-xs text-[#8e8e93] max-w-sm mx-auto">
              This bank PDF is protected by an encryption cipher. Enter your statement password to decrypt it.
            </p>
          </div>

          <div className="max-w-xs mx-auto space-y-3">
            <Input
              type="password"
              placeholder="PDF Password (e.g. DOB or PAN)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10 rounded-xl bg-[#161616]/90 border-white/[0.10] text-xs text-center text-white focus-visible:ring-1 focus-visible:ring-[#e5c158]"
              autoFocus
            />

            <div className="flex gap-2.5">
              <Button
                variant="ghost"
                onClick={() => setStep("upload")}
                className="flex-1 text-xs rounded-xl text-[#8e8e93] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={() => executeParsing(password)}
                className="flex-1 cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] active:scale-[0.98] transition-all text-xs"
              >
                <Unlock className="size-3.5 mr-1" />
                Unlock & Scan
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TRANSACTION REVIEW TABLE */}
      {step === "review" && parseResult && (
        <div className="space-y-4">
          {/* Metric Stats Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-center">
              <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider font-medium">Total Found</p>
              <p className="text-xl font-bold text-white mt-0.5 tabular-nums">
                {parseResult.totalTransactions}
              </p>
            </div>
            <div className="rounded-2xl border border-[#e5c158]/20 bg-[#e5c158]/[0.03] p-3.5 text-center">
              <p className="text-[10px] text-[#e5c158] uppercase tracking-wider font-medium flex items-center justify-center gap-1">
                <TrendingUp className="size-3" /> Total Credits
              </p>
              <p className="text-xl font-bold text-[#f5cf6d] tabular-nums mt-0.5">
                +₹{parseResult.totalIncome.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-3.5 text-center">
              <p className="text-[10px] text-rose-400 uppercase tracking-wider font-medium flex items-center justify-center gap-1">
                <TrendingDown className="size-3" /> Total Debits
              </p>
              <p className="text-xl font-bold text-rose-400 tabular-nums mt-0.5">
                -₹{parseResult.totalExpense.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-center">
              <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider font-medium flex items-center justify-center gap-1">
                <AlertTriangle className="size-3 text-[#e5c158]" /> Duplicates
              </p>
              <p className="text-xl font-bold text-white tabular-nums mt-0.5">
                {parseResult.duplicateCount} <span className="text-xs font-normal text-[#8e8e93]">flagged</span>
              </p>
            </div>
          </div>

          {/* Filtering & Search Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8e8e93]" />
              <Input
                placeholder="Search merchant or narration..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 bg-[#161616]/80 border-white/[0.08] text-xs h-9 text-white rounded-xl placeholder:text-[#63636e] focus:ring-[#e5c158]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={invertAllTypes}
                className="h-8.5 text-xs rounded-xl border-white/[0.12] bg-white/[0.04] text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all cursor-pointer"
                title="Flip credits and debits if statement was inverted"
              >
                <ArrowUpDown className="size-3.5 mr-1.5 text-[#e5c158]" />
                Invert Types
              </Button>
              <Button
                variant={viewFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewFilter("all")}
                className={`h-8.5 text-xs rounded-xl cursor-pointer active:scale-[0.98] transition-all ${
                  viewFilter === "all"
                    ? "font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)]"
                    : "border-white/[0.10] bg-white/[0.03] text-[#8e8e93] hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                All ({transactions.length})
              </Button>
              <Button
                variant={viewFilter === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewFilter("new")}
                className={`h-8.5 text-xs rounded-xl cursor-pointer active:scale-[0.98] transition-all ${
                  viewFilter === "new"
                    ? "font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)]"
                    : "border-white/[0.10] bg-white/[0.03] text-[#8e8e93] hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                New Only ({parseResult.newCount})
              </Button>
              {parseResult.duplicateCount > 0 && (
                <Button
                  variant={viewFilter === "duplicates" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewFilter("duplicates")}
                  className={`h-8.5 text-xs rounded-xl cursor-pointer active:scale-[0.98] transition-all ${
                    viewFilter === "duplicates"
                      ? "bg-white/[0.12] text-white font-semibold border border-white/[0.16]"
                      : "border-white/[0.10] bg-white/[0.03] text-[#8e8e93] hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  Duplicates ({parseResult.duplicateCount})
                </Button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0b0e] overflow-hidden max-h-[380px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#141419] sticky top-0 border-b border-white/[0.08] z-10">
                <tr className="text-[#8e8e93] text-xs font-medium">
                  <th className="p-3 pl-3.5 w-9">
                    <Checkbox
                      checked={
                        selectedCount > 0 &&
                        selectedCount ===
                          transactions.filter((t) => !t.isDuplicate).length
                      }
                      onCheckedChange={(checked) => selectAllNew(!!checked)}
                      title="Select / Unselect All New"
                    />
                  </th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Merchant / Bank Narration</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-white/[0.03] transition-colors ${
                      tx.isDuplicate ? "bg-amber-500/[0.03]" : ""
                    }`}
                  >
                    <td className="p-3 pl-3.5">
                      <Checkbox
                        checked={tx.selected}
                        onCheckedChange={() => toggleSelect(tx.id)}
                      />
                    </td>
                    <td className="p-3 font-mono text-xs text-[#8e8e93] whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="p-3">
                      <Input
                        value={tx.title}
                        onChange={(e) => handleTitleChange(tx.id, e.target.value)}
                        className="h-8 bg-[#161616]/80 border-white/[0.08] text-xs font-medium text-white px-2.5 rounded-lg focus:border-[#e5c158]"
                      />
                      <p className="text-[11px] font-mono text-neutral-400 truncate max-w-[280px] mt-1 pl-0.5">
                        {tx.rawNarration}
                      </p>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <select
                        value={tx.category}
                        onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                        className="h-8 rounded-lg bg-[#161616]/80 border border-white/[0.08] text-xs text-white px-2.5 focus:border-[#e5c158] outline-none cursor-pointer capitalize"
                      >
                        {[
                          "dining",
                          "groceries",
                          "transportation",
                          "utilities",
                          "entertainment",
                          "shopping",
                          "healthcare",
                          "travel",
                          "housing",
                          "income",
                          "investments",
                          "other",
                        ].map((cat) => (
                          <option key={cat} value={cat} className="bg-[#121216] text-white capitalize">
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleType(tx.id)}
                        title="Click to toggle Income (+) vs Expense (-)"
                        className={`h-8 px-2.5 rounded-lg border border-white/[0.08] bg-[#161616]/80 cursor-pointer transition-all hover:bg-white/[0.08] inline-flex items-center gap-1 font-mono text-xs font-semibold ${
                          tx.type === "INCOME" ? "text-[#f5cf6d]" : "text-rose-400"
                        }`}
                      >
                        {tx.type === "INCOME" ? "+" : "-"}₹
                        {tx.amount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </button>
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {tx.isDuplicate ? (
                        <span
                          title={tx.duplicateReason}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        >
                          <AlertTriangle className="size-3 text-amber-400" /> Duplicate
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <CheckCircle2 className="size-3 text-emerald-400" /> New
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
            <Button
              variant="ghost"
              onClick={() => setStep("upload")}
              className="rounded-xl text-[#8e8e93] hover:text-white"
            >
              <ChevronLeft className="size-4 mr-1" /> Back to Upload
            </Button>

            <Button
              onClick={handleCommit}
              disabled={selectedCount === 0 || isCommitting}
              className="cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] active:scale-[0.98] transition-all"
            >
              {isCommitting ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4 mr-1.5" />
              )}
              Import ({selectedCount}) Transactions
            </Button>
          </div>
        </div>
      )}

      {/* 5. SUCCESS CONFIRMATION */}
      {step === "success" && (
        <div className="py-8 px-4 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(16,185,129,0.2)]">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">
              Statement Imported Successfully
            </h3>
            <p className="text-xs text-[#8e8e93]">
              Imported <strong className="text-white font-medium">{importedCount} transactions</strong> into your financial ledger with zero duplicates.
            </p>
          </div>

          <Button
            onClick={() => onSuccess()}
            className="cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] active:scale-[0.98] transition-all text-xs"
          >
            View Updated Transactions
          </Button>
        </div>
      )}
    </div>
  );
}
