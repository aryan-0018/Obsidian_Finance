import { useState } from "react";
import { Edit2, Check, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format-currency";
import { useTypedSelector, useAppDispatch } from "@/app/hook";
import { setPortfolioBalance } from "@/features/auth/authSlice";
import { useSummaryAnalyticsQuery } from "@/features/analytics/analyticsAPI";
import { DateRangeEnum } from "@/components/date-range-select";
import CountUp from "react-countup";
import { useUpdateUserMutation } from "@/features/user/userAPI";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function EditableBalanceCard() {
    const { user, portfolioBalance } = useTypedSelector((state) => state.auth);
    const dispatch = useAppDispatch();
    const currency = user?.currency || "INR";
    const baseBalance = isNaN(portfolioBalance) || !portfolioBalance ? 0 : portfolioBalance;

    // Use Analytics API to get mathematically driven income vs expenses
    const { data } = useSummaryAnalyticsQuery({ preset: DateRangeEnum.ALL_TIME });
    const dynamicOffset = data?.data?.availableBalance || 0;

    // Hybrid Logic: Base Amount + All-Time Income - All-Time Expenses
    const trueBalance = baseBalance + dynamicOffset;

    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [updateUser] = useUpdateUserMutation();

    const handleSave = async () => {
        let newBase = parseFloat(inputValue);
        if (isNaN(newBase)) {
            newBase = 0;
        }

        dispatch(setPortfolioBalance(newBase));
        setIsEditing(false);

        try {
            const formData = new FormData();
            formData.append("portfolioBalance", newBase.toString());
            await updateUser(formData).unwrap();
            toast.success("Balance updated successfully");
        } catch {
            toast.error("Failed to save portfolio balance to server");
        }
    };

    return (
        <div className="w-full obsidian-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-full">
            {/* Top Subtitle Row */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
                <h2 className="text-xs sm:text-[13px] font-medium text-[#8e8e93] tracking-normal">
                    Total Portfolio Balance
                </h2>
                <div
                    className="h-8 w-8 rounded-xl flex items-center justify-center border border-[#e5c158]/30 bg-gradient-to-br from-[#e5c158]/15 to-[#e5c158]/5 text-[#e5c158] shadow-[0_0_15px_rgba(229,193,88,0.14),inset_0_1px_0_rgba(255,255,255,0.15)] shrink-0 transition-transform duration-200 hover:scale-105 active:scale-95"
                    title="Portfolio Vault"
                >
                    <Landmark className="h-4 w-4" />
                </div>
            </div>

            {/* Main Balance Display */}
            <div className="py-3">
                {isEditing ? (
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="Enter starting balance"
                            className="w-56 h-10 bg-white/[0.06] border-white/[0.15] text-white focus:border-[#e5c158] focus:ring-[#e5c158] text-lg font-medium rounded-xl tabular-nums"
                            autoFocus
                        />
                        <Button
                            size="sm"
                            onClick={handleSave}
                            className="rounded-xl font-semibold px-4 h-10 cursor-pointer shadow-md"
                        >
                            <Check className="size-4 mr-1" /> Save
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setIsEditing(false)}
                            className="rounded-xl h-10 text-[#8e8e93] hover:text-white"
                        >
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-baseline gap-3 overflow-hidden">
                        <span className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight tabular-nums text-white truncate">
                            <CountUp
                                start={0}
                                end={trueBalance}
                                duration={0.6}
                                preserveValue
                                decimals={2}
                                decimalPlaces={2}
                                formattingFn={(val) => formatCurrency(val, { currency, showSign: val < 0 })}
                            />
                        </span>
                        <button
                            onClick={() => {
                                setInputValue(baseBalance.toString());
                                setIsEditing(true);
                            }}
                            className="text-[#8e8e93] hover:text-[#e5c158] transition-colors p-1 cursor-pointer active:scale-90"
                            title="Edit Base Portfolio Balance"
                        >
                            <Edit2 className="size-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Breakdown Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.06]">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
                    <span className="text-[#8e8e93]">Base:</span>
                    <span className="text-[#f5f5f7] font-medium tabular-nums">{formatCurrency(baseBalance, { currency })}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs">
                    <span className="text-[#8e8e93]">Cash Flow Accrual:</span>
                    <span className={cn(
                        "font-medium tabular-nums",
                        dynamicOffset >= 0 ? "text-[#30d158]" : "text-[#ff453a]"
                    )}>
                        {dynamicOffset >= 0 ? "+" : ""}
                        {formatCurrency(dynamicOffset, { currency, showSign: dynamicOffset < 0 })}
                    </span>
                </div>
            </div>
        </div>
    );
}
