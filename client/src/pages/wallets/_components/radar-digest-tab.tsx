import { CalendarClock, Loader2, Radio, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format-currency";
import { getApiErrorMessage } from "@/lib/utils";
import { useTypedSelector } from "@/app/hook";
import {
  useGetSubscriptionRadarQuery,
  useGetWeeklyDigestQuery,
  useSendWeeklyDigestMutation,
} from "@/features/analytics/analyticsAPI";
import { format } from "date-fns";

export default function RadarDigestTab() {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data: radarRes, isLoading: loadingRadar } =
    useGetSubscriptionRadarQuery();
  const { data: digestRes, isLoading: loadingDigest } =
    useGetWeeklyDigestQuery();
  const [sendWeeklyDigest, { isLoading: isSending }] =
    useSendWeeklyDigestMutation();

  const radar = radarRes?.data;
  const digest = digestRes?.data;

  const handleSendDigest = async () => {
    try {
      const res = await sendWeeklyDigest().unwrap();
      if (res.sent) {
        toast.success("Weekly wealth digest sent to your Telegram Copilot!");
      } else {
        toast.info(res.message || "Telegram Copilot is not paired yet.");
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to dispatch Telegram digest"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Weekly Wealth Digest Card */}
      <Card className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#e5c158]" />
              Proactive Weekly Wealth Digest
            </CardTitle>
            <p className="text-xs text-[#8e8e93] mt-0.5">
              Auto-dispatches every Sunday evening to Telegram with 7-day burn velocity, leaks, and upcoming EMIs.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSendDigest}
            disabled={isSending}
            className="rounded-xl cursor-pointer shrink-0"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1.5" />
            )}
            Send Digest to Telegram
          </Button>
        </CardHeader>
        <CardContent>
          {loadingDigest ? (
            <div className="text-xs text-[#8e8e93]">
              Generating 7-day digest...
            </div>
          ) : digest ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[11px] text-[#8e8e93]">7-Day Spend</div>
                <div className="text-lg font-bold text-white tabular-nums mt-0.5">
                  {formatCurrency(digest.thisWeekExpenses, { currency })}
                </div>
                <div
                  className={`text-[11px] mt-1 ${
                    digest.deltaPercent > 0
                      ? "text-rose-400"
                      : "text-emerald-400"
                  }`}
                >
                  {digest.lastWeekExpenses > 0
                    ? `${digest.deltaPercent > 0 ? "+" : ""}${digest.deltaPercent}% vs last week`
                    : "Baseline week"}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[11px] text-[#8e8e93]">7-Day Income</div>
                <div className="text-lg font-bold text-emerald-400 tabular-nums mt-0.5">
                  +{formatCurrency(digest.thisWeekIncome, { currency })}
                </div>
                <div className="text-[11px] text-[#8e8e93] mt-1">
                  Net 7-day inflows
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="text-[11px] text-[#8e8e93]">
                  Top Leak Category
                </div>
                <div className="text-lg font-bold text-[#e5c158] capitalize mt-0.5">
                  {digest.topCategories[0]?.category || "None"}
                </div>
                <div className="text-[11px] text-[#8e8e93] mt-1">
                  {digest.topCategories[0]
                    ? formatCurrency(digest.topCategories[0].amount, {
                        currency,
                      })
                    : "No expenses this week"}
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Subscription & EMI Radar */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Radio className="h-4 w-4 text-[#e5c158]" />
              Subscription &amp; EMI Radar
            </h3>
            <p className="text-xs text-[#8e8e93]">
              Combines explicit recurring bills and auto-detected patterns across your ledger. Telegram alerts fire 24h before charges hit.
            </p>
          </div>
          {radar && (
            <div className="px-3 py-1.5 rounded-xl bg-[#e5c158]/10 border border-[#e5c158]/25 text-xs text-[#e5c158] font-medium">
              Monthly Recurring Burn:{" "}
              {formatCurrency(radar.summary.totalMonthlyRecurring, {
                currency,
              })}
            </div>
          )}
        </div>

        {loadingRadar ? (
          <div className="text-xs text-[#8e8e93]">
            Scanning transactions for recurring charges...
          </div>
        ) : !radar || radar.subscriptions.length === 0 ? (
          <Card className="bg-[#0e0e13]/60 border-dashed border-white/[0.12] rounded-2xl">
            <CardContent className="py-10 text-center space-y-2">
              <CalendarClock className="h-7 w-7 mx-auto text-[#e5c158]/70" />
              <div className="text-sm font-medium text-white">
                No recurring subscriptions or EMIs detected yet
              </div>
              <p className="text-xs text-[#8e8e93] max-w-md mx-auto">
                Mark a transaction as recurring or log 2+ cycles of a bill (like Netflix, SIP, or Rent) and the radar will track it automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {radar.subscriptions.map((sub) => {
              const dueBadge =
                sub.daysUntilDue === 0
                  ? "Due Today"
                  : sub.daysUntilDue === 1
                    ? "Due Tomorrow"
                    : `In ${sub.daysUntilDue} days`;
              const isImminent = sub.daysUntilDue <= 3;

              return (
                <Card
                  key={sub.id}
                  className="bg-[#0e0e13]/85 border-white/[0.08] rounded-2xl"
                >
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-white">
                          {sub.title}
                        </div>
                        <div className="text-[11px] text-[#8e8e93] capitalize">
                          {sub.category} • {sub.interval.toLowerCase()}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${
                          isImminent
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-white/[0.05] text-[#a1a1aa] border-white/[0.1]"
                        }`}
                      >
                        {dueBadge}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold text-white tabular-nums">
                        {formatCurrency(sub.amount, { currency })}
                      </span>
                      <span className="text-[11px] text-[#8e8e93]">
                        Next: {format(new Date(sub.nextDueDate), "MMM dd, yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#8e8e93] pt-1 border-t border-white/[0.06]">
                      <span>
                        {sub.source === "EXPLICIT"
                          ? "Explicit Recurring"
                          : `Auto-Detected (${sub.occurrences}x)`}
                      </span>
                      <span>
                        ~{formatCurrency(sub.monthlyEquivalent, { currency })}/mo
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
