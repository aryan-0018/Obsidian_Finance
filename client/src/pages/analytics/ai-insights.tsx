import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTypedSelector } from "@/app/hook";

export default function AiInsights() {
    const [insight, setInsight] = useState<string[] | string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const { accessToken } = useTypedSelector((state) => state.auth);

    const generateInsight = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || "/api"}/analytics/ai-insights`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to generate AI insight");
            }

            setInsight(data.data);
            toast.success("Intelligence gathering complete.");
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Analysts are currently unavailable");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full bg-[#111] dark:bg-black text-white rounded-xl p-6 border border-[#c1a063]/30 shadow-lg mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c1a063]/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />

            <div className="flex items-center gap-3 mb-4">
                <div className="bg-[#c1a063]/20 p-2 rounded-full">
                    <Sparkles className="text-[#c1a063] size-5" />
                </div>
                <h3 className="text-lg font-light tracking-tight text-[#c1a063]">Obsidian Intelligence</h3>
            </div>

            <p className="text-sm text-neutral-400 mb-6 font-light">
                Leverage our proprietary AI data models to analyze your recent cash flow velocity and wealth trajectory.
            </p>

            {!insight ? (
                <Button
                    onClick={generateInsight}
                    disabled={isLoading}
                    className="bg-[#c1a063] hover:bg-[#a88a4e] text-black w-full sm:w-auto font-light"
                >
                    {isLoading ? <Loader className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {isLoading ? "Synthesizing Data..." : "Generate Portfolio Insight"}
                </Button>
            ) : (
                <div className="space-y-4">
                    <div className="bg-black/50 border border-white/10 rounded-lg p-5 leading-relaxed text-sm text-neutral-200">
                        {isLoading ? (
                            <div className="flex items-center text-[#c1a063]">
                                <Loader className="h-4 w-4 animate-spin mr-2" />
                                <span className="animate-pulse">Synthesizing real-time mathematical models...</span>
                            </div>
                        ) : (
                            Array.isArray(insight) ? (
                                <ul className="space-y-4 list-none text-[14.5px]">
                                    {insight.map((point: string, index: number) => (
                                        <li key={index} className="flex gap-3 md:gap-4 items-start">
                                            <div className="min-w-1.5 h-1.5 rounded-full bg-[#c1a063] mt-2 shadow-[0_0_8px_rgba(193,160,99,0.5)]" />
                                            <p className="font-light text-neutral-300 leading-relaxed tracking-wide">{point}</p>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="font-light whitespace-pre-wrap">{insight}</p>
                            )
                        )}
                    </div>
                    {!isLoading && (
                        <Button
                            onClick={generateInsight}
                            variant="outline"
                            className="bg-transparent border-[#c1a063]/30 text-[#c1a063] hover:bg-[#c1a063]/10 text-xs w-full sm:w-auto"
                        >
                            Refresh Intelligence
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
}
