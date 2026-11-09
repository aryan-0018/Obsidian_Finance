import { Separator } from "@/components/ui/separator";
import { Sparkles, ShieldCheck, Check } from "lucide-react";

const Billing = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-white">Plan & Features</h3>
        <p className="text-xs text-[#a1a1aa] mt-1 font-normal">
          Manage your plan and see all available features.
        </p>
      </div>
      <Separator className="bg-white/[0.06]" />

      <div className="w-full">
        {/* Membership Overview Card */}
        <div className="obsidian-card rounded-2xl p-5 sm:p-8 md:p-10 relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-1.5 bg-[#e5c158]/15 border border-[#c1a063]/30 text-[#e5c158] text-xs font-medium px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Active Plan</span>
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Obsidian Plan</h2>
                <p className="text-[#a1a1aa] max-w-lg font-normal text-sm mt-1.5 leading-relaxed">
                  You are currently on the active plan. Enjoy instant receipt scanning, Telegram assistant sync, automated monthly reports, and automatic record verification.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                <div className="flex items-center gap-2 text-xs text-[#fcfcfc]">
                  <Check className="h-4 w-4 text-[#e5c158]" />
                  <span>Instant Receipt Scanner</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#fcfcfc]">
                  <Check className="h-4 w-4 text-[#e5c158]" />
                  <span>Telegram Assistant Sync</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#fcfcfc]">
                  <Check className="h-4 w-4 text-[#e5c158]" />
                  <span>Automatic Record Verification</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#fcfcfc]">
                  <Check className="h-4 w-4 text-[#e5c158]" />
                  <span>Automated Monthly Email Reports</span>
                </div>
              </div>
            </div>

            {/* Vertical Separator for Desktop / Horizontal for Mobile */}
            <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-[#c1a063]/30 to-transparent self-stretch my-2" />
            <div className="block md:hidden h-px w-full bg-gradient-to-r from-transparent via-[#c1a063]/30 to-transparent my-2" />

            {/* Right Side: Cost */}
            <div className="flex flex-col justify-center items-center text-center md:w-56 shrink-0 p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
              <div className="text-5xl font-light text-white tracking-tight tabular-nums">Free</div>
              <p className="text-xs text-[#e5c158] font-medium mt-1">Included</p>
              <div className="flex items-center gap-1.5 mt-3 text-[11px] text-[#a1a1aa] font-normal">
                <ShieldCheck className="h-3.5 w-3.5 text-[#e5c158]" />
                <span>Zero Subscription Fees</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
