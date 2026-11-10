import { Link } from "react-router-dom";
import TransactionTable from "@/components/transaction/transaction-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";
import { ArrowRight } from "lucide-react";

const DashboardRecentTransactions = () => {
  return (
    <Card className="obsidian-card rounded-2xl overflow-hidden bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
      <CardHeader className="!pb-3 pt-5 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div>
            <CardTitle className="text-base sm:text-lg font-semibold text-white tracking-tight">Recent Transactions</CardTitle>
            <CardDescription className="text-xs text-[#8e8e93] font-normal">Latest verified inflows, outflows, and transfers</CardDescription>
          </div>
          <CardAction>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="rounded-xl border-white/[0.10] bg-white/[0.03] text-white hover:text-[#e5c158] hover:border-[#c1a063]/40 text-xs active:scale-[0.98] transition-all gap-1.5 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
            >
              <Link to={PROTECTED_ROUTES.TRANSACTIONS}>
                <span>View All Transactions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </CardAction>
        </div>
        <Separator className="mt-4 bg-white/[0.06]" />
      </CardHeader>
      <CardContent className="pt-2 px-3 sm:px-6 pb-6">
        <TransactionTable pageSize={10} isShowPagination={false} />
      </CardContent>
    </Card>
  );
};

export default DashboardRecentTransactions;
