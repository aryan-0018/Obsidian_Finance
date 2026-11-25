import { useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  CreditCard,
  Landmark,
  Loader2,
  Plus,
  Star,
  Trash2,
  TrendingUp,
  Wallet,
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
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format-currency";
import { getApiErrorMessage } from "@/lib/utils";
import { useTypedSelector } from "@/app/hook";
import { ACCOUNT_TYPES } from "@/constant";
import {
  AccountTypeEnum,
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useGetAllAccountsQuery,
  useTransferAccountsMutation,
  useUpdateAccountMutation,
} from "@/features/account/accountAPI";

const COLOR_SWATCHES = ["#e5c158", "#30d158", "#0a84ff", "#bf5af2", "#ff9f0a", "#ff453a"];

const AccountTypeIcon = ({ type }: { type: AccountTypeEnum }) => {
  switch (type) {
    case "CREDIT_CARD":
      return <CreditCard className="h-4 w-4" />;
    case "BANK":
      return <Landmark className="h-4 w-4" />;
    case "INVESTMENT":
      return <TrendingUp className="h-4 w-4" />;
    case "CASH":
      return <Building2 className="h-4 w-4" />;
    default:
      return <Wallet className="h-4 w-4" />;
  }
};

export default function AccountsTab() {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data, isLoading } = useGetAllAccountsQuery();
  const [createAccount, { isLoading: isCreating }] = useCreateAccountMutation();
  const [updateAccount] = useUpdateAccountMutation();
  const [deleteAccount] = useDeleteAccountMutation();
  const [transferAccounts, { isLoading: isTransferring }] =
    useTransferAccountsMutation();

  const accounts = data?.accounts || [];
  const summary = data?.summary;

  // Create Account Dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountTypeEnum>("BANK");
  const [institution, setInstitution] = useState("");
  const [accountMask, setAccountMask] = useState("");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [color, setColor] = useState("#e5c158");

  // Transfer Dialog
  const [transferOpen, setTransferOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter an account name");
      return;
    }
    try {
      await createAccount({
        name: name.trim(),
        type,
        institution: institution.trim(),
        accountMask: accountMask.trim() || null,
        balance: Number(balance) || 0,
        creditLimit: type === "CREDIT_CARD" ? Number(creditLimit) || 0 : 0,
        color,
      }).unwrap();
      toast.success("Account added");
      setCreateOpen(false);
      setName("");
      setInstitution("");
      setAccountMask("");
      setBalance("");
      setCreditLimit("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to add account"));
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(transferAmount);
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
      toast.error("Choose two different accounts");
      return;
    }
    if (!amt || amt <= 0) {
      toast.error("Enter a valid transfer amount");
      return;
    }
    try {
      await transferAccounts({
        fromAccountId,
        toAccountId,
        amount: amt,
        description: transferNote.trim() || undefined,
      }).unwrap();
      toast.success("Transfer completed and committed to ledger");
      setTransferOpen(false);
      setTransferAmount("");
      setTransferNote("");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Transfer failed"));
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await updateAccount({ id, body: { isDefault: true } }).unwrap();
      toast.success("Default SMS/wallet account updated");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Update failed"));
    }
  };

  const handleDelete = async (id: string, accName: string) => {
    try {
      await deleteAccount(id).unwrap();
      toast.success(`Removed "${accName}"`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Delete failed"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Summary Strip + Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#8e8e93]">
              Net Account Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#e5c158] tabular-nums">
              {formatCurrency(summary?.netBalance || 0, { currency })}
            </div>
            <p className="text-[11px] text-[#8e8e93] mt-1">
              Across {summary?.accountCount || 0} linked wallets &amp; banks
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#8e8e93]">
              Liquid Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">
              {formatCurrency(summary?.totalAssets || 0, { currency })}
            </div>
            <p className="text-[11px] text-[#8e8e93] mt-1">
              Bank, cash, wallets &amp; investments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-[#8e8e93]">
              Credit Card Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-400 tabular-nums">
              {formatCurrency(summary?.totalCreditDebt || 0, { currency })}
            </div>
            <p className="text-[11px] text-[#8e8e93] mt-1">
              Limit: {formatCurrency(summary?.totalCreditLimit || 0, { currency })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">
            Connected Accounts &amp; Cards
          </h3>
          <p className="text-xs text-[#8e8e93]">
            Add last 4 digits (e.g. 4521) to auto-match incoming bank SMS alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={accounts.length < 2}
                className="rounded-xl border-white/[0.1] bg-white/[0.03] text-white hover:text-[#e5c158] cursor-pointer"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
                Internal Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0e0e13] border-white/[0.1] text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Transfer Between Accounts</DialogTitle>
                <DialogDescription className="text-[#8e8e93]">
                  Move funds or pay a credit card bill without inflating income/expense reports.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">From Account</Label>
                  <Select value={fromAccountId} onValueChange={setFromAccountId}>
                    <SelectTrigger className="bg-black/40 border-white/[0.1]">
                      <SelectValue placeholder="Select source account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name} ({formatCurrency(a.balance, { currency })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">To Account</Label>
                  <Select value={toAccountId} onValueChange={setToAccountId}>
                    <SelectTrigger className="bg-black/40 border-white/[0.1]">
                      <SelectValue placeholder="Select destination account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name} ({formatCurrency(a.balance, { currency })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Amount</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="5000"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    className="bg-black/40 border-white/[0.1]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Note (Optional)</Label>
                  <Input
                    placeholder="e.g. Monthly Axis card bill"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="bg-black/40 border-white/[0.1]"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={isTransferring}
                    className="w-full cursor-pointer"
                  >
                    {isTransferring && (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    )}
                    Execute Transfer
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl cursor-pointer">
                <Plus className="h-4 w-4 mr-1" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0e0e13] border-white/[0.1] text-white sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Bank Account or Wallet</DialogTitle>
                <DialogDescription className="text-[#8e8e93]">
                  Track balances separately and match SMS alerts automatically.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs text-[#a1a1aa]">Account Name</Label>
                    <Input
                      placeholder="HDFC Savings"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-black/40 border-white/[0.1]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs text-[#a1a1aa]">Type</Label>
                    <Select
                      value={type}
                      onValueChange={(v) => setType(v as AccountTypeEnum)}
                    >
                      <SelectTrigger className="bg-black/40 border-white/[0.1]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCOUNT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#a1a1aa]">
                      Institution (Optional)
                    </Label>
                    <Input
                      placeholder="HDFC Bank"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="bg-black/40 border-white/[0.1]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#a1a1aa]">
                      Last 4 Digits (SMS Match)
                    </Label>
                    <Input
                      maxLength={4}
                      placeholder="4521"
                      value={accountMask}
                      onChange={(e) => setAccountMask(e.target.value)}
                      className="bg-black/40 border-white/[0.1]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#a1a1aa]">
                      {type === "CREDIT_CARD"
                        ? "Current Balance (negative if owed)"
                        : "Opening Balance"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="25000"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      className="bg-black/40 border-white/[0.1]"
                    />
                  </div>
                  {type === "CREDIT_CARD" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-[#a1a1aa]">
                        Credit Limit
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="150000"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        className="bg-black/40 border-white/[0.1]"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Accent Color</Label>
                  <div className="flex items-center gap-2">
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-6 w-6 rounded-full cursor-pointer transition-transform ${
                          color === c
                            ? "ring-2 ring-white scale-110"
                            : "opacity-70 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
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
                    Save Account
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Accounts Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-[#8e8e93]">
          Loading accounts...
        </div>
      ) : accounts.length === 0 ? (
        <Card className="bg-[#0e0e13]/60 border-dashed border-white/[0.12] rounded-2xl">
          <CardContent className="py-12 text-center space-y-3">
            <Wallet className="h-8 w-8 mx-auto text-[#e5c158]/70" />
            <div className="text-sm font-medium text-white">
              No bank accounts or wallets added yet
            </div>
            <p className="text-xs text-[#8e8e93] max-w-md mx-auto">
              Create your bank accounts, UPI wallets, and credit cards to track live per-account balances and auto-link SMS alerts by their last 4 digits.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => {
            const isCard = acc.type === "CREDIT_CARD";
            const used = isCard && acc.balance < 0 ? Math.abs(acc.balance) : 0;
            const limit = Number(acc.creditLimit) || 0;
            const utilPct =
              isCard && limit > 0
                ? Math.min(100, Math.round((used / limit) * 100))
                : 0;

            return (
              <Card
                key={acc._id}
                className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl overflow-hidden hover:border-white/[0.16] transition-all"
              >
                <div
                  className="h-1 w-full"
                  style={{ backgroundColor: acc.color || "#e5c158" }}
                />
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center border border-white/[0.1]"
                        style={{
                          backgroundColor: `${acc.color || "#e5c158"}20`,
                          color: acc.color || "#e5c158",
                        }}
                      >
                        <AccountTypeIcon type={acc.type} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-white">
                            {acc.name}
                          </span>
                          {acc.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e5c158]/15 text-[#e5c158] border border-[#e5c158]/30">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8e8e93]">
                          {acc.institution || acc.type.replace("_", " ")}
                          {acc.accountMask ? ` • ••${acc.accountMask}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {!acc.isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(acc._id)}
                          title="Set as default SMS account"
                          className="p-1.5 rounded-lg text-[#8e8e93] hover:text-[#e5c158] hover:bg-white/[0.06] cursor-pointer"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(acc._id, acc.name)}
                        title="Delete account"
                        className="p-1.5 rounded-lg text-[#8e8e93] hover:text-rose-400 hover:bg-white/[0.06] cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div
                      className={`text-xl font-bold tabular-nums ${
                        acc.balance < 0 ? "text-rose-400" : "text-white"
                      }`}
                    >
                      {formatCurrency(acc.balance, { currency })}
                    </div>
                  </div>

                  {isCard && limit > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] text-[#8e8e93]">
                        <span>Utilization: {utilPct}%</span>
                        <span>Limit: {formatCurrency(limit, { currency })}</span>
                      </div>
                      <Progress value={utilPct} className="h-1.5 bg-white/[0.08]" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
