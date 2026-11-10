import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Layers,
  Lock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useLazyVerifyLedgerAuditQuery } from "@/features/transaction/transactionAPI";

export function LedgerAuditModal() {
  const [open, setOpen] = useState(false);
  const [triggerAudit, { data, isFetching }] = useLazyVerifyLedgerAuditQuery();

  useEffect(() => {
    const handleCustomOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ modal?: string }>;
      if (customEvent.detail?.modal === "LEDGER_AUDIT") {
        setOpen(true);
        triggerAudit(undefined);
      }
    };
    window.addEventListener("obsidian:open-modal", handleCustomOpen);
    return () => window.removeEventListener("obsidian:open-modal", handleCustomOpen);
  }, [triggerAudit]);

  const handleOpen = () => {
    setOpen(true);
    triggerAudit(undefined);
  };

  const handleRefresh = () => {
    triggerAudit(undefined);
  };

  const auditData = data?.data;
  const isSecure = auditData?.status === "VERIFIED_SECURE";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="flex items-center gap-1.5 rounded-xl border-white/[0.10] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.16] text-white active:scale-[0.98] transition-all cursor-pointer text-xs"
          title="Verify Account Records"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-[#e5c158]" />
          <span>Verify Records</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md obsidian-card bg-[#0e0e13]/95 backdrop-blur-2xl border border-white/[0.09] text-[#f5f5f7] p-6 sm:p-7 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <DialogHeader className="pb-3 border-b border-white/[0.06]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] flex items-center justify-center border border-[#e5c158]/25">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                  Verify Records
                  {isSecure && (
                    <Badge className="bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20 text-[10px] font-medium">
                      Verified
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#8e8e93]">
                  Verifies that all your recorded transactions are accurate, matching, and safe.
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isFetching}
              className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-[#8e8e93] hover:text-white transition-all"
              title="Re-run verification"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-[#e5c158]" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Main Status Display */}
          {isFetching ? (
            <div className="py-10 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-[#e5c158]" />
              <p className="text-xs text-[#8e8e93]">
                Verifying transaction balances and sequences...
              </p>
            </div>
          ) : isSecure ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-2 text-center">
              <div className="h-9 w-9 rounded-full bg-[#30d158]/10 text-[#30d158] flex items-center justify-center mx-auto border border-[#30d158]/20">
                <CheckCircle2 className="h-4.5 w-4.5" />
              </div>

              <h3 className="text-sm font-semibold text-white">
                All Transactions Verified & Safe
              </h3>
              <p className="text-xs text-[#8e8e93] max-w-sm mx-auto leading-relaxed">
                All your recorded income, expenses, and balances match accurately with zero missing or altered entries.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#ff453a]/20 bg-[#ff453a]/5 p-5 space-y-2 text-center">
              <div className="h-9 w-9 rounded-full bg-[#ff453a]/10 text-[#ff453a] flex items-center justify-center mx-auto border border-[#ff453a]/20">
                <ShieldAlert className="h-4.5 w-4.5" />
              </div>

              <h3 className="text-sm font-semibold text-[#ff453a]">
                Discrepancy Identified
              </h3>
              <p className="text-xs text-[#ff453a]/80 max-w-sm mx-auto leading-relaxed">
                One or more transactions don't match your expected transaction records.
              </p>
            </div>
          )}

          {/* Metrics Grid */}
          {auditData && !isFetching && (
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#8e8e93] mb-0.5">
                  <Layers className="h-3 w-3 text-[#e5c158]" />
                  Records
                </div>
                <p className="text-sm font-semibold text-white tabular-nums">
                  {auditData.chainDepth}
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#8e8e93] mb-0.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#30d158]" />
                  Status
                </div>
                <p className="text-sm font-semibold text-white">
                  Balanced
                </p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5">
                <div className="flex items-center justify-center gap-1 text-[10px] text-[#8e8e93] mb-0.5">
                  <Lock className="h-3 w-3 text-[#e5c158]" />
                  Accuracy
                </div>
                <p className={`text-sm font-semibold tabular-nums ${isSecure ? "text-[#30d158]" : "text-[#ff453a]"}`}>
                  {isSecure ? "100%" : "Mismatch"}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default LedgerAuditModal;
