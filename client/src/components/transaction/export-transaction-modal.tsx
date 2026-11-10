import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useGetAllTransactionsQuery, useExportTransactionsEmailMutation } from "@/features/transaction/transactionAPI";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Mail, Filter } from "lucide-react";
import { DateRangeSelect, DateRangeType } from "@/components/date-range-select";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { usePapaParse } from "react-papaparse";
import { CATEGORIES } from "@/constant";

export default function ExportTransactionModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [dateRange, setDateRange] = useState<DateRangeType>(null);
    const [category, setCategory] = useState<string>("all");

    useEffect(() => {
        const handleOpen = (e: Event) => {
            const customEvent = e as CustomEvent<{ modal?: string }>;
            if (customEvent.detail?.modal === "EXPORT_TRANSACTIONS") {
                setIsOpen(true);
            }
        };
        window.addEventListener("obsidian:open-modal", handleOpen);
        return () => window.removeEventListener("obsidian:open-modal", handleOpen);
    }, []);

    const { data: transactionRes, isFetching: isTrxFetching } = useGetAllTransactionsQuery(
        {
            pageNumber: 1,
            pageSize: 10000,
        },
        { skip: !isOpen }
    );

    const transactions = transactionRes?.transations || [];
    const uniqueCategories = Array.from(
        new Set([
            ...CATEGORIES.map((c) => c.value),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ...transactions.map((t: any) => (typeof t.category === "string" ? t.category.toLowerCase() : "")),
        ])
    ).filter(Boolean);

    const { jsonToCSV } = usePapaParse();
    const [exportTransactionsEmail, { isLoading: isExportingEmail }] = useExportTransactionsEmailMutation();

    const handleDownload = () => {
        let exportTransactions = [...transactions];

        // Apply local date filter if selected
        if (dateRange?.from || dateRange?.to) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            exportTransactions = exportTransactions.filter((t: any) => {
                const trxDate = new Date(t.date);
                if (dateRange.from && trxDate < dateRange.from) return false;
                if (dateRange.to && trxDate > dateRange.to) return false;
                return true;
            });
        }

        // Apply local category filter if selected
        if (category !== "all") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            exportTransactions = exportTransactions.filter((t: any) =>
                typeof t.category === "string" && t.category.toLowerCase() === category.toLowerCase()
            );
        }

        if (exportTransactions.length === 0) {
            toast.error("No transactions found for the selected filters.");
            return;
        }

        // Format data for CSV
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const csvData = exportTransactions.map((t: any) => ({
            Date: format(new Date(t.date), "yyyy-MM-dd"),
            Title: t.title,
            Type: t.type,
            Category: t.category ? (t.category.charAt(0).toUpperCase() + t.category.slice(1)) : "Uncategorized",
            Amount: t.amount,
            Description: t.description || "",
            Status: t.status || "completed",
        }));

        const csvContent = jsonToCSV(csvData);
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `ObsidianFinance_Export_${format(new Date(), "yyyyMMdd")}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        toast.success("Transactions exported successfully.");
        setIsOpen(false);
    };

    const handleEmail = async () => {
        try {
            await exportTransactionsEmail({
                from: dateRange?.from?.toISOString(),
                to: dateRange?.to?.toISOString(),
                category: category !== "all" ? category : undefined,
            }).unwrap();
            toast.success("Export report has been emailed to your registered address.");
            setIsOpen(false);
        } catch (error: unknown) {
            const err = error as { data?: { message?: string } };
            toast.error(err?.data?.message || "Failed to send export email.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl border-white/[0.10] bg-white/[0.03] text-white hover:text-[#e5c158] hover:border-[#e5c158]/40 active:scale-[0.98] transition-all cursor-pointer">
                    <Download className="size-4 text-[#e5c158]" />
                    <span>Export</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] obsidian-card rounded-3xl bg-[#0e0e13]/95 backdrop-blur-2xl border border-white/[0.09] text-white shadow-[0_32px_64px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)] p-6 sm:p-7">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2.5 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/20">
                            <Download className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold tracking-tight text-white">Export Transactions</DialogTitle>
                            <DialogDescription className="text-[#8e8e93] text-xs font-normal">
                                Filter by date and category to download or email your transactions.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-3">
                    <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                        <label className="text-xs font-medium text-neutral-300 flex items-center gap-2">
                            <Filter className="size-3.5 text-[#e5c158]" /> Date Range
                        </label>
                        <DateRangeSelect dateRange={dateRange} setDateRange={setDateRange} />
                    </div>

                    <div className="space-y-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                        <label className="text-xs font-medium text-neutral-300">Category Filter</label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="rounded-xl bg-[#161616]/80 border-white/[0.08] text-white focus:ring-[#e5c158]">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl bg-[#0e0e12] border border-white/[0.08] text-white">
                                <SelectItem value="all">All Categories</SelectItem>
                                {uniqueCategories.map((cat: string) => (
                                    <SelectItem key={cat} value={cat} className="capitalize">
                                        {cat}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                    <Button
                        variant="ghost"
                        onClick={() => setIsOpen(false)}
                        className="rounded-xl text-[#8e8e93] hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleEmail}
                        className="rounded-xl border-white/[0.12] bg-white/[0.04] text-white hover:bg-white/[0.08] active:scale-[0.98] transition-all cursor-pointer"
                        disabled={isTrxFetching || isExportingEmail}
                    >
                        <Mail className="size-4 mr-1.5 text-[#e5c158]" />
                        {isExportingEmail ? "Sending..." : "Email Report"}
                    </Button>
                    <Button
                        onClick={handleDownload}
                        className="cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] active:scale-[0.98] transition-all"
                        disabled={isTrxFetching}
                    >
                        <Download className="size-4 mr-1.5" />
                        {isTrxFetching ? "Preparing..." : "Download CSV"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
