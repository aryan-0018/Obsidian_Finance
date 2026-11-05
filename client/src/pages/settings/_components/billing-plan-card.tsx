import { Check, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BillingPlanCardProps {
  planName?: string;
  tagline?: string;
  price?: string;
  pricePeriod?: string;
  isCurrent?: boolean;
  features?: string[];
}

const DEFAULT_FEATURES = [
  "Proprietary Google Gemini AI Financial Modeling",
  "Unlimited Transaction Ingestion & Categorization",
  "Automated Monthly Wealth Summary Reports via Resend",
  "Real-time Quantitative Net Flow & Intensity Analytics",
  "Intelligent CSV Ingestion with Auto-Schema Detection",
  "Encrypted Cloud Receipt & Document Storage",
];

const BillingPlanCard = ({
  planName = "Obsidian Private Wealth",
  tagline = "Unrestricted access to institutional-grade analytics, algorithmic cashflow tracking, and generative financial intelligence.",
  price = "Free",
  pricePeriod = "Complimentary Lifetime Tier",
  isCurrent = true,
  features = DEFAULT_FEATURES,
}: BillingPlanCardProps) => {
  return (
    <div className="bg-[#111] dark:bg-black border border-[#c1a063]/30 rounded-xl p-8 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#c1a063]/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
        <div className="flex-1 space-y-4">
          <div className="flex items-center gap-3">
            {isCurrent && (
              <Badge className="bg-[#c1a063] text-black font-semibold text-xs tracking-wider uppercase hover:bg-[#c1a063]">
                Current Active Tier
              </Badge>
            )}
            <span className="flex items-center text-xs text-[#c1a063] gap-1 font-mono">
              <ShieldCheck className="size-4" />
              Institutional Protocol
            </span>
          </div>

          <div>
            <h2 className="text-3xl font-light text-white font-serif tracking-wide">{planName}</h2>
            <p className="text-[#e8e0d4]/70 max-w-xl font-light text-[15px] mt-2 leading-relaxed">
              {tagline}
            </p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <h4 className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-3">
              Included Capabilities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {features.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#e8e0d4]/80">
                  <div className="rounded-full bg-[#c1a063]/20 p-1 flex-shrink-0">
                    <Check className="size-3 text-[#c1a063]" />
                  </div>
                  <span className="font-light">{feat}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Cost & Plan Status */}
        <div className="flex flex-col justify-center items-center text-center md:w-56 flex-shrink-0 bg-white/5 rounded-lg p-6 border border-white/10 self-stretch md:self-auto">
          <div className="text-4xl font-extralight text-white mb-1">{price}</div>
          <p className="text-xs text-[#c1a063] uppercase tracking-wide font-medium">{pricePeriod}</p>
          <div className="mt-4 pt-4 border-t border-white/10 w-full text-[11px] text-neutral-400 font-mono">
            Status: <span className="text-green-400">ACTIVE & VERIFIED</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPlanCard;
