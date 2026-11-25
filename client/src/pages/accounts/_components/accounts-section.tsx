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
import { ACCOUNT_TYPES } from "@/constant";
import {
  AccountTypeEnum,
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useGetAllAccountsQuery,
  useTransferAccountsMutation,
  useUpdateAccountMutation,
} from "@/features/account/accountAPI";

const AccountIcon = ({ type }: { type: AccountTypeEnum }) => {
  switch (type) {
    case "CREDIT_CARD":
      return <CreditCard className="h-4 w-4 text-[#e5c158]" />;
    case "BANK":
      return <Landmark className="h-4 w-4 text-[#e5c158]" />;
    case "INVESTMENT":
      return <TrendingUp className="h-4 w-4 text-[#e5c158]" />;
    case "CASH":
      return <Building2 className="h-4 w-4 text-[#e5c158]" />;
    default:
      return <Wallet className="h-4 w-4 text-[#e5c158]" />;
  }
};

export default function AccountsSection() {
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

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountTypeEnum>("BANK");
  const [institution, setInstitution] = useState("");
  const [accountMask, setAccountMask] = useState("");
  const [balance, setBalance] = useState("");
  const [creditLimit, setCreditLimit] = useState("");

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
        color: "#e5c158",
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
      toast.error("Select two different accounts");
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
      toast.success("Transfer recorded");
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
      toast.success("Default account updated");
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Update failed"));
    }
  };

  const handleDelete = async (id: string, accName: string) => {
    try {
      await deleteAccount(id).unwrap();
      toast.success(`Removed ${accName}`);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Delete failed"));
    }
  };

  return (
    <section className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
          <CardContent className="p-6 space-y-1.5">
            <p className="text-xs font-medium text-[#8e8e93]">Net Balance</p>
            <p className="text-2xl font-semibold text-[#e5c158] tabular-nums tracking-tight">
              {formatCurrency(summary?.netBalance || 0, { currency })}
            </p>
            <p className="text-xs text-[#8e8e93]">
              {summary?.accountCount || 0} active accounts
            </p>
          </CardContent>
        </Card>

        <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
          <CardContent className="p-6 space-y-1.5">
            <p className="text-xs font-medium text-[#8e8e93]">Total Assets</p>
            <p className="text-2xl font-semibold text-[#fcfcfc] tabular-nums tracking-tight">
              {formatCurrency(summary?.totalAssets || 0, { currency })}
            </p>
            <p className="text-xs text-[#8e8e93]">
              Bank, cash, and investments
            </p>
          </CardContent>
        </Card>

        <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
          <CardContent className="p-6 space-y-1.5">
            <p className="text-xs font-medium text-[#8e8e93]">Card Balance</p>
            <p
              className={`text-2xl font-semibold tabular-nums tracking-tight ${
                (summary?.totalCreditDebt || 0) > 0
                  ? "text-[#f43f5e]"
                  : "text-[#fcfcfc]"
              }`}
            >
              {formatCurrency(summary?.totalCreditDebt || 0, { currency })}
            </p>
            <p className="text-xs text-[#8e8e93]">
              Limit {formatCurrency(summary?.totalCreditLimit || 0, { currency })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <div>
          <h2 className="text-base font-semibold text-[#fcfcfc] tracking-tight">
            Accounts &amp; Cards
          </h2>
          <p className="text-xs text-[#8e8e93] mt-0.5">
            Optional last 4 digits automatically link incoming bank SMS alerts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={accounts.length < 2}
                className="rounded-xl border-white/[0.10] bg-white/[0.03] text-[#fcfcfc] hover:text-[#e5c158] hover:border-[#c1a063]/40 cursor-pointer"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" />
                Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0e0e13] border-white/[0.08] text-[#fcfcfc] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Transfer Funds</DialogTitle>
                <DialogDescription className="text-[#8e8e93]">
                  Move money between accounts or pay a card bill without affecting income or expense totals.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">From</Label>
                  <Select value={fromAccountId} onValueChange={setFromAccountId}>
                    <SelectTrigger className="bg-black/40 border-white/[0.08]">
                      <SelectValue placeholder="Choose source account" />
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
                  <Label className="text-xs text-[#a1a1aa]">To</Label>
                  <Select value={toAccountId} onValueChange={setToAccountId}>
                    <SelectTrigger className="bg-black/40 border-white/[0.08]">
                      <SelectValue placeholder="Choose destination account" />
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
                    className="bg-black/40 border-white/[0.08]"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs text-[#a1a1aa]">Note</Label>
                  <Input
                    placeholder="Monthly card payment"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="bg-black/40 border-white/[0.08]"
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
                    Confirm Transfer
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
            <DialogContent className="bg-[#0e0e13] border-white/[0.08] text-[#fcfcfc] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>New Account</DialogTitle>
                <DialogDescription className="text-[#8e8e93]">
                  Add a bank account, credit card, wallet, or cash balance.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs text-[#a1a1aa]">Name</Label>
                    <Input
                      placeholder="HDFC Savings"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-black/40 border-white/[0.08]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2 sm:col-span-1">
                    <Label className="text-xs text-[#a1a1aa]">Type</Label>
                    <Select
                      value={type}
                      onValueChange={(v) => setType(v as AccountTypeEnum)}
                    >
                      <SelectTrigger className="bg-black/40 border-white/[0.08]">
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
                    <Label className="text-xs text-[#a1a1aa]">Institution</Label>
                    <Input
                      placeholder="HDFC Bank"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="bg-black/40 border-white/[0.08]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#a1a1aa]">Last 4 Digits</Label>
                    <Input
                      maxLength={4}
                      placeholder="4521"
                      value={accountMask}
                      onChange={(e) => setAccountMask(e.target.value)}
                      className="bg-black/40 border-white/[0.08]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-[#a1a1aa]">
                      {type === "CREDIT_CARD"
                        ? "Current Balance"
                        : "Opening Balance"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="25000"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      className="bg-black/40 border-white/[0.08]"
                    />
                  </div>
                  {type === "CREDIT_CARD" && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-[#a1a1aa]">Credit Limit</Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="150000"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        className="bg-black/40 border-white/[0.08]"
                      />
                    </div>
                  )}
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

      {/* Accounts List */}
      {isLoading ? (
        <div className="py-10 text-center text-xs text-[#8e8e93]">
          Loading accounts...
        </div>
      ) : accounts.length === 0 ? (
        <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/60 border-dashed border-white/[0.10]">
          <CardContent className="py-12 text-center space-y-2">
            <Wallet className="h-6 w-6 mx-auto text-[#e5c158]/80" />
            <p className="text-sm font-medium text-[#fcfcfc]">
              No accounts added yet
            </p>
            <p className="text-xs text-[#8e8e93] max-w-sm mx-auto">
              Add your bank accounts, cards, and cash balances to keep everything reconciled in one place.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08] hover:border-white/[0.14] transition-colors"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                        <AccountIcon type={acc.type} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-[#fcfcfc]">
                            {acc.name}
                          </span>
                          {acc.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/25">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#8e8e93] mt-0.5">
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
                          title="Set as default account"
                          className="p-1.5 rounded-lg text-[#8e8e93] hover:text-[#e5c158] hover:bg-white/[0.05] cursor-pointer transition-colors"
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(acc._id, acc.name)}
                        title="Delete account"
                        className="p-1.5 rounded-lg text-[#8e8e93] hover:text-[#f43f5e] hover:bg-white/[0.05] cursor-pointer transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div
                    className={`text-xl font-semibold tabular-nums tracking-tight ${
                      acc.balance < 0 ? "text-[#f43f5e]" : "text-[#fcfcfc]"
                    }`}
                  >
                    {formatCurrency(acc.balance, { currency })}
                  </div>

                  {isCard && limit > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#e5c158] transition-all"
                          style={{ width: `${utilPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[11px] text-[#8e8e93]">
                        <span>{utilPct}% used</span>
                        <span>Limit {formatCurrency(limit, { currency })}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
