import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useResendReportMutation } from "@/features/report/reportAPI";
import { toast } from "sonner";

export const ResendActionCell = ({ reportId }: { reportId: string }) => {
  const [resendReport, { isLoading }] = useResendReportMutation();

  const handleResend = () => {
    resendReport(reportId)
      .unwrap()
      .then(() => toast.success("Report resent successfully to your registered email"))
      .catch((err: unknown) => {
        const message =
          (err as { data?: { message?: string } })?.data?.message ||
          "Failed to resend report";
        toast.error(message);
      });
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="rounded-xl border border-white/[0.12] bg-white/[0.03] text-white hover:text-[#e5c158] hover:border-[#c1a063]/40 active:scale-[0.98] transition-all text-xs font-medium cursor-pointer"
      disabled={isLoading}
      onClick={handleResend}
    >
      <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
      {isLoading ? "Sending..." : "Resend"}
    </Button>
  );
};
