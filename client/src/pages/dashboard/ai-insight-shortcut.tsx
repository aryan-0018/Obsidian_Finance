import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";

export default function AiInsightShortcut() {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate("/analytics")}
            className="w-full h-full min-h-[160px] bg-gradient-to-br from-[#111] to-black text-white rounded-xl p-6 border border-[#c1a063]/20 shadow-lg relative overflow-hidden flex flex-col justify-between cursor-pointer group hover:border-[#c1a063]/50 transition-all duration-500"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c1a063]/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none group-hover:bg-[#c1a063]/20 transition-all duration-500" />

            <div className="flex-1">
                <div className="bg-[#c1a063]/20 p-2 rounded-full w-fit mb-3 group-hover:bg-[#c1a063]/30 transition-colors">
                    <Sparkles className="text-[#c1a063] size-5" />
                </div>
                <h3 className="text-lg font-light tracking-tight text-[#c1a063] mb-2 truncate">Obsidian Intelligence</h3>
                <p className="text-sm text-neutral-400 font-light leading-relaxed">
                    Access elite predictive financial modeling and bespoke wealth accumulation insights powered by our proprietary Gemini engine.
                </p>
            </div>

            <div className="mt-4 flex items-center text-sm font-light text-[#c1a063] group-hover:text-white transition-colors">
                Generate Portfolio Insight
                <ArrowRight className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
        </div>
    );
}
