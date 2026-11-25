import { useState } from "react";
import { Check, Loader2, Plus, Target, Trash2 } from "lucide-react";
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
  useContributeGoalMutation,
  useCreateGoalMutation,
  useDeleteGoalMutation,
  useGetAllGoalsQuery,
} from "@/features/goal/goalAPI";
import { useGetAllAccountsQuery } from "@/features/account/accountAPI";

export default function GoalsSection() {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data: goalsRes, isLoading } = useGetAllGoalsQuery();
  const [createGoal, { isLoading: isCreating }] = useCreateGoalMutation();
  const [contributeGoal, { isLoading: isContributing }] =
    useContributeGoalMutation();
  const [deleteGoal] = useDeleteGoalMutation();

  const { data: accountsRes } = useGetAllAccountsQuery();
  const accounts = accountsRes?.accounts || [];

  const goals = goalsRes?.goals || [];
  const summary = goalsRes?.summary;

  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalCategory, setGoalCategory] = useState("Reserve");

  const [contribGoalId, setContribGoalId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [contribAccountId, setContribAccountId] = useState("none");

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(goalTarget);
    if (!goalTitle.trim() || !target || target <= 0) {
      toast.error("Enter a title and target amount");
      return;
    }
    try {
      await createGoal({
        title: goalTitle.trim(),
        targetAmount: target,
        currentAmount: Number(goalCurrent) || 0,
        category: goalCategory,
      }).unwrap();
      toast.success("Savings goal added");
      setGoalOpen(false);
      setGoalTitle("");
      setGoalTarget("");
      setGoalCurrent("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to create goal"));
    }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contribGoalId) return;
    const amt = Number(contribAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    try {
      await contributeGoal({
        id: contribGoalId,
        amount: amt,
        action: "DEPOSIT",
        accountId: contribAccountId === "none" ? null : contribAccountId,
      }).unwrap();
      toast.success("Goal updated");
      setContribGoalId(null);
      setContribAmount("");
      setContribAccountId("none");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Contribution failed"));
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await deleteGoal(id).unwrap();
      toast.success("Goal removed");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Delete failed"));
    }
  };

  return (
    <section className="space-y-6 pt-4 border-t border-white/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#fcfcfc] tracking-tight">
            Savings Goals
          </h2>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            Saved{" "}
            <span className="text-[#e5c158] font-medium">
              {formatCurrency(summary?.totalSaved || 0, { currency })}
            </span>{" "}
            of {formatCurrency(summary?.totalTarget || 0, { currency })}
          </p>
        </div>

        <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-white/[0.10] bg-white/[0.03] text-[#fcfcfc] hover:text-[#e5c158] hover:border-[#c1a063]/40 cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0e0e13] border-white/[0.08] text-[#fcfcfc] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>New Savings Goal</DialogTitle>
              <DialogDescription className="text-[#8e8e93]">
                Set a target for reserves, travel, or major purchases.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">Goal Name</Label>
                <Input
                  placeholder="Emergency Reserve"
                  value={goalTitle}
                  onChange={(e) => setGoalTitle(e.target.value)}
                  className="bg-black/40 border-white/[0.08]"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Target</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="300000"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="bg-black/40 border-white/[0.08]"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Already Saved</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="bg-black/40 border-white/[0.08]"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">Category</Label>
                <Input
                  placeholder="Reserve / Travel / Home"
                  value={goalCategory}
                  onChange={(e) => setGoalCategory(e.target.value)}
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
                  Save Goal
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-xs text-[#8e8e93]">Loading goals...</div>
      ) : goals.length === 0 ? (
        <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/60 border-dashed border-white/[0.10]">
          <CardContent className="py-10 text-center space-y-2">
            <Target className="h-6 w-6 mx-auto text-[#e5c158]/80" />
            <p className="text-sm font-medium text-[#fcfcfc]">
              No savings goals yet
            </p>
            <p className="text-xs text-[#8e8e93]">
              Create a dedicated target to track long-term progress.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((g) => {
            const pct =
              g.targetAmount > 0
                ? Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100))
                : 0;
            const isCompleted = g.status === "COMPLETED";

            return (
              <Card
                key={g._id}
                className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm text-[#fcfcfc]">
                          {g.title}
                        </span>
                        {isCompleted && (
                          <Check className="h-3.5 w-3.5 text-[#e5c158]" />
                        )}
                      </div>
                      <p className="text-xs text-[#8e8e93] mt-0.5">
                        {g.category}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g._id)}
                      className="p-1 text-[#8e8e93] hover:text-[#f43f5e] cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="text-base font-semibold text-[#e5c158] tabular-nums">
                    {formatCurrency(g.currentAmount, { currency })}
                    <span className="text-xs font-normal text-[#8e8e93]">
                      {" "}
                      / {formatCurrency(g.targetAmount, { currency })} ({pct}%)
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#e5c158] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  {!isCompleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setContribGoalId(g._id)}
                      className="w-full rounded-xl border-white/[0.10] bg-white/[0.03] text-[#fcfcfc] hover:text-[#e5c158] text-xs cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Funds
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Contribute Dialog */}
      <Dialog
        open={Boolean(contribGoalId)}
        onOpenChange={(open) => !open && setContribGoalId(null)}
      >
        <DialogContent className="bg-[#0e0e13] border-white/[0.08] text-[#fcfcfc] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Funds</DialogTitle>
            <DialogDescription className="text-[#8e8e93]">
              Optionally deduct this deposit from one of your accounts.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleContribute} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#a1a1aa]">Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="5000"
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
                className="bg-black/40 border-white/[0.08]"
                required
              />
            </div>

            {accounts.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">
                  From Account (Optional)
                </Label>
                <Select
                  value={contribAccountId}
                  onValueChange={setContribAccountId}
                >
                  <SelectTrigger className="bg-black/40 border-white/[0.08]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Do not adjust account balance</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name} ({formatCurrency(a.balance, { currency })})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button
                type="submit"
                disabled={isContributing}
                className="w-full cursor-pointer"
              >
                {isContributing && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                )}
                Deposit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
