import { CalendarClock, Loader2, Repeat, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format-currency";
import { getApiErrorMessage } from "@/lib/utils";
import { useTypedSelector } from "@/app/hook";
import {
  useGetSubscriptionRadarQuery,
  useGetWeeklyDigestQuery,
  useSendWeeklyDigestMutation,
} from "@/features/analytics/analyticsAPI";

export default function RecurringSummarySection() {
  const { user } = useTypedSelector((state) => state.auth);
  const currency = user?.currency || "INR";

  const { data: radarRes, isLoading: loadingRecurring } =
    useGetSubscriptionRadarQuery();
  const { data: digestRes, isLoading: loadingDigest } =
    useGetWeeklyDigestQuery();
  const [sendWeeklyDigest, { isLoading: isSending }] =
    useSendWeeklyDigestMutation();

  const recurring = radarRes?.data;
  const summary = digestRes?.data;

  const handleSendDigest = async () => {
    try {
      const res = await sendWeeklyDigest().unwrap();
      if (res.sent) {
        toast.success("Weekly summary sent to Telegram");
      } else {
        toast.info(res.message || "Pair Telegram in Settings first");
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Could not send summary"));
    }
  };

  return (
    <div className="space-y-10 pt-4 border-t border-white/[0.06]">
      {/* Recurring Bills & Subscriptions */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#fcfcfc] tracking-tight">
              Recurring Bills &amp; Subscriptions
            </h2>
            <p className="text-xs text-[#8e8e93] mt-0.5">
              Detected and scheduled commitments. Telegram reminders send 24 hours before due dates.
            </p>
          </div>
          {recurring && (
            <span className="text-xs text-[#e5c158] font-medium">
              Est. monthly total:{" "}
              {formatCurrency(recurring.summary.totalMonthlyRecurring, {
                currency,
              })}
            </span>
          )}
        </div>

        {loadingRecurring ? (
          <div className="text-xs text-[#8e8e93]">Checking recurring bills...</div>
        ) : !recurring || recurring.subscriptions.length === 0 ? (
          <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/60 border-dashed border-white/[0.10]">
            <CardContent className="py-10 text-center space-y-2">
              <CalendarClock className="h-6 w-6 mx-auto text-[#e5c158]/80" />
              <p className="text-sm font-medium text-[#fcfcfc]">
                No recurring bills detected yet
              </p>
              <p className="text-xs text-[#8e8e93] max-w-md mx-auto">
                Mark bills as recurring or record at least two billing cycles to surface upcoming renewals automatically.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {recurring.subscriptions.map((sub) => {
              const dueLabel =
                sub.daysUntilDue === 0
                  ? "Due today"
                  : sub.daysUntilDue === 1
                    ? "Tomorrow"
                    : `In ${sub.daysUntilDue} days`;

              return (
                <Card
                  key={sub.id}
                  className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]"
                >
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm text-[#fcfcfc]">
                          {sub.title}
                        </p>
                        <p className="text-xs text-[#8e8e93] capitalize mt-0.5">
                          {sub.category} • {sub.interval.toLowerCase()}
                        </p>
                      </div>
                      <span className="text-xs text-[#e5c158] shrink-0">
                        {dueLabel}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-lg font-semibold text-[#fcfcfc] tabular-nums">
                        {formatCurrency(sub.amount, { currency })}
                      </span>
                      <span className="text-xs text-[#8e8e93]">
                        {format(new Date(sub.nextDueDate), "MMM dd, yyyy")}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#8e8e93] pt-2 border-t border-white/[0.06]">
                      <span className="inline-flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {sub.source === "EXPLICIT"
                          ? "Scheduled"
                          : `${sub.occurrences} cycles`}
                      </span>
                      <span>
                        {formatCurrency(sub.monthlyEquivalent, { currency })}/mo
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Weekly Summary */}
      <section className="space-y-5 pt-4 border-t border-white/[0.06]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-[#fcfcfc] tracking-tight">
              Weekly Summary
            </h2>
            <p className="text-xs text-[#8e8e93] mt-0.5">
              Automatically delivered to Telegram every Sunday evening.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleSendDigest}
            disabled={isSending}
            className="rounded-xl border-white/[0.10] bg-white/[0.03] text-[#fcfcfc] hover:text-[#e5c158] hover:border-[#c1a063]/40 cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
            ) : (
              <Send className="h-3.5 w-3.5 mr-1.5" />
            )}
            Send to Telegram
          </Button>
        </div>

        {loadingDigest ? (
          <div className="text-xs text-[#8e8e93]">Preparing weekly summary...</div>
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
              <CardContent className="p-6 space-y-1.5">
                <p className="text-xs font-medium text-[#8e8e93]">7-Day Spending</p>
                <p className="text-2xl font-semibold text-[#fcfcfc] tabular-nums">
                  {formatCurrency(summary.thisWeekExpenses, { currency })}
                </p>
                <p
                  className={`text-xs ${
                    summary.deltaPercent > 0 ? "text-[#f43f5e]" : "text-[#8e8e93]"
                  }`}
                >
                  {summary.lastWeekExpenses > 0
                    ? `${summary.deltaPercent > 0 ? "+" : ""}${summary.deltaPercent}% vs prior week`
                    : "First week recorded"}
                </p>
              </CardContent>
            </Card>

            <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
              <CardContent className="p-6 space-y-1.5">
                <p className="text-xs font-medium text-[#8e8e93]">7-Day Income</p>
                <p className="text-2xl font-semibold text-[#e5c158] tabular-nums">
                  {formatCurrency(summary.thisWeekIncome, { currency })}
                </p>
                <p className="text-xs text-[#8e8e93]">Total inflows past 7 days</p>
              </CardContent>
            </Card>

            <Card className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
              <CardContent className="p-6 space-y-1.5">
                <p className="text-xs font-medium text-[#8e8e93]">Top Category</p>
                <p className="text-2xl font-semibold text-[#fcfcfc] capitalize">
                  {summary.topCategories[0]?.category || "None"}
                </p>
                <p className="text-xs text-[#8e8e93]">
                  {summary.topCategories[0]
                    ? formatCurrency(summary.topCategories[0].amount, { currency })
                    : "No expenses recorded"}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </div>
  );
}
