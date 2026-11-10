import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useCreateInstantReportMutation } from "@/features/report/reportAPI";
import {
  startOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfDay,
  subDays,
  endOfMonth,
} from "date-fns";

export default function InstantReportModal() {
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState("THIS_MONTH");
  const [sendEmail, setSendEmail] = useState(true);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ modal?: string }>;
      if (customEvent.detail?.modal === "GENERATE_REPORT") {
        setOpen(true);
      }
    };
    window.addEventListener("obsidian:open-modal", handleOpen);
    return () => window.removeEventListener("obsidian:open-modal", handleOpen);
  }, []);

  const [createInstantReport, { isLoading }] = useCreateInstantReportMutation();

  const handleGenerate = async () => {
    const now = new Date();
    const today = endOfDay(now);
    let from = startOfMonth(today);
    let to = today;

    if (preset === "LAST_30_DAYS") {
      from = subDays(today, 29);
      to = today;
    } else if (preset === "LAST_MONTH") {
      const prevMonth = subMonths(today, 1);
      from = startOfMonth(prevMonth);
      to = endOfMonth(prevMonth);
    } else if (preset === "THIS_QUARTER") {
      from = startOfQuarter(today);
      to = today;
    } else if (preset === "LAST_QUARTER") {
      const prevQ = subQuarters(today, 1);
      from = startOfQuarter(prevQ);
      to = endOfQuarter(prevQ);
    } else if (preset === "THIS_YEAR") {
      from = startOfYear(today);
      to = today;
    } else if (preset === "ALL_TIME") {
      from = new Date(0);
      to = today;
    }

    try {
      await createInstantReport({
        from: from.toISOString(),
        to: to.toISOString(),
        sendEmail,
      }).unwrap();

      toast.success(
        sendEmail
          ? "Report generated and emailed to your inbox!"
          : "Report generated successfully!"
      );
      setOpen(false);
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ||
        "Failed to generate instant report. Ensure you have transactions.";
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-xl border-white/[0.12] bg-white/[0.03] text-white hover:text-[#e5c158] hover:border-[#c1a063]/50 !cursor-pointer flex items-center gap-2 active:scale-[0.98] transition-all"
        >
          <Sparkles className="h-4 w-4 text-[#e5c158]" />
          <span>Instant Report</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md obsidian-card rounded-3xl bg-[#0e0e13]/95 backdrop-blur-2xl border border-white/[0.08] text-white shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] p-6">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold tracking-tight text-white">
                Generate Instant Report
              </DialogTitle>
              <DialogDescription className="text-[#8e8e93] text-xs font-normal">
                Summary of your income, expenses, savings rate, and spending habits.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-[#8e8e93]">Select Time Period</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="w-full rounded-xl bg-white/[0.04] border-white/[0.08] text-white focus:ring-[#e5c158]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl obsidian-card bg-[#0e0e13] border border-white/[0.08] text-white">
                <SelectItem value="THIS_MONTH">This Month</SelectItem>
                <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
                <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                <SelectItem value="THIS_QUARTER">This Quarter</SelectItem>
                <SelectItem value="LAST_QUARTER">Last Quarter</SelectItem>
                <SelectItem value="THIS_YEAR">This Year (Year to Date)</SelectItem>
                <SelectItem value="ALL_TIME">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <div className="space-y-0.5">
              <Label className="text-white text-xs font-medium cursor-pointer">
                Send a copy to my email
              </Label>
              <p className="text-[11px] text-[#8e8e93] font-normal">
                Receive your full transaction summary and insights in your inbox
              </p>
            </div>
            <Switch
              checked={sendEmail}
              onCheckedChange={setSendEmail}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isLoading}
            className="rounded-xl text-[#8e8e93] hover:text-white active:scale-[0.98]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] active:scale-[0.98] transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Now
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
