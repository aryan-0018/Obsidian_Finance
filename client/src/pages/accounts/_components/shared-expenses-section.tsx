import { useState } from "react";
import { CheckCircle2, Handshake, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format-currency";
import { getApiErrorMessage } from "@/lib/utils";
import { useTypedSelector } from "@/app/hook";
import {
  useCreateSplitMutation,
  useDeleteSplitMutation,
  useGetAllSplitsQuery,
  useSettleSplitMutation,
} from "@/features/split/splitAPI";
import { useGetAllAccountsQuery } from "@/features/account/accountAPI";

export default function SharedExpensesSection() {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data, isLoading } = useGetAllSplitsQuery();
  const [createSplit, { isLoading: isCreating }] = useCreateSplitMutation();
  const [settleSplit, { isLoading: isSettling }] = useSettleSplitMutation();
  const [deleteSplit] = useDeleteSplitMutation();
  const { data: accountsRes } = useGetAllAccountsQuery();
  const accounts = accountsRes?.accounts || [];

  const splits = data?.splits || [];
  const summary = data?.summary;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [direction, setDirection] = useState<"OWED_TO_ME" | "I_OWE">(
    "OWED_TO_ME"
  );
  const [counterpartyName, setCounterpartyName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [counterpartyShare, setCounterpartyShare] = useState("");
  const [notes, setNotes] = useState("");

  const [settleId, setSettleId] = useState<string | null>(null);
  const [settleAccountId, setSettleAccountId] = useState("none");
  const [logLedgerTx, setLogLedgerTx] = useState(true);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(totalAmount);
    const share = Number(counterpartyShare || totalAmount);
    if (!title.trim() || !counterpartyName.trim() || !total || total <= 0) {
      toast.error("Please fill all required fields");
      return;
    }
    if (share > total) {
      toast.error("Their share cannot exceed the total bill");
      return;
    }

    try {
      await createSplit({
        title: title.trim(),
        direction,
        counterpartyName: counterpartyName.trim(),
        totalAmount: total,
        counterpartyShare: share,
        notes: notes.trim(),
      }).unwrap();
      toast.success("Shared expense added");
      setOpen(false);
      setTitle("");
      setCounterpartyName("");
      setTotalAmount("");
      setCounterpartyShare("");
      setNotes("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to save record"));
    }
  };

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleId) return;
    try {
      await settleSplit({
        id: settleId,
        accountId: settleAccountId === "none" ? null : settleAccountId,
        logTransaction: logLedgerTx,
      }).unwrap();
      toast.success("Marked as settled");
      setSettleId(null);
      setSettleAccountId("none");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Settlement failed"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSplit(id).unwrap();
      toast.success("Record removed");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Delete failed"));
    }
  };

  return (
    <section className="space-y-6 pt-4 border-t border-white/[0.06]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#fcfcfc] tracking-tight">
            Shared Expenses &amp; IOUs
          </h2>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            Owed to you:{" "}
            <span className="text-[#e5c158] font-medium">
              {formatCurrency(summary?.totalOwedToMe || 0, { currency })}
            </span>
            {"  •  "}
            You owe:{" "}
            <span className="text-[#fcfcfc] font-medium">
              {formatCurrency(summary?.totalIOwe || 0, { currency })}
            </span>
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-white/[0.10] bg-white/[0.03] text-[#fcfcfc] hover:text-[#e5c158] hover:border-[#c1a063]/40 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Split
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0e0e13] border-white/[0.08] text-[#fcfcfc] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Shared Expense</DialogTitle>
              <DialogDescription className="text-[#8e8e93]">
                Track a shared bill or personal loan cleanly.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">Type</Label>
                <Select
                  value={direction}
                  onValueChange={(v) => setDirection(v as "OWED_TO_ME" | "I_OWE")}
                >
                  <SelectTrigger className="bg-black/40 border-white/[0.08]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWED_TO_ME">
                      Owed to me (I paid)
                    </SelectItem>
                    <SelectItem value="I_OWE">
                      I owe (Someone else paid)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Description</Label>
                  <Input
                    placeholder="Dinner"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-black/40 border-white/[0.08]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Person</Label>
                  <Input
                    placeholder="Rohan"
                    value={counterpartyName}
                    onChange={(e) => setCounterpartyName(e.target.value)}
                    className="bg-black/40 border-white/[0.08]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Total Bill</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="3000"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="bg-black/40 border-white/[0.08]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Share Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="1500"
                    value={counterpartyShare}
                    onChange={(e) => setCounterpartyShare(e.target.value)}
                    className="bg-black/40 border-white/[0.08]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">Note</Label>
                <Input
                  placeholder="Optional note"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-black/40 border-white/[0.08]"
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="w-full cursor-pointer"
                >
                  {isCreating && (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  )}
                  Save Record
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Splits List */}
      {isLoading ? (
        <div className="text-xs text-[#8e8e93]">Loading records...</div>
      ) : splits.length === 0 ? (
        <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/60 border-dashed border-white/[0.10]">
          <CardContent className="py-10 text-center space-y-2">
            <Handshake className="h-6 w-6 mx-auto text-[#e5c158]/80" />
            <p className="text-sm font-medium text-[#fcfcfc]">
              No pending shared expenses
            </p>
            <p className="text-xs text-[#8e8e93]">
              Keep track of split bills and personal loans here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {splits.map((s) => {
            const isOwedToMe = s.direction === "OWED_TO_ME";
            const isSettled = s.status === "SETTLED";
            const remaining = Math.max(
              0,
              s.counterpartyShare - (s.settledAmount || 0)
            );

            return (
              <Card
                key={s._id}
                className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]"
              >
                <CardContent className="py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-medium text-sm text-[#fcfcfc]">
                        {s.title}
                      </span>
                      <span className="text-[11px] text-[#8e8e93]">
                        {isSettled
                          ? "• Settled"
                          : isOwedToMe
                            ? `• ${s.counterpartyName} owes you`
                            : `• You owe ${s.counterpartyName}`}
                      </span>
                    </div>
                    <p className="text-xs text-[#8e8e93]">
                      Bill total {formatCurrency(s.totalAmount, { currency })}
                      {s.notes ? ` • ${s.notes}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span
                      className={`text-base font-semibold tabular-nums ${
                        isSettled
                          ? "text-[#8e8e93] line-through"
                          : isOwedToMe
                            ? "text-[#e5c158]"
                            : "text-[#f43f5e]"
                      }`}
                    >
                      {formatCurrency(
                        isSettled ? s.counterpartyShare : remaining,
                        { currency }
                      )}
                    </span>

                    {!isSettled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSettleId(s._id)}
                        className="rounded-xl border-white/[0.10] bg-white/[0.03] text-[#fcfcfc] hover:text-[#e5c158] hover:border-[#c1a063]/40 text-xs cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Settle
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(s._id)}
                      className="p-1.5 rounded-lg text-[#8e8e93] hover:text-[#f43f5e] hover:bg-white/[0.05] cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Settle Dialog */}
      <Dialog
        open={Boolean(settleId)}
        onOpenChange={(v) => !v && setSettleId(null)}
      >
        <DialogContent className="bg-[#0e0e13] border-white/[0.08] text-[#fcfcfc] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as Settled</DialogTitle>
            <DialogDescription className="text-[#8e8e93]">
              Optionally record this settlement in your transaction history.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSettle} className="space-y-4">
            <label className="flex items-center gap-2 text-xs text-[#d4d4d8] cursor-pointer">
              <input
                type="checkbox"
                checked={logLedgerTx}
                onChange={(e) => setLogLedgerTx(e.target.checked)}
                className="rounded border-white/20"
              />
              Record settlement as a transaction
            </label>

            {logLedgerTx && accounts.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">Account</Label>
                <Select
                  value={settleAccountId}
                  onValueChange={setSettleAccountId}
                >
                  <SelectTrigger className="bg-black/40 border-white/[0.08]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked account</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={isSettling}
                className="w-full cursor-pointer"
              >
                {isSettling && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                )}
                Confirm Settlement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
