import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

export default function AiInsightShortcut() {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate("/analytics")}
            className="w-full h-full min-h-[160px] obsidian-card obsidian-card-interactive rounded-2xl p-6 flex flex-col cursor-pointer group active:scale-[0.98]"
        >
            {/* Top Subtitle Row */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-[#e5c158]/10 border border-[#e5c158]/25 flex items-center justify-center text-[#e5c158]">
                        <Sparkles className="size-3.5" />
                    </div>
                    <h2 className="text-xs sm:text-[13px] font-medium text-[#8e8e93] tracking-normal">
                        AI Financial Advisor
                    </h2>
                </div>
                <span className="text-xs text-[#e5c158] font-medium group-hover:text-white transition-colors flex items-center gap-1">
                    Open <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
            </div>

            {/* Main Content - Vertically Centered & Well-Proportioned */}
            <div className="flex-1 flex flex-col justify-center py-4">
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-white mb-2">
                    Obsidian Intelligence
                </h3>
                <p className="text-xs sm:text-[13px] text-[#8e8e93] leading-relaxed font-normal">
                    Ask questions about your spending trends, monthly budget, and projected savings.
                </p>
            </div>
        </div>
    );
}
