import PageLayout from "@/components/page-layout";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Cpu, Zap, Lock, Landmark, Sparkles } from "lucide-react";

const About = () => {
  return (
    <PageLayout
      title="About Obsidian Finance"
      subtitle="Simple, secure, and accurate personal finance tracking."
    >
      <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-16">
        <div className="obsidian-card rounded-2xl p-6 md:p-10 space-y-8">
          {/* Mission Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/25">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Our Philosophy
                </h2>
              </div>
            </div>
            <p className="text-[#a1a1aa] leading-relaxed font-normal text-[15px] pt-1">
              Obsidian Finance was designed to eliminate financial clutter and provide a clear, simple view of your personal money. We focus on core principles: mathematical accuracy down to the paise, secure record keeping, and complete privacy for your financial life.
            </p>
          </div>

          <Separator className="bg-white/[0.06]" />

          {/* Core Capabilities */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/25">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white tracking-tight">
                  Core Features
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="obsidian-card rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] space-y-2.5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2.5 text-[#e5c158]">
                  <div className="p-1.5 rounded-xl bg-[#e5c158]/10">
                    <Cpu className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">Instant Receipt Scanning</h3>
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed font-normal">
                  Smart recognition reads receipt totals, dates, and categories in seconds so your spending stays up to date without manual typing.
                </p>
              </div>

              <div className="obsidian-card rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] space-y-2.5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2.5 text-[#e5c158]">
                  <div className="p-1.5 rounded-xl bg-[#e5c158]/10">
                    <Zap className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">On-Demand & Scheduled Reports</h3>
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed font-normal">
                  Generate instant email breakdowns across custom time horizons or schedule automated monthly digests with itemized summaries.
                </p>
              </div>

              <div className="obsidian-card rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] space-y-2.5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2.5 text-[#e5c158]">
                  <div className="p-1.5 rounded-xl bg-[#e5c158]/10">
                    <Lock className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">Data Privacy & Isolation</h3>
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed font-normal">
                  Strict user data separation, secure session cookies, and multi-tenant isolation ensure complete confidentiality.
                </p>
              </div>

              <div className="obsidian-card rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] space-y-2.5 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2.5 text-[#e5c158]">
                  <div className="p-1.5 rounded-xl bg-[#e5c158]/10">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white tracking-tight">Exact Currency Precision</h3>
                </div>
                <p className="text-xs text-[#a1a1aa] leading-relaxed font-normal">
                  Financial calculations operate on integer units to eliminate rounding inconsistencies across all balances, analytics, and reports.
                </p>
              </div>
            </div>
          </div>

          <Separator className="bg-white/[0.06]" />

          {/* Philosophy quote */}
          <div className="space-y-2 text-center py-2">
            <h2 className="text-xl font-light text-white tracking-tight">
              &ldquo;Precision is the foundation of enduring wealth.&rdquo;
            </h2>
            <p className="text-[#e5c158] text-xs tracking-wider uppercase font-semibold">
              Obsidian Finance &mdash; Designed for those who build and preserve for the long horizon.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default About;
