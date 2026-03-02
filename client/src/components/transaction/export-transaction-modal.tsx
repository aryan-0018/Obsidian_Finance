import { useState } from "react";
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

export default function ExportTransactionModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [dateRange, setDateRange] = useState<DateRangeType>(null);
    const [category, setCategory] = useState<string>("all");

    const { data: transactionRes, isFetching: isTrxFetching } = useGetAllTransactionsQuery(
        {
            pageNumber: 1,
            pageSize: 10000,
        },
        { skip: !isOpen }
    );

    const transactions = transactionRes?.transations || [];
    const categoriesMap = new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    transactions.forEach((t: any) => {
        if (t.category && t.category._id) {
            categoriesMap.set(t.category._id, t.category.name);
        }
    });
    const categories = Array.from(categoriesMap.entries()).map(([id, name]) => ({ id, name }));

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
                t.category && typeof t.category === "object" && "_id" in t.category ? t.category._id === category : false
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
            Category: t.category && t.category.name ? t.category.name : "Uncategorized",
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
                type: category !== "all" ? category : undefined,
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
                <Button variant="outline" className="gap-2 border-[#c1a063]/30 text-[#c1a063] hover:bg-[#c1a063] hover:text-black">
                    <Download className="size-4" />
                    Export
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-[#111] dark:bg-black border-[#c1a063]/30 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-light text-[#c1a063]">Export Transactions</DialogTitle>
                    <DialogDescription className="text-neutral-400">
                        Select a period and category to generate your financial report.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300 flex border-b border-white/10 pb-2 mb-2 items-center gap-2">
                            <Filter className="size-4 text-[#c1a063]" /> Date Range
                        </label>
                        <DateRangeSelect dateRange={dateRange} setDateRange={setDateRange} />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-neutral-300">Category Filter</label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger className="bg-white/5 border-white/20">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#111] border-[#c1a063]/30 text-white">
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((cat: { id: string, name: string }) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                    <Button
                        variant="outline"
                        onClick={handleEmail}
                        className="border-[#c1a063] text-[#c1a063] hover:bg-[#c1a063]/10"
                        disabled={isTrxFetching || isExportingEmail}
                    >
                        <Mail className="size-4 mr-2" />
                        {isExportingEmail ? "Sending..." : "Email"}
                    </Button>
                    <Button
                        onClick={handleDownload}
                        className="bg-[#c1a063] text-black hover:bg-[#a88a4e]"
                        disabled={isTrxFetching}
                    >
                        <Download className="size-4 mr-2" />
                        {isTrxFetching ? "Preparing..." : "Download CSV"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
