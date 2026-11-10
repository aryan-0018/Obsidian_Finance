import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
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
  FileKey,
} from "lucide-react";
import { useLazyVerifyLedgerAuditQuery } from "@/features/transaction/transactionAPI";

export default function SecuritySettings() {
  const [triggerAudit, { data, isFetching }] = useLazyVerifyLedgerAuditQuery();
  const [hasRun, setHasRun] = useState(false);

  useEffect(() => {
    triggerAudit(undefined);
    setHasRun(true);
  }, [triggerAudit]);

  const auditData = data?.data;
  const isSecure = auditData?.status === "VERIFIED_SECURE";

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white tracking-tight">Security & Record Audit</h3>
        <p className="text-xs sm:text-sm text-[#8e8e93]">
          Verify the cryptographic integrity, accuracy, and sequence of your financial records.
        </p>
      </div>
      <Separator className="bg-white/[0.08]" />

      {/* Ledger Integrity Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] flex items-center justify-center border border-[#e5c158]/25 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-white">Cryptographic Ledger Audit</h4>
                {hasRun && !isFetching && (
                  <Badge
                    className={
                      isSecure
                        ? "bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20 text-[10px] font-medium"
                        : "bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20 text-[10px] font-medium"
                    }
                  >
                    {isSecure ? "Verified Secure" : "Discrepancy Found"}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-[#8e8e93]">
                SHA-256 hash chaining validates that zero historical transactions have been modified or deleted.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => triggerAudit(undefined)}
            disabled={isFetching}
            className="rounded-xl border-white/[0.10] bg-white/[0.04] hover:bg-white/[0.08] text-white active:scale-[0.97] transition-all gap-1.5 self-start sm:self-auto cursor-pointer text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-[#e5c158]" : ""}`} />
            {isFetching ? "Auditing Records..." : "Run Security Audit"}
          </Button>
        </div>

        {/* Audit Result Display */}
        {isFetching ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-[#e5c158]" />
            <p className="text-xs text-[#8e8e93]">
              Computing SHA-256 hash blocks across all historical transactions...
            </p>
          </div>
        ) : isSecure ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-[#30d158]/10 text-[#30d158] flex items-center justify-center border border-[#30d158]/20 shrink-0 mt-0.5">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-white">All Records 100% Authentic and Verified</p>
              <p className="text-xs text-[#8e8e93] leading-relaxed">
                The cryptographic ledger chain has been audited from genesis to the latest block. No records have been tampered with, deleted, or silently modified.
              </p>
            </div>
          </div>
        ) : auditData ? (
          <div className="rounded-xl border border-[#ff453a]/20 bg-[#ff453a]/5 p-4 flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-[#ff453a]/10 text-[#ff453a] flex items-center justify-center border border-[#ff453a]/20 shrink-0 mt-0.5">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[#ff453a]">Ledger Discrepancy Detected</p>
              <p className="text-xs text-[#ff453a]/80 leading-relaxed">
                One or more entries did not match their expected cryptographic hash. Review recent manual edits or imports.
              </p>
            </div>
          </div>
        ) : null}

        {/* Metrics Grid */}
        {auditData && !isFetching && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8e8e93] mb-1">
                <Layers className="h-3.5 w-3.5 text-[#e5c158]" />
                Audited Blocks
              </div>
              <p className="text-lg font-semibold text-white tabular-nums">{auditData.chainDepth}</p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8e8e93] mb-1">
                <FileKey className="h-3.5 w-3.5 text-[#e5c158]" />
                Chain Status
              </div>
              <p className="text-lg font-semibold text-white">Intact</p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#8e8e93] mb-1">
                <Lock className="h-3.5 w-3.5 text-[#e5c158]" />
                Hash Integrity
              </div>
              <p className={`text-lg font-semibold tabular-nums ${isSecure ? "text-[#30d158]" : "text-[#ff453a]"}`}>
                {isSecure ? "100%" : "Mismatch"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

