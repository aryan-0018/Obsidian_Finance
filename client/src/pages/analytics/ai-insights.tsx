import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Calendar, Copy, Check, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { DateRangeType } from "@/components/date-range-select/types";
import { useGetAiInsightsMutation } from "@/features/analytics/analyticsAPI";

interface AiInsightsProps {
    dateRange?: DateRangeType;
}

export default function AiInsights({ dateRange }: AiInsightsProps) {
    const [insight, setInsight] = useState<string[] | string | null>(null);
    const [analyzedPeriod, setAnalyzedPeriod] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [loadingStage, setLoadingStage] = useState(0);
    const [getAiInsights, { isLoading }] = useGetAiInsightsMutation();

    const activePeriodLabel = dateRange?.label || "Last 30 Days";

    const loadingStages = [
        `Checking your transactions for ${activePeriodLabel}...`,
        "Reviewing your top spending categories...",
        "Checking your monthly budget and savings...",
        "Writing your spending insights...",
    ];

    // Cycle loading stage during generation
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isLoading) {
            setLoadingStage(0);
            interval = setInterval(() => {
                setLoadingStage((prev) => (prev + 1) % loadingStages.length);
            }, 1100);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isLoading]);

    // Reset when date range changes so user knows to refresh for new period
    useEffect(() => {
        if (analyzedPeriod && analyzedPeriod !== activePeriodLabel) {
            setInsight(null);
            setAnalyzedPeriod(null);
        }
    }, [activePeriodLabel, analyzedPeriod]);

    const generateInsight = async () => {
        try {
            const res = await getAiInsights({
                preset: dateRange?.value,
                from: dateRange?.from ? new Date(dateRange.from).toISOString() : undefined,
                to: dateRange?.to ? new Date(dateRange.to).toISOString() : undefined,
            }).unwrap();

            setInsight(res.data);
            setAnalyzedPeriod(activePeriodLabel);
            toast.success(`Spending insights ready for ${activePeriodLabel}.`);
        } catch (error: unknown) {
            const err = error as { data?: { message?: string }; message?: string };
            toast.error(
                err?.data?.message || err?.message || "Spending insights temporarily unavailable."
            );
        }
    };

    const handleCopy = () => {
        if (!insight) return;
        const textToCopy = Array.isArray(insight)
            ? insight.map((p, i) => `${i + 1}. ${p}`).join("\n")
            : String(insight);

        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        toast.success("Insights copied to clipboard.");
        setTimeout(() => setCopied(false), 2000);
    };

    const renderFormattedText = (text: string) => {
        // Highlight currency figures and percentages with high-contrast tabular styling
        const tokens = text.split(/([$€£₹¥]?[\d,]+(?:\.\d+)?%?)/g);
        return tokens.map((tok, i) => {
            if (/^[$€£₹¥]?[\d,]+(?:\.\d+)?%?$/.test(tok) && tok.length > 1) {
                return (
                    <span key={i} className="font-semibold text-[#e5c158] tabular-nums">
                        {tok}
                    </span>
                );
            }
            return tok;
        });
    };

    return (
        <div className="w-full obsidian-card rounded-2xl p-6 md:p-8 mb-6 relative overflow-hidden bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/20">
                        <Sparkles className="size-4" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                            Spending Insights
                            <span className="text-[10px] font-medium tracking-tight px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#8e8e93]">
                                AI Powered
                            </span>
                        </h3>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1 text-xs text-[#e5c158]">
                    <Calendar className="size-3.5" />
                    <span>Analyzing: <strong className="font-medium text-white">{activePeriodLabel}</strong></span>
                </div>
            </div>

            <p className="text-xs text-[#8e8e93] mb-6 font-normal">
                A clear breakdown of your spending habits, top categories, and savings for{" "}
                <span className="text-white font-medium">{activePeriodLabel}</span>.
            </p>

            {isLoading ? (
                /* Dynamic Luxury Shimmer Skeleton */
                <div className="rounded-2xl bg-white/[0.02] border border-[#e5c158]/20 p-6 space-y-4 shadow-inner">
                    <div className="flex items-center gap-2 text-xs text-[#e5c158] font-medium animate-pulse">
                        <Loader2 className="size-4 animate-spin" />
                        <span>{loadingStages[loadingStage]}</span>
                    </div>

                    <div className="space-y-3 pt-1">
                        <div className="h-4 bg-white/[0.06] rounded-md animate-pulse w-11/12" />
                        <div className="h-4 bg-white/[0.04] rounded-md animate-pulse w-4/5" />
                        <div className="h-4 bg-white/[0.05] rounded-md animate-pulse w-5/6" />
                        <div className="h-4 bg-white/[0.03] rounded-md animate-pulse w-3/4" />
                    </div>
                </div>
            ) : !insight ? (
                <Button
                    onClick={generateInsight}
                    className="cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] active:scale-[0.98] transition-all w-full sm:w-auto"
                >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze {activePeriodLabel} Spending
                </Button>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-6 leading-relaxed text-xs text-neutral-200">
                        {Array.isArray(insight) ? (
                            <ul className="space-y-3.5 list-none text-xs">
                                {insight.map((point: string, index: number) => (
                                    <li key={index} className="flex gap-3 items-start">
                                        <div className="min-w-2 h-2 rounded-full bg-[#e5c158] mt-1.5 shadow-[0_0_8px_rgba(229,193,88,0.4)]" />
                                        <p className="font-normal text-[#fcfcfc] leading-relaxed">
                                            {renderFormattedText(point)}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="font-normal text-[#fcfcfc] whitespace-pre-wrap leading-relaxed">
                                {renderFormattedText(String(insight))}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Button
                            onClick={generateInsight}
                            variant="outline"
                            className="rounded-xl border-white/[0.10] bg-white/[0.03] text-white hover:bg-white/[0.08] hover:border-white/[0.20] text-xs active:scale-[0.98] transition-all cursor-pointer"
                        >
                            <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-[#e5c158]" />
                            Update {activePeriodLabel} Insights
                        </Button>

                        <Button
                            onClick={handleCopy}
                            variant="ghost"
                            className="rounded-xl text-[#8e8e93] hover:text-white hover:bg-white/[0.05] text-xs transition-all cursor-pointer active:scale-[0.98]"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3.5 w-3.5 mr-1.5 text-[#30d158]" />
                                    <span>Copied</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                                    <span>Copy Insights</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

