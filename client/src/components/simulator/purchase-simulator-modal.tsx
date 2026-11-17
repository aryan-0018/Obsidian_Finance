import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CreditCard,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useSimulatePurchaseMutation } from "@/features/analytics/analyticsAPI";
import { PurchaseSimulationResponse } from "@/features/analytics/anayticsType";
import { formatCurrency } from "@/lib/format-currency";
import { useTypedSelector } from "@/app/hook";

interface Props {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}

export default function PurchaseSimulatorModal({ trigger, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [title, setTitle] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const [simulatePurchase, { isLoading, data: responseData }] = useSimulatePurchaseMutation();
  const [result, setResult] = useState<PurchaseSimulationResponse["data"] | null>(null);

  useEffect(() => {
    if (responseData?.data) {
      setResult(responseData.data);
    }
  }, [responseData]);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ modal?: string; amount?: number; title?: string }>;
      if (
        customEvent.detail?.modal === "PURCHASE_SIMULATOR" ||
        customEvent.detail?.modal === "CAN_I_AFFORD"
      ) {
        setOpen(true);
        if (customEvent.detail?.amount) {
          setAmountStr(customEvent.detail.amount.toString());
        }
        if (customEvent.detail?.title) {
          setTitle(customEvent.detail.title);
        }
      }
    };
    window.addEventListener("obsidian:open-modal", handleOpen);
    return () => window.removeEventListener("obsidian:open-modal", handleOpen);
  }, []);

  const handleSimulate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const cleanAmt = parseFloat(amountStr.replace(/[^0-9.]/g, ""));
    if (isNaN(cleanAmt) || cleanAmt <= 0) return;

    try {
      const res = await simulatePurchase({
        amount: cleanAmt,
        title: title.trim() || "Item",
      }).unwrap();
      setResult(res.data);
    } catch (err) {
      console.error("Affordability check failed:", err);
    }
  };

  const handleReset = () => {
    setResult(null);
    setTitle("");
    setAmountStr("");
  };

  const getVerdictPresentation = (
    verdict?: string,
    res?: PurchaseSimulationResponse["data"] | null
  ) => {
    switch (verdict) {
      case "SAFE":
        return {
          label: "Affordable",
          badgeClass: "bg-white/[0.06] text-white/90 border-white/15",
          icon: <CheckCircle className="w-4 h-4 text-[#c1a063]" />,
          summaryText:
            res?.recommendation ||
            "Fits comfortably within your savings without affecting upcoming bills.",
        };
      case "CONDITIONAL":
        return {
          label: "Caution",
          badgeClass: "bg-[#c1a063]/10 text-[#e5c158] border-[#c1a063]/30",
          icon: <HelpCircle className="w-4 h-4 text-[#e5c158]" />,
          summaryText:
            res?.recommendation ||
            "You have enough funds to cover this and upcoming bills, but it leaves a smaller emergency buffer.",
        };
      case "HIGH_RISK":
      default:
        return {
          label:
            res && res.liquidBufferAfterBills >= 0 ? "Caution" : "Not Recommended",
          badgeClass:
            res && res.liquidBufferAfterBills >= 0
              ? "bg-[#c1a063]/10 text-[#e5c158] border-[#c1a063]/30"
              : "bg-white/[0.04] text-white/70 border-white/10",
          icon:
            res && res.liquidBufferAfterBills >= 0 ? (
              <HelpCircle className="w-4 h-4 text-[#e5c158]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-white/60" />
            ),
          summaryText:
            res?.recommendation ||
            (res && res.liquidBufferAfterBills >= 0
              ? `You have sufficient funds to cover this purchase and upcoming bills, but it significantly reduces your emergency reserves.`
              : "This purchase exceeds your available funds once upcoming bills are paid."),
        };
    }
  };

  const status = getVerdictPresentation(result?.verdict, result);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="border-white/10 hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-white/90 text-xs sm:text-sm font-medium gap-2 transition-all cursor-pointer h-9 px-3.5"
          >
            <CreditCard className="w-3.5 h-3.5 text-[#c1a063]" />
            <span>Can I Afford This?</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px] bg-[#111114] border border-white/[0.08] text-white p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="pb-3 border-b border-white/[0.06] space-y-1">
          <DialogTitle className="text-base font-medium text-white">
            Check Purchase Affordability
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            See how a planned purchase affects your balance and upcoming bills.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSimulate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-white/70">
                Item name
              </Label>
              <Input
                placeholder="e.g. Laptop, Flight tickets, Gym membership"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 text-sm h-9 focus-visible:ring-1 focus-visible:ring-white/20"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-white/70">Price (₹)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 text-sm font-normal">
                  ₹
                </span>
                <Input
                  type="number"
                  placeholder="25000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="pl-7 bg-white/[0.03] border-white/10 text-white placeholder:text-white/25 text-sm h-9 font-normal focus-visible:ring-1 focus-visible:ring-white/20"
                  required
                  min={1}
                />
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={isLoading || !amountStr}
                className="w-full bg-[#c1a063] hover:bg-[#b09054] text-black font-medium text-xs sm:text-sm h-9 transition-colors cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Checking...
                  </span>
                ) : (
                  "Check Affordability"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 pt-1">
            {/* Status Card */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.badgeClass}`}>
                    {status.icon}
                    {status.label}
                  </span>
                  <span className="text-xs text-white/50 truncate max-w-[200px]">
                    {result.purchaseTitle}
                  </span>
                </div>
                <span className="text-sm font-medium text-white tabular-nums">
                  {formatCurrency(result.purchaseAmount, { currency })}
                </span>
              </div>
              <p className="text-xs text-white/70 leading-relaxed">
                {status.summaryText}
              </p>
              {result.tradeOffAdvice && (
                <p className="text-[11px] text-[#e5c158]/80 font-normal mt-1 flex items-center gap-1.5 pt-1 border-t border-white/[0.04]">
                  <span>💡</span> {result.tradeOffAdvice}
                </p>
              )}
            </div>

            {/* Clean Details Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1">
                <span className="text-white/40 text-[11px]">Buffer after purchase</span>
                <div className={`text-sm font-medium tabular-nums ${result.liquidBufferAfterBills < 0 ? "text-[#ff453a]" : "text-white"}`}>
                  {result.liquidBufferAfterBills < 0 ? "-" : ""}
                  {formatCurrency(Math.abs(result.liquidBufferAfterBills), { currency })}
                </div>
                <span className={`text-[10px] ${result.liquidBufferAfterBills < 0 ? "text-[#ff453a]/70 font-medium" : "text-white/35"}`}>
                  {result.liquidBufferAfterBills < 0 ? "Projected deficit after bills" : "After upcoming bills"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] space-y-1">
                <span className="text-white/40 text-[11px]">Upcoming bills (30d)</span>
                <div className="text-sm font-medium text-white tabular-nums">
                  {formatCurrency(result.upcomingRecurringBills, { currency })}
                </div>
                <span className="text-[10px] text-white/35">Known recurring expenses</span>
              </div>
            </div>

            {/* Upcoming Bills List (if any) */}
            {result.upcomingBills?.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[11px] text-white/40">Upcoming scheduled bills:</div>
                <div className="space-y-1">
                  {result.upcomingBills.map((b, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/[0.015] border border-white/[0.04]"
                    >
                      <span className="text-white/60 truncate">{b.title}</span>
                      <span className="text-white/80 tabular-nums font-mono text-[11px]">
                        {formatCurrency(b.amount, { currency })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-white/[0.06]">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs text-white/50 hover:text-white transition-colors cursor-pointer"
              >
                Check another item
              </button>
              <Button
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-xs text-white/70 hover:text-white h-8 px-3"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
