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
      .catch((err: any) => toast.error(err?.data?.message || "Failed to resend report"));
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="font-normal border-[#c1a063]/30 text-[#c1a063] hover:bg-[#c1a063]/10 hover:text-[#c1a063]"
      disabled={isLoading}
      onClick={handleResend}
    >
      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
      {isLoading ? "Sending..." : "Resend"}
    </Button>
  );
};

export const reportColumns: ColumnDef<ReportType>[] = [
  {
    accessorKey: "period",
    header: "Report Period",
    size: 150,
    cell: ({ row }) => {
      const period = row.getValue("period") as string;
      return (
        <div className="flex items-center gap-2 lg:!w-10">
          <Clock className="h-3.5 w-3.5 opacity-50 shrink-0" />
          <span>{period}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "sentDate",
    header: "Sent Date",
    size: 100,
    cell: ({ row }) => {
      const date = new Date(row.original.sentDate);
      return date.toLocaleDateString();
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    size: 100,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const statusStyles = {
        [_REPORT_STATUS.SENT]: "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-400 border border-green-500/20",
        [_REPORT_STATUS.FAILED]: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-400 border border-red-500/20",
        [_REPORT_STATUS.PENDING]: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400 border border-yellow-500/20",
        [_REPORT_STATUS.PROCESSING]: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-500/20",
        [_REPORT_STATUS.NO_ACTIVITY]: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border border-gray-700",
      };

      const style =
        statusStyles[status as ReportStatusType] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";

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
    size: 100,
    cell: ({ row }) => <ResendActionCell reportId={row.original._id} />,
  },
];
