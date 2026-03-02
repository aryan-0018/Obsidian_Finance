import { useState } from "react";
import { Banknote, Edit2, Check } from "lucide-react";
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
            toast.success("Base portfolio balance updated");
        } catch {
            toast.error("Failed to save portfolio balance to server");
        }
    };

    return (
        <div className="w-full bg-[#111] dark:bg-black text-white rounded-xl p-6 border border-[#c1a063]/30 shadow-lg relative overflow-hidden flex items-center justify-between h-full">
            {/* Abstract Gold Accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#c1a063]/10 blur-3xl rounded-full -mr-10 -mt-10 pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10 w-full">
                <div className="bg-[#c1a063]/20 p-3 rounded-full flex items-center justify-center">
                    <Banknote className="text-[#c1a063] size-6" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center w-full">
                        <h2 className="text-sm font-medium text-neutral-400 uppercase tracking-wider mb-1">
                            Total Portfolio Balance
                        </h2>
                    </div>
                    {isEditing ? (
                        <div className="flex items-center gap-2 mt-1">
                            <Input
                                type="number"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Enter base portfolio value"
                                className="w-48 bg-white/10 border-white/20 text-white focus:border-[#c1a063] focus:ring-[#c1a063]"
                                autoFocus
                            />
                            <Button size="icon" onClick={handleSave} className="bg-[#c1a063] hover:bg-[#a88a4e] text-black">
                                <Check className="size-4" />
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <span className="text-3xl font-light tracking-tight">
                                <CountUp
                                    start={0}
                                    end={trueBalance}
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
                                className="text-neutral-500 hover:text-[#c1a063] transition-colors mt-2"
                                title="Edit Base Balance"
                            >
                                <Edit2 className="size-4" />
                            </button>
                        </div>
                    )}
                    <p className="text-xs text-neutral-500 mt-1 uppercase font-semibold">
                        Base: {formatCurrency(baseBalance, { currency })} + Net Accrual: {formatCurrency(dynamicOffset, { currency, showSign: dynamicOffset < 0 })}
                    </p>
                </div>
            </div>
        </div>
    );
}
