import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
}

export default function BankStatementTab({ onSuccess }: BankStatementTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<
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

  const [parseStatement, { isLoading: isParsing }] =
    useParseBankStatementMutation();
  const [commitTransactions, { isLoading: isCommitting }] =
    useBulkCommitBankTransactionsMutation();

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
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
          setProcessingStage("Cleaning merchant names & setting categories...");
          return prev + 8;
        }
        if (prev < 90) {
          setProcessingStage("Checking for duplicates...");
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
      setProcessingStage("Statement ready for review!");

      setParseResult(res.data);
      setTransactions(
        res.data.transactions.map((t) => ({
          ...t,
          selected: !t.isDuplicate, // auto-select clean new transactions
        }))
      );

      setTimeout(() => {
        setStep("review");
      }, 500);
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
              type:
                t.type === ("INCOME" as any)
                  ? ("EXPENSE" as any)
                  : ("INCOME" as any),
            }
          : t
      )
    );
  };

  const invertAllTypes = () => {
    setTransactions((prev) =>
      prev.map((t) => ({
        ...t,
        type:
          t.type === ("INCOME" as any)
            ? ("EXPENSE" as any)
            : ("INCOME" as any),
      }))
    );
    toast.success("Flipped Credits ↔ Debits for all transactions");
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
      toast.success(
        `Successfully imported ${res.data.importedCount} transactions!`
      );
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(
        error?.data?.message || error?.message || "Failed to commit transactions."
      );
    }
  };

  // Filtered rows for the review table
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
    <div className="space-y-4 text-[#fcfcfc]">
      {/* 1. UPLOAD VIEW */}
      {step === "upload" && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className="group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/[0.12] hover:border-[#e5c158]/70 rounded-2xl bg-white/[0.02] hover:bg-white/[0.04] cursor-pointer transition-all text-center"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="h-12 w-12 rounded-full bg-[#e5c158]/10 group-hover:bg-[#e5c158]/20 text-[#e5c158] flex items-center justify-center mb-3 transition-colors">
              <Building2 className="h-6 w-6" />
            </div>

            {selectedFile ? (
              <div className="space-y-1">
                <Badge className="bg-[#e5c158]/20 text-[#e5c158] border-[#e5c158]/30 px-3 py-1 font-mono text-xs">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </Badge>
                <p className="text-xs text-[#a1a1aa] mt-1">
                  Click to replace or drag a different statement
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  Drop your Bank Statement PDF or CSV here
                </p>
                <p className="text-xs text-[#a1a1aa]">
                  Supports HDFC, SBI, ICICI, Axis, Chase, Kotak & all standard bank statements
                </p>
              </div>
            )}
          </div>

          {/* Password Option for Encrypted PDFs */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-white flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#e5c158]" />
                Statement Password (Optional)
              </Label>
              <span className="text-[10px] text-[#a1a1aa]">
                If your bank PDF is password-protected (e.g. DOB DDMMYYYY / PAN)
              </span>
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter statement password (e.g. 05081995 or ABCD1234E)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/[0.03] border-white/[0.10] text-xs h-9 pr-9 text-white placeholder:text-[#71717a] focus-visible:ring-[#e5c158]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Action Trigger */}
          <Button
            onClick={() => executeParsing()}
            disabled={!selectedFile || isParsing}
            className="w-full h-10 bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] text-black font-semibold text-xs gap-2 cursor-pointer transition-all shadow-[0_4px_16px_rgba(193,160,99,0.28)] hover:brightness-105"
          >
            <Sparkles className="h-4 w-4" />
            Scan & Review Statement
          </Button>
        </div>
      )}

      {/* 2. PROCESSING & PROGRESS SCREEN */}
      {step === "processing" && (
        <div className="py-8 px-4 space-y-6 text-center">
          <div className="h-14 w-14 rounded-full bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/25 flex items-center justify-center mx-auto">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-white">
              Processing Bank Statement
            </h3>
            <p className="text-xs text-[#a1a1aa] flex items-center justify-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#e5c158]" />
              {processingStage}
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <Progress value={currentProgress} className="h-1.5 bg-white/[0.06]" />
            <div className="flex justify-between text-[11px] text-[#a1a1aa]">
              <span>Processing statement</span>
              <span className="text-white font-medium tabular-nums">{currentProgress}%</span>
            </div>
          </div>

          {/* Stepper Status Badges */}
          <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto pt-2 text-[10px]">
            <div
              className={`p-2 rounded-xl border ${
                currentProgress >= 25
                  ? "border-white/[0.12] bg-white/[0.03] text-white"
                  : "border-white/[0.04] text-neutral-600"
              }`}
            >
              1. Upload
            </div>
            <div
              className={`p-2 rounded-xl border ${
                currentProgress >= 50
                  ? "border-white/[0.12] bg-white/[0.03] text-white"
                  : "border-white/[0.04] text-neutral-600"
              }`}
            >
              2. Read File
            </div>
            <div
              className={`p-2 rounded-xl border ${
                currentProgress >= 75
                  ? "border-white/[0.12] bg-white/[0.03] text-white"
                  : "border-white/[0.04] text-neutral-600"
              }`}
            >
              3. Parse Rows
            </div>
            <div
              className={`p-2 rounded-xl border ${
                currentProgress >= 95
                  ? "border-white/[0.12] bg-white/[0.03] text-[#e5c158]"
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
        <div className="p-6 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-white">
              Encrypted Statement Detected
            </h3>
            <p className="text-xs text-[#a1a1aa]">
              This bank PDF is protected by an encryption cipher. Enter your statement password to decrypt it in-memory.
            </p>
          </div>

          <div className="max-w-xs mx-auto space-y-3">
            <Input
              type="password"
              placeholder="PDF Password (e.g. DOB DDMMYYYY / PAN)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/[0.03] border-white/[0.10] text-xs h-9 text-center text-white"
              autoFocus
            />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep("upload")}
                className="flex-1 text-xs border-white/[0.10]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => executeParsing(password)}
                className="flex-1 text-xs bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] text-black font-semibold shadow-md"
              >
                <Unlock className="h-3.5 w-3.5 mr-1" />
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center">
              <p className="text-[10px] text-[#a1a1aa]">Total Found</p>
              <p className="text-base font-semibold text-white">
                {parseResult.totalTransactions}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center">
              <p className="text-[10px] text-[#a1a1aa] flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3 text-[#e5c158]" /> Total Credits
              </p>
              <p className="text-base font-semibold text-[#e5c158] tabular-nums">
                +₹{parseResult.totalIncome.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center">
              <p className="text-[10px] text-[#a1a1aa] flex items-center justify-center gap-1">
                <TrendingDown className="h-3 w-3 text-[#f43f5e]" /> Total Debits
              </p>
              <p className="text-base font-semibold text-[#f43f5e] tabular-nums">
                -₹{parseResult.totalExpense.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-center">
              <p className="text-[10px] text-[#a1a1aa] flex items-center justify-center gap-1">
                <AlertTriangle className="h-3 w-3 text-[#e5c158]" /> Duplicates
              </p>
              <p className="text-base font-semibold text-white tabular-nums">
                {parseResult.duplicateCount} Flagged
              </p>
            </div>
          </div>

          {/* Filtering & Search Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input
                placeholder="Search merchant or narration..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-8 bg-white/[0.03] border-white/[0.08] text-xs h-8 text-white"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={invertAllTypes}
                className="h-7 text-[11px] rounded-lg border-white/[0.08] text-[#a1a1aa] hover:text-white"
                title="Flip credits and debits if statement was inverted"
              >
                <ArrowUpDown className="h-3 w-3 mr-1 text-[#e5c158]" />
                Invert Types
              </Button>
              <Button
                variant={viewFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewFilter("all")}
                className={`h-7 text-[11px] rounded-lg ${
                  viewFilter === "all"
                    ? "bg-[#e5c158] text-black font-semibold"
                    : "border-white/[0.08] text-[#a1a1aa]"
                }`}
              >
                All ({transactions.length})
              </Button>
              <Button
                variant={viewFilter === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewFilter("new")}
                className={`h-7 text-[11px] rounded-lg ${
                  viewFilter === "new"
                    ? "bg-[#e5c158] text-black font-semibold"
                    : "border-white/[0.08] text-[#a1a1aa]"
                }`}
              >
                New Only ({parseResult.newCount})
              </Button>
              {parseResult.duplicateCount > 0 && (
                <Button
                  variant={viewFilter === "duplicates" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewFilter("duplicates")}
                  className={`h-7 text-[11px] rounded-lg ${
                    viewFilter === "duplicates"
                      ? "bg-white/[0.10] text-white font-medium"
                      : "border-white/[0.08] text-[#a1a1aa]"
                  }`}
                >
                  Duplicates ({parseResult.duplicateCount})
                </Button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="rounded-xl border border-white/[0.08] bg-[#0b0b0e] overflow-hidden max-h-[340px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#121216] sticky top-0 border-b border-white/[0.08] z-10">
                <tr className="text-[#a1a1aa] text-[11px]">
                  <th className="p-2.5 pl-3 w-8">
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
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Merchant / Bank Narration</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5 text-right">Amount (Click to Toggle +/-)</th>
                  <th className="p-2.5 text-center">Status</th>
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
                    <td className="p-2.5 pl-3">
                      <Checkbox
                        checked={tx.selected}
                        onCheckedChange={() => toggleSelect(tx.id)}
                      />
                    </td>
                    <td className="p-2.5 font-mono text-[11px] text-[#a1a1aa] whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="p-2.5">
                      <Input
                        value={tx.title}
                        onChange={(e) => handleTitleChange(tx.id, e.target.value)}
                        className="h-6 bg-transparent border-transparent hover:border-white/[0.12] focus:border-[#e5c158] text-xs font-medium text-white p-1"
                      />
                      <p className="text-[10px] font-mono text-neutral-400 truncate max-w-[240px] pl-1">
                        {tx.rawNarration}
                      </p>
                    </td>
                    <td className="p-2.5 whitespace-nowrap">
                      <select
                        value={tx.category}
                        onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                        className="h-6 rounded bg-white/[0.05] border border-white/[0.10] text-[10px] text-white px-1.5 focus:border-[#e5c158] outline-none cursor-pointer capitalize"
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
                    <td className="p-2.5 text-right font-mono font-medium whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleType(tx.id)}
                        title="Click to toggle Income (+) vs Expense (-)"
                        className={`px-1.5 py-0.5 rounded cursor-pointer transition-all hover:bg-white/[0.08] inline-flex items-center gap-0.5 ${
                          tx.type === "INCOME" ? "text-[#e5c158]" : "text-[#f43f5e]"
                        }`}
                      >
                        {tx.type === "INCOME" ? "+" : "-"}₹
                        {tx.amount.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </button>
                    </td>
                    <td className="p-2.5 text-center whitespace-nowrap">
                      {tx.isDuplicate ? (
                        <span
                          title={tx.duplicateReason}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-white/[0.04] text-[#a1a1aa] border border-white/[0.08]"
                        >
                          <AlertTriangle className="h-3 w-3 text-[#e5c158]" /> Duplicate
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-white/[0.04] text-[#fcfcfc] border border-white/[0.08]">
                          <CheckCircle2 className="h-3 w-3 text-[#e5c158]" /> New
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.08]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep("upload")}
              className="text-xs border-white/[0.10]"
            >
              Back to Upload
            </Button>

            <Button
              onClick={handleCommit}
              disabled={selectedCount === 0 || isCommitting}
              size="sm"
              className="bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] text-black font-semibold text-xs gap-2 shadow-[0_4px_16px_rgba(193,160,99,0.28)] hover:brightness-105"
            >
              {isCommitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              Import ({selectedCount}) Transactions
            </Button>
          </div>
        </div>
      )}

      {/* 5. SUCCESS CONFIRMATION */}
      {step === "success" && (
        <div className="py-8 px-4 text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-white/[0.04] text-[#e5c158] border border-white/[0.08] flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">
              Statement Imported Successfully
            </h3>
            <p className="text-xs text-[#a1a1aa]">
              Imported <strong className="text-white font-medium">{importedCount} transactions</strong> into your financial records with zero duplicates.
            </p>
          </div>

          <Button
            onClick={() => onSuccess()}
            className="bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] text-black font-semibold text-xs shadow-md"
          >
            View Updated Transactions
          </Button>
        </div>
      )}
    </div>
  );
}
