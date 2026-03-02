import { Separator } from "@/components/ui/separator";

const Billing = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-medium tracking-tight">Billing & Plans</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and premium features.
        </p>
      </div>
      <Separator className="bg-white/10" />

      <div className="w-full">
        {/* Current Plan Card */}
        <div className="bg-[#111] dark:bg-black border border-[#c1a063]/30 rounded-xl p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#c1a063]/5 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="inline-block bg-[#c1a063] text-black text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4">
                Current Plan
              </div>
              <h2 className="text-3xl font-light text-white mb-2 font-serif tracking-wide">Obsidian Private Wealth</h2>
              <p className="text-[#e8e0d4]/70 max-w-md font-light text-[15px]">
                You are currently on the exclusive Private Wealth tier, granting you unrestricted access to proprietary analytics and prescriptive AI intelligence.
              </p>
            </div>

            {/* Vertical Separator for Desktop / Horizontal for Mobile */}
            <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-[#c1a063]/30 to-transparent self-stretch my-4" />
            <div className="block md:hidden h-px w-full bg-gradient-to-r from-transparent via-[#c1a063]/30 to-transparent my-4" />

            {/* Right Side: Cost */}
            <div className="flex flex-col justify-center items-center text-center md:w-64 flex-shrink-0">
              <div className="text-5xl font-extralight text-white mb-2">Free</div>
              <p className="text-[13px] text-[#c1a063] uppercase tracking-wide">Complimentary plan</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
