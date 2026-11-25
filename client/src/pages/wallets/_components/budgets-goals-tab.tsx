import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Loader2,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import { CATEGORIES } from "@/constant";
import { formatCurrency } from "@/lib/format-currency";
import { getApiErrorMessage } from "@/lib/utils";
import { useTypedSelector } from "@/app/hook";
import {
  useGetBudgetQuery,
  useUpdateBudgetMutation,
} from "@/features/budget/budgetAPI";
import {
  useContributeGoalMutation,
  useCreateGoalMutation,
  useDeleteGoalMutation,
  useGetAllGoalsQuery,
} from "@/features/goal/goalAPI";
import { useGetAllAccountsQuery } from "@/features/account/accountAPI";

export default function BudgetsGoalsTab() {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data: budgetRes, isLoading: loadingBudget } = useGetBudgetQuery();
  const [updateBudget, { isLoading: isUpdatingBudget }] =
    useUpdateBudgetMutation();

  const { data: goalsRes, isLoading: loadingGoals } = useGetAllGoalsQuery();
  const [createGoal, { isLoading: isCreatingGoal }] = useCreateGoalMutation();
  const [contributeGoal, { isLoading: isContributing }] =
    useContributeGoalMutation();
  const [deleteGoal] = useDeleteGoalMutation();

  const { data: accountsRes } = useGetAllAccountsQuery();
  const accounts = accountsRes?.accounts || [];

  const budget = budgetRes?.data;
  const goals = goalsRes?.goals || [];
  const goalsSummary = goalsRes?.summary;

  // Budget modals/inputs
  const [globalLimitInput, setGlobalLimitInput] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("dining");
  const [catLimitInput, setCatLimitInput] = useState("");

  // Goal create modal
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalCurrent, setGoalCurrent] = useState("");
  const [goalCategory, setGoalCategory] = useState("Emergency Fund");

  // Contribute modal
  const [contribGoalId, setContribGoalId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [contribAccountId, setContribAccountId] = useState("none");

  const handleSaveGlobalLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(globalLimitInput);
    if (Number.isNaN(val) || val < 0) {
      toast.error("Enter a valid monthly budget");
      return;
    }
    try {
      await updateBudget({ limit: val }).unwrap();
      toast.success("Monthly global budget updated");
      setGlobalLimitInput("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update budget"));
    }
  };

  const handleAddCategoryLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(catLimitInput);
    if (!selectedCategory || Number.isNaN(val) || val <= 0) {
      toast.error("Enter a valid category limit");
      return;
    }
    const existing = budget?.categoryLimits || [];
    const filtered = existing.filter(
      (c) => c.category.toLowerCase() !== selectedCategory.toLowerCase()
    );
    try {
      await updateBudget({
        categoryLimits: [...filtered, { category: selectedCategory, limit: val }],
      }).unwrap();
      toast.success(`Budget set for ${selectedCategory}`);
      setCatOpen(false);
      setCatLimitInput("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to save category budget"));
    }
  };

  const handleRemoveCategoryLimit = async (cat: string) => {
    const existing = budget?.categoryLimits || [];
    const next = existing.filter(
      (c) => c.category.toLowerCase() !== cat.toLowerCase()
    );
    try {
      await updateBudget({ categoryLimits: next }).unwrap();
      toast.success(`Removed ${cat} budget`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to remove budget"));
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(goalTarget);
    if (!goalTitle.trim() || !target || target <= 0) {
      toast.error("Enter a goal title and target amount");
      return;
    }
    try {
      await createGoal({
        title: goalTitle.trim(),
        targetAmount: target,
        currentAmount: Number(goalCurrent) || 0,
        category: goalCategory,
      }).unwrap();
      toast.success("Savings goal created");
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
      toast.error("Enter a positive amount");
      return;
    }
    try {
      await contributeGoal({
        id: contribGoalId,
        amount: amt,
        action: "DEPOSIT",
        accountId: contribAccountId === "none" ? null : contribAccountId,
      }).unwrap();
      toast.success("Contribution added to goal");
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
    <div className="space-y-8">
      {/* SECTION 1: Category & Global Budgets */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Category &amp; Monthly Budgets
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/25">
                <Bell className="h-2.5 w-2.5" /> Telegram Alerts @ 80% &amp; 100%
              </span>
            </h3>
            <p className="text-xs text-[#8e8e93]">
              Automatic alerts fire to your paired Telegram Copilot when spending approaches or exceeds any limit.
            </p>
          </div>

          <Dialog open={catOpen} onOpenChange={setCatOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl cursor-pointer">
                <Plus className="h-4 w-4 mr-1" />
                Set Category Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0e0e13] border-white/[0.1] text-white sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Category Monthly Limit</DialogTitle>
                <DialogDescription className="text-[#8e8e93]">
                  Track spend against a strict monthly cap for a category.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddCategoryLimit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Category</Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger className="bg-black/40 border-white/[0.1]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.filter((c) => c.value !== "income").map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Monthly Cap</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="8000"
                    value={catLimitInput}
                    onChange={(e) => setCatLimitInput(e.target.value)}
                    className="bg-black/40 border-white/[0.1]"
                    required
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={isUpdatingBudget}
                    className="w-full cursor-pointer"
                  >
                    Save Category Budget
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Global Budget Card */}
        <Card className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl">
          <CardContent className="pt-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-xs text-[#8e8e93]">
                  Global Monthly Spend Cap
                </div>
                <div className="text-xl font-bold text-white tabular-nums mt-0.5">
                  {formatCurrency(budget?.totalSpent || 0, { currency })}
                  <span className="text-sm font-normal text-[#8e8e93]">
                    {" "}
                    /{" "}
                    {budget?.limit
                      ? formatCurrency(budget.limit, { currency })
                      : "No Global Cap"}
                  </span>
                </div>
              </div>

              <form
                onSubmit={handleSaveGlobalLimit}
                className="flex items-center gap-2"
              >
                <Input
                  type="number"
                  min="0"
                  placeholder={
                    budget?.limit ? String(budget.limit) : "Set global limit..."
                  }
                  value={globalLimitInput}
                  onChange={(e) => setGlobalLimitInput(e.target.value)}
                  className="w-40 h-9 bg-black/40 border-white/[0.1] text-sm"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  disabled={isUpdatingBudget}
                  className="h-9 rounded-xl border-white/[0.1] bg-white/[0.04] cursor-pointer"
                >
                  Update
                </Button>
              </form>
            </div>

            {budget && budget.limit > 0 && (
              <div className="space-y-1">
                <Progress
                  value={Math.min(100, budget.percentUsed || 0)}
                  className="h-2 bg-white/[0.08]"
                />
                <div className="flex justify-between text-[11px] text-[#8e8e93]">
                  <span>{budget.percentUsed}% used this month</span>
                  <span>
                    Remaining:{" "}
                    {formatCurrency(budget.remaining || 0, { currency })}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Per-Category Budget Cards */}
        {loadingBudget ? (
          <div className="text-xs text-[#8e8e93]">Loading budgets...</div>
        ) : (budget?.categoryProgress?.length || 0) > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budget!.categoryProgress.map((cp) => {
              const isOver = cp.status === "EXCEEDED";
              const isWarn = cp.status === "WARNING";
              return (
                <Card
                  key={cp.category}
                  className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl"
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="capitalize text-sm font-semibold text-white">
                          {cp.category}
                        </span>
                        {isOver ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <AlertTriangle className="h-2.5 w-2.5" /> Exceeded
                          </span>
                        ) : isWarn ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            {cp.percentUsed}%
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            On Track
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategoryLimit(cp.category)}
                        className="p-1 text-[#8e8e93] hover:text-rose-400 cursor-pointer"
                        title="Remove category limit"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-sm font-semibold text-white tabular-nums">
                      {formatCurrency(cp.spent, { currency })}
                      <span className="text-xs font-normal text-[#8e8e93]">
                        {" "}
                        / {formatCurrency(cp.limit, { currency })}
                      </span>
                    </div>

                    <Progress
                      value={Math.min(100, cp.percentUsed)}
                      className="h-1.5 bg-white/[0.08]"
                    />

                    <div className="text-[11px] text-[#8e8e93]">
                      {cp.remaining >= 0
                        ? `${formatCurrency(cp.remaining, { currency })} left this month`
                        : `Over by ${formatCurrency(Math.abs(cp.remaining), { currency })}`}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* SECTION 2: Savings Goals / Sinking Funds */}
      <div className="space-y-4 pt-4 border-t border-white/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              Savings Goals &amp; Sinking Funds
            </h3>
            <p className="text-xs text-[#8e8e93]">
              Total saved:{" "}
              <span className="text-[#e5c158] font-medium">
                {formatCurrency(goalsSummary?.totalSaved || 0, { currency })}
              </span>{" "}
              of {formatCurrency(goalsSummary?.totalTarget || 0, { currency })} (
              {goalsSummary?.overallPercent || 0}%)
            </p>
          </div>

          <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl cursor-pointer">
                <Plus className="h-4 w-4 mr-1" />
                New Savings Goal
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0e0e13] border-white/[0.1] text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Savings Goal</DialogTitle>
                <DialogDescription className="text-[#8e8e93]">
                  Build emergency funds, travel buckets, or big purchases step by step.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Goal Title</Label>
                  <Input
                    placeholder="Emergency Fund (6 Months)"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    className="bg-black/40 border-white/[0.1]"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#a1a1aa]">
                      Target Amount
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      placeholder="300000"
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      className="bg-black/40 border-white/[0.1]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#a1a1aa]">
                      Starting Saved
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={goalCurrent}
                      onChange={(e) => setGoalCurrent(e.target.value)}
                      className="bg-black/40 border-white/[0.1]"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Category</Label>
                  <Input
                    placeholder="Emergency Fund / Tech / Travel"
                    value={goalCategory}
                    onChange={(e) => setGoalCategory(e.target.value)}
                    className="bg-black/40 border-white/[0.1]"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={isCreatingGoal}
                    className="w-full cursor-pointer"
                  >
                    {isCreatingGoal && (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    )}
                    Create Goal
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingGoals ? (
          <div className="text-xs text-[#8e8e93]">Loading goals...</div>
        ) : goals.length === 0 ? (
          <Card className="bg-[#0e0e13]/60 border-dashed border-white/[0.12] rounded-2xl">
            <CardContent className="py-10 text-center space-y-2">
              <Target className="h-7 w-7 mx-auto text-[#e5c158]/70" />
              <div className="text-sm font-medium text-white">
                No savings goals yet
              </div>
              <p className="text-xs text-[#8e8e93]">
                Start your first sinking fund or emergency reserve target above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((g) => {
              const pct =
                g.targetAmount > 0
                  ? Math.min(
                      100,
                      Math.round((g.currentAmount / g.targetAmount) * 100)
                    )
                  : 0;
              const isCompleted = g.status === "COMPLETED";

              return (
                <Card
                  key={g._id}
                  className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl"
                >
                  <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-sm font-semibold text-white flex items-center gap-1.5">
                        {g.title}
                        {isCompleted && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        )}
                      </CardTitle>
                      <span className="text-[11px] text-[#8e8e93]">
                        {g.category}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g._id)}
                      className="p-1 text-[#8e8e93] hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-base font-bold text-[#e5c158] tabular-nums">
                      {formatCurrency(g.currentAmount, { currency })}
                      <span className="text-xs font-normal text-[#8e8e93]">
                        {" "}
                        / {formatCurrency(g.targetAmount, { currency })} ({pct}%)
                      </span>
                    </div>

                    <Progress value={pct} className="h-2 bg-white/[0.08]" />

                    {!isCompleted && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setContribGoalId(g._id)}
                        className="w-full rounded-xl border-white/[0.1] bg-white/[0.03] hover:text-[#e5c158] text-xs cursor-pointer"
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
      </div>

      {/* Contribute to Goal Dialog */}
      <Dialog
        open={Boolean(contribGoalId)}
        onOpenChange={(open) => !open && setContribGoalId(null)}
      >
        <DialogContent className="bg-[#0e0e13] border-white/[0.1] text-white sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Contribute to Goal</DialogTitle>
            <DialogDescription className="text-[#8e8e93]">
              Optionally deduct from a linked account balance.
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
                className="bg-black/40 border-white/[0.1]"
                required
              />
            </div>

            {accounts.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">
                  Deduct from Account (Optional)
                </Label>
                <Select
                  value={contribAccountId}
                  onValueChange={setContribAccountId}
                >
                  <SelectTrigger className="bg-black/40 border-white/[0.1]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Do not alter account balance</SelectItem>
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
                Deposit Funds
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
