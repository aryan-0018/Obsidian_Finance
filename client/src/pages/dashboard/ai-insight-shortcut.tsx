import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

export default function AiInsightShortcut() {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate("/analytics")}
            className="w-full h-full min-h-[160px] obsidian-card obsidian-card-interactive rounded-2xl p-6 flex flex-col justify-between cursor-pointer group active:scale-[0.98]"
        >
            <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-lg bg-[#e5c158]/10 border border-[#e5c158]/25 flex items-center justify-center text-[#e5c158]">
                            <Sparkles className="size-3.5" />
                        </div>
                        <h2 className="text-xs font-medium text-[#8e8e93] tracking-normal">
                            AI Financial Advisor
                        </h2>
                    </div>
                    <span className="text-[11px] text-[#e5c158] font-medium group-hover:text-white transition-colors flex items-center gap-1">
                        Open <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                    </span>
                </div>

                <div className="pt-3">
                    <h3 className="text-base font-semibold tracking-tight text-white mb-1">
                        Smart Financial Assistant
                    </h3>
                    <p className="text-xs text-[#8e8e93] leading-relaxed font-normal">
                        Ask questions about your spending trends, monthly budget, and projected savings.
                    </p>
                </div>
            </div>

            <div className="pt-3 mt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-[#8e8e93]">
                <span>Ask questions in plain English</span>
                <span className="text-[#e5c158] font-medium text-[11px]">Ready</span>
            </div>
        </div>
    );
}
