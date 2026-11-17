import { useGetFreedomMetricsQuery } from "@/features/analytics/analyticsAPI";
import { formatCurrency } from "@/lib/format-currency";
import { ShieldCheck } from "lucide-react";

export default function FreedomClockWidget() {
  const { data, isLoading } = useGetFreedomMetricsQuery();
  const metrics = data?.data;

  if (isLoading || !metrics) {
    return (
      <div className="w-full obsidian-card rounded-2xl p-6 border border-white/[0.08] bg-[#111114] h-full min-h-[180px] flex items-center justify-center">
        <span className="text-white/30 text-xs font-normal">Loading runway estimate...</span>
      </div>
    );
  }

  const currency = metrics.currency || "INR";
  const monthlyBurn = metrics.dailyBurnRate * 30;

  // Standard emergency buffer target (6 months)
  const sixMonthBufferTarget = metrics.dailyBurnRate * 180;
  const bufferProgress = sixMonthBufferTarget > 0
    ? Math.min(100, Math.max(0, Math.round((metrics.currentNetWealth / sixMonthBufferTarget) * 100)))
    : (metrics.currentNetWealth > 0 ? 100 : 0);

  return (
    <div className="w-full obsidian-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-full bg-[#111114] border border-white/[0.08]">
      {/* Top Header Row */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="space-y-0.5">
          <h2 className="text-xs sm:text-[13px] font-medium text-[#8e8e93] tracking-normal">
            Financial Runway
          </h2>
        </div>
        <div
          className="h-8 w-8 rounded-xl flex items-center justify-center border border-[#e5c158]/30 bg-gradient-to-br from-[#e5c158]/15 to-[#e5c158]/5 text-[#e5c158] shadow-[0_0_15px_rgba(229,193,88,0.14),inset_0_1px_0_rgba(255,255,255,0.15)] shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95"
          title="Runway & Safety Buffer"
        >
          <ShieldCheck className="h-4 w-4" />
        </div>
      </div>

      {/* Main Metric Display */}
      <div className="py-3 flex flex-col justify-center">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight tabular-nums text-white truncate">
            {metrics.formattedRunway}
          </span>
          <span className="text-xs sm:text-sm text-[#8e8e93] font-normal">
            runway
          </span>
        </div>
        <p className="text-xs text-[#8e8e93] mt-1 font-normal">
          {metrics.totalFreedomDays.toLocaleString("en-IN")} days of independent coverage
        </p>
      </div>

      {/* Bottom Breakdown Row */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
          <span className="text-[#8e8e93]">Average Spend:</span>
          <span className="text-[#f5f5f7] font-medium tabular-nums">
            {formatCurrency(monthlyBurn, { currency })}
            <span className="text-[#8e8e93] font-normal">/mo</span>
          </span>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
          <span className="text-[#8e8e93]">6-Mo Buffer:</span>
          <div className="w-12 h-1.5 bg-white/[0.08] rounded-full overflow-hidden inline-flex">
            <div
              className="h-full bg-[#c1a063] rounded-full"
              style={{ width: `${Math.min(100, Math.max(4, bufferProgress))}%` }}
            />
          </div>
          <span className="text-[#f5f5f7] font-medium tabular-nums">{bufferProgress}%</span>
        </div>
      </div>
    </div>
  );
}
