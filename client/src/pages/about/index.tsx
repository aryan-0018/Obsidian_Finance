import PageLayout from "@/components/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Cpu, Zap, Lock, Landmark, Sparkles } from "lucide-react";

const About = () => {
  return (
    <PageLayout
      title="About Obsidian Finance"
      subtitle="Precision Engineering for Personal Capital & Wealth Intelligence."
      addMarginTop
    >
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-12">
        <Card className="border shadow-none bg-[#111] border-[#2a2520]">
          <CardContent className="pt-8 px-8 space-y-8">
            {/* Mission Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#c1a063]/10 text-[#c1a063]">
                  <Landmark className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-light text-[#c1a063] font-serif tracking-wide">
                  The Vision
                </h2>
              </div>
              <p className="text-[#e8e0d4]/80 leading-relaxed font-light text-[15px]">
                Obsidian Finance was engineered to eliminate financial clutter and provide a clear,
                uncompromising lens on your wealth. In an era dominated by superficial apps and ad-heavy
                aggregators, Obsidian returns to first principles: uncompromising accuracy, intelligent
                automation, and total control over your financial narrative.
              </p>
            </div>

            <Separator className="bg-[#2a2520]" />

            {/* Core Capabilities */}
            <div className="space-y-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#c1a063]/10 text-[#c1a063]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="text-2xl font-light text-[#c1a063] font-serif tracking-wide">
                  Core Architectural Pillars
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#161616] border border-[#2a2520] space-y-2">
                  <div className="flex items-center gap-2 text-[#c1a063]">
                    <Cpu className="h-4 w-4" />
                    <h3 className="text-sm font-medium text-white">Gemini AI Intelligence</h3>
                  </div>
                  <p className="text-xs text-[#e8e0d4]/70 leading-relaxed">
                    Embedded AI models analyze your cash flow, detect category surges, draft instant
                    on-demand intelligence reports, and parse receipt images into structured entries in seconds.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#161616] border border-[#2a2520] space-y-2">
                  <div className="flex items-center gap-2 text-[#c1a063]">
                    <Zap className="h-4 w-4" />
                    <h3 className="text-sm font-medium text-white">On-Demand & Automated Reports</h3>
                  </div>
                  <p className="text-xs text-[#e8e0d4]/70 leading-relaxed">
                    Generate instant PDF/email breakdowns across custom horizons or schedule automated
                    dispatches directly to your inbox with full transaction ledgers and savings ratios.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#161616] border border-[#2a2520] space-y-2">
                  <div className="flex items-center gap-2 text-[#c1a063]">
                    <Lock className="h-4 w-4" />
                    <h3 className="text-sm font-medium text-white">Enterprise Security & Isolation</h3>
                  </div>
                  <p className="text-xs text-[#e8e0d4]/70 leading-relaxed">
                    Protected with end-to-end tokenized JWT session management, strictly scoped user data
                    boundaries, encrypted cloud storage, and secure transmission protocols.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#161616] border border-[#2a2520] space-y-2">
                  <div className="flex items-center gap-2 text-[#c1a063]">
                    <ShieldCheck className="h-4 w-4" />
                    <h3 className="text-sm font-medium text-white">Cent-Exact Precision</h3>
                  </div>
                  <p className="text-xs text-[#e8e0d4]/70 leading-relaxed">
                    Financial ledgers operate down to the smallest integer units (paise/cents) to prevent
                    floating-point rounding anomalies across your analytics and budgets.
                  </p>
                </div>
              </div>
            </div>

            <Separator className="bg-[#2a2520]" />

            {/* Philosophy quote */}
            <div className="space-y-3">
              <h2 className="text-xl font-light text-white tracking-wide">
                "Precision is the foundation of enduring wealth."
              </h2>
              <p className="text-[#e8e0d4]/60 text-sm italic font-serif">
                Obsidian Finance — Designed for those who build and preserve for the long horizon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default About;
