import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Handshake,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function SplitsTab() {
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

  // Settle dialog
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
      toast.error("Owed share cannot exceed total bill amount");
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
      toast.success("Split / IOU added");
      setOpen(false);
      setTitle("");
      setCounterpartyName("");
      setTotalAmount("");
      setCounterpartyShare("");
      setNotes("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to add split"));
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
      toast.success("Settled cleanly!");
      setSettleId(null);
      setSettleAccountId("none");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Settlement failed"));
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSplit(id).unwrap();
      toast.success("Split removed");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Delete failed"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#8e8e93]">
              Owed To You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">
              +{formatCurrency(summary?.totalOwedToMe || 0, { currency })}
            </div>
            <p className="text-[11px] text-[#8e8e93] mt-1">
              Money friends owe you
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#8e8e93]">
              You Owe Others
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400 tabular-nums">
              -{formatCurrency(summary?.totalIOwe || 0, { currency })}
            </div>
            <p className="text-[11px] text-[#8e8e93] mt-1">
              Pending amounts you owe
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#8e8e93]">
              Net Receivable Position
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#e5c158] tabular-nums">
              {formatCurrency(summary?.netReceivable || 0, { currency })}
            </div>
            <p className="text-[11px] text-[#8e8e93] mt-1">
              {summary?.pendingCount || 0} open items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header + Add Split */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Split Bills &amp; IOUs
          </h3>
          <p className="text-xs text-[#8e8e93]">
            Track shared dinners, trips, and personal loans with 1-click ledger settlement.
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl cursor-pointer">
              <Plus className="h-4 w-4 mr-1" />
              New Split / IOU
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0e0e13] border-white/[0.1] text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record Split Expense or IOU</DialogTitle>
              <DialogDescription className="text-[#8e8e93]">
                Track who owes whom without skewing your personal spend analytics.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">Direction</Label>
                <Select
                  value={direction}
                  onValueChange={(v) => setDirection(v as "OWED_TO_ME" | "I_OWE")}
                >
                  <SelectTrigger className="bg-black/40 border-white/[0.1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OWED_TO_ME">
                      They owe me (I paid / lent)
                    </SelectItem>
                    <SelectItem value="I_OWE">
                      I owe them (They paid / I borrowed)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Title</Label>
                  <Input
                    placeholder="Goa Dinner Split"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-black/40 border-white/[0.1]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Person Name</Label>
                  <Input
                    placeholder="Rohan"
                    value={counterpartyName}
                    onChange={(e) => setCounterpartyName(e.target.value)}
                    className="bg-black/40 border-white/[0.1]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">
                    Total Bill Amount
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="3000"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="bg-black/40 border-white/[0.1]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">
                    Owed Share
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="1500"
                    value={counterpartyShare}
                    onChange={(e) => setCounterpartyShare(e.target.value)}
                    className="bg-black/40 border-white/[0.1]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">Notes (Optional)</Label>
                <Input
                  placeholder="Split 50/50"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-black/40 border-white/[0.1]"
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
                  Save Split / IOU
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Splits List */}
      {isLoading ? (
        <div className="text-xs text-[#8e8e93]">Loading splits...</div>
      ) : splits.length === 0 ? (
        <Card className="bg-[#0e0e13]/60 border-dashed border-white/[0.12] rounded-2xl">
          <CardContent className="py-10 text-center space-y-2">
            <Handshake className="h-7 w-7 mx-auto text-[#e5c158]/70" />
            <div className="text-sm font-medium text-white">
              All settled — zero open IOUs
            </div>
            <p className="text-xs text-[#8e8e93]">
              Add shared bills or loans to track repayments cleanly.
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
                className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl"
              >
                <CardContent className="py-4 px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSettled
                          ? "bg-white/[0.04] border-white/[0.1] text-[#8e8e93]"
                          : isOwedToMe
                            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                            : "bg-rose-500/15 border-rose-500/30 text-rose-400"
                      }`}
                    >
                      {isSettled ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : isOwedToMe ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">
                          {s.title}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                            isSettled
                              ? "bg-white/[0.05] text-[#8e8e93] border-white/[0.1]"
                              : isOwedToMe
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/25"
                          }`}
                        >
                          {isSettled
                            ? "Settled"
                            : isOwedToMe
                              ? `${s.counterpartyName} owes you`
                              : `You owe ${s.counterpartyName}`}
                        </span>
                      </div>
                      <p className="text-xs text-[#8e8e93] mt-0.5">
                        Total Bill: {formatCurrency(s.totalAmount, { currency })} •
                        Share: {formatCurrency(s.counterpartyShare, { currency })}
                        {s.notes ? ` • ${s.notes}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <div className="text-right">
                      <div
                        className={`text-base font-bold tabular-nums ${
                          isSettled
                            ? "text-[#8e8e93] line-through"
                            : isOwedToMe
                              ? "text-emerald-400"
                              : "text-rose-400"
                        }`}
                      >
                        {formatCurrency(
                          isSettled ? s.counterpartyShare : remaining,
                          { currency }
                        )}
                      </div>
                    </div>

                    {!isSettled && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSettleId(s._id)}
                        className="rounded-xl border-[#e5c158]/30 bg-[#e5c158]/10 text-[#e5c158] hover:bg-[#e5c158]/20 text-xs cursor-pointer"
                      >
                        Settle Up
                      </Button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(s._id)}
                      className="p-1.5 rounded-lg text-[#8e8e93] hover:text-rose-400 hover:bg-white/[0.06] cursor-pointer"
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
        <DialogContent className="bg-[#0e0e13] border-white/[0.1] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm Settlement</DialogTitle>
            <DialogDescription className="text-[#8e8e93]">
              Mark this IOU settled and optionally log the settlement to your ledger.
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
              Record settlement transaction in cryptographic ledger
            </label>

            {logLedgerTx && accounts.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">
                  Linked Account (Optional)
                </Label>
                <Select
                  value={settleAccountId}
                  onValueChange={setSettleAccountId}
                >
                  <SelectTrigger className="bg-black/40 border-white/[0.1]">
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
                Mark as Settled
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
