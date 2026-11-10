/* eslint-disable react-refresh/only-export-components */
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw } from "lucide-react";
import { _REPORT_STATUS, ReportStatusType } from "@/constant";
import { ReportType } from "@/features/report/reportType";
import { useResendReportMutation } from "@/features/report/reportAPI";
import { toast } from "sonner";

const ResendActionCell = ({ reportId }: { reportId: string }) => {
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
      className="rounded-xl border border-white/[0.12] bg-white/[0.03] text-white hover:text-[#e5c158] hover:border-[#c1a063]/40 active:scale-[0.98] transition-all text-xs font-medium"
      disabled={isLoading}
      onClick={handleResend}
    >
      <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
      {isLoading ? "Sending..." : "Resend"}
    </Button>
  );
};

export const reportColumns: ColumnDef<ReportType>[] = [
  {
    accessorKey: "period",
    header: "Report Period",
    meta: { className: "table-cell" },
    cell: ({ row }) => {
      const period = row.getValue("period") as string;
      const sentDate = row.original.sentDate ? new Date(row.original.sentDate) : null;
      return (
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-[#e5c158] shrink-0" />
            <span className="font-medium text-white text-xs sm:text-sm">{period}</span>
          </div>
          {sentDate && (
            <span className="sm:hidden text-[11px] text-[#a1a1aa] pl-5.5">
              {sentDate.toLocaleDateString()}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "sentDate",
    header: "Sent Date",
    meta: { className: "hidden sm:table-cell" },
    cell: ({ row }) => {
      const date = new Date(row.original.sentDate);
      return <span className="tabular-nums font-normal text-[#fcfcfc]">{date.toLocaleDateString()}</span>;
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { className: "table-cell" },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusStyles = {
        [_REPORT_STATUS.SENT]: "bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20",
        [_REPORT_STATUS.FAILED]: "bg-[#ff453a]/10 text-[#ff453a] border border-[#ff453a]/20",
        [_REPORT_STATUS.PENDING]: "bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/20",
        [_REPORT_STATUS.PROCESSING]: "bg-white/[0.08] text-white border border-white/[0.15]",
        [_REPORT_STATUS.NO_ACTIVITY]: "bg-white/[0.04] text-[#8e8e93] border border-white/[0.08]",
      };

      const style =
        statusStyles[status as ReportStatusType] || "bg-white/[0.04] text-[#8e8e93] border border-white/[0.08]";

      return (
        <span
          className={`inline-flex items-center rounded-full
         px-2.5 py-0.5 text-xs font-medium ${style}`}
        >
          {status}
        </span>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    id: "actions",
    header: "Actions",
    meta: { className: "table-cell text-right" },
    cell: ({ row }) => <ResendActionCell reportId={row.original._id} />,
  },
];
