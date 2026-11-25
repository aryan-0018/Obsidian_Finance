import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { CATEGORIES } from "@/constant";
import { formatCurrency } from "@/lib/format-currency";
import { getApiErrorMessage } from "@/lib/utils";
import { useTypedSelector } from "@/app/hook";
import {
  useGetBudgetQuery,
  useUpdateBudgetMutation,
} from "@/features/budget/budgetAPI";

export default function BudgetsSection() {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data: budgetRes, isLoading } = useGetBudgetQuery();
  const [updateBudget, { isLoading: isUpdating }] = useUpdateBudgetMutation();
  const budget = budgetRes?.data;

  const [globalLimitInput, setGlobalLimitInput] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("dining");
  const [catLimitInput, setCatLimitInput] = useState("");

  const handleSaveGlobalLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(globalLimitInput);
    if (Number.isNaN(val) || val < 0) {
      toast.error("Enter a valid monthly budget");
      return;
    }
    try {
      await updateBudget({ limit: val }).unwrap();
      toast.success("Monthly budget updated");
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

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[#fcfcfc] tracking-tight">
            Monthly Budgets
          </h2>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            Telegram notifications trigger automatically at 80% and 100% of any monthly limit.
          </p>
        </div>

        <Dialog open={catOpen} onOpenChange={setCatOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-xl cursor-pointer">
              <Plus className="h-4 w-4 mr-1" />
              Add Category Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0e0e13] border-white/[0.08] text-[#fcfcfc] sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Category Limit</DialogTitle>
              <DialogDescription className="text-[#8e8e93]">
                Set a monthly spend limit for an individual category.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCategoryLimit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#a1a1aa]">Category</Label>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="bg-black/40 border-white/[0.08]">
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
                <Label className="text-xs text-[#a1a1aa]">Monthly Limit</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="8000"
                  value={catLimitInput}
                  onChange={(e) => setCatLimitInput(e.target.value)}
                  className="bg-black/40 border-white/[0.08]"
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="w-full cursor-pointer"
                >
                  Save Limit
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Monthly Cap */}
      <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#8e8e93]">
                Overall Monthly Budget
              </p>
              <div className="text-2xl font-semibold text-[#fcfcfc] tabular-nums mt-1 tracking-tight">
                {formatCurrency(budget?.totalSpent || 0, { currency })}
                <span className="text-sm font-normal text-[#8e8e93]">
                  {" "}
                  /{" "}
                  {budget?.limit
                    ? formatCurrency(budget.limit, { currency })
                    : "No cap set"}
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
                  budget?.limit ? String(budget.limit) : "Set monthly cap..."
                }
                value={globalLimitInput}
                onChange={(e) => setGlobalLimitInput(e.target.value)}
                className="w-40 h-9 bg-black/40 border-white/[0.08] text-sm"
              />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                disabled={isUpdating}
                className="h-9 rounded-xl border-white/[0.10] bg-white/[0.03] text-[#fcfcfc] hover:text-[#e5c158] cursor-pointer"
              >
                Save
              </Button>
            </form>
          </div>

          {budget && budget.limit > 0 && (
            <div className="space-y-1.5">
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    (budget.percentUsed || 0) >= 100
                      ? "bg-[#f43f5e]"
                      : "bg-[#e5c158]"
                  }`}
                  style={{ width: `${Math.min(100, budget.percentUsed || 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[#8e8e93]">
                <span>{budget.percentUsed}% used this month</span>
                <span>
                  Remaining{" "}
                  {formatCurrency(budget.remaining || 0, { currency })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Budgets */}
      {isLoading ? (
        <div className="text-xs text-[#8e8e93]">Loading budgets...</div>
      ) : (budget?.categoryProgress?.length || 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budget!.categoryProgress.map((cp) => {
            const isOver = cp.status === "EXCEEDED";
            return (
              <Card
                key={cp.category}
                className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]"
              >
                <CardContent className="p-6 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="capitalize text-sm font-medium text-[#fcfcfc]">
                      {cp.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs ${
                          isOver ? "text-[#f43f5e]" : "text-[#8e8e93]"
                        }`}
                      >
                        {isOver ? "Exceeded" : `${cp.percentUsed}%`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCategoryLimit(cp.category)}
                        className="p-1 text-[#8e8e93] hover:text-[#f43f5e] cursor-pointer transition-colors"
                        title="Remove category limit"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-base font-semibold text-[#fcfcfc] tabular-nums">
                    {formatCurrency(cp.spent, { currency })}
                    <span className="text-xs font-normal text-[#8e8e93]">
                      {" "}
                      / {formatCurrency(cp.limit, { currency })}
                    </span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOver ? "bg-[#f43f5e]" : "bg-[#e5c158]"
                      }`}
                      style={{ width: `${Math.min(100, cp.percentUsed)}%` }}
                    />
                  </div>

                  <p className="text-xs text-[#8e8e93]">
                    {cp.remaining >= 0
                      ? `${formatCurrency(cp.remaining, { currency })} remaining`
                      : `Over by ${formatCurrency(Math.abs(cp.remaining), { currency })}`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
