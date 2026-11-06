import { useState } from "react";
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
    } catch (err: any) {
      toast.error(
        err?.data?.message || "Failed to generate instant report. Ensure you have transactions."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-[#c1a063]/40 text-[#c1a063] hover:bg-[#c1a063]/10 !cursor-pointer flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4 text-[#c1a063]" />
          <span>Instant Report</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[#161616] border border-[#c1a063]/30 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-[#c1a063]/10 text-[#c1a063]">
              <FileText className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-semibold text-white">
              Generate Instant Report
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-400 text-sm">
            Generate an on-demand financial summary powered by Gemini AI with savings rate and spending insights.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label className="text-gray-300 font-medium">Select Period</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="w-full bg-[#202020] border-gray-700 text-white">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="bg-[#202020] border-gray-700 text-white">
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

          <div className="flex items-center justify-between p-3 rounded-lg bg-[#202020] border border-gray-800">
            <div className="space-y-0.5">
              <Label className="text-white text-sm cursor-pointer">
                Send copy to email
              </Label>
              <p className="text-xs text-gray-400">
                Receive the detailed breakdown and AI insights in your inbox
              </p>
            </div>
            <Switch
              checked={sendEmail}
              onCheckedChange={setSendEmail}
              className="data-[state=checked]:bg-[#c1a063]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isLoading}
            className="text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isLoading}
            className="bg-[#c1a063] hover:bg-[#a6864d] text-black font-medium"
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
