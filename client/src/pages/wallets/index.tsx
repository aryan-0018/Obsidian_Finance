import PageLayout from "@/components/page-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Handshake, Radio, Target, Wallet } from "lucide-react";
import AccountsTab from "./_components/accounts-tab";
import BudgetsGoalsTab from "./_components/budgets-goals-tab";
import SplitsTab from "./_components/splits-tab";
import RadarDigestTab from "./_components/radar-digest-tab";

export default function Wallets() {
  return (
    <PageLayout
      title="Wallets & Planning"
      subtitle="Multi-account balances, category budgets, savings goals, split IOUs, and recurring radar."
    >
      <Tabs defaultValue="accounts" className="w-full space-y-6">
        <TabsList className="bg-white/[0.04] border border-white/[0.08] p-1 rounded-2xl flex flex-wrap h-auto gap-1 w-full sm:w-fit">
          <TabsTrigger
            value="accounts"
            className="rounded-xl data-[state=active]:bg-[#e5c158]/20 data-[state=active]:text-[#e5c158] text-xs sm:text-sm gap-1.5 px-3.5 py-2 cursor-pointer"
          >
            <Wallet className="h-3.5 w-3.5" />
            Accounts &amp; Transfers
          </TabsTrigger>
          <TabsTrigger
            value="budgets"
            className="rounded-xl data-[state=active]:bg-[#e5c158]/20 data-[state=active]:text-[#e5c158] text-xs sm:text-sm gap-1.5 px-3.5 py-2 cursor-pointer"
          >
            <Target className="h-3.5 w-3.5" />
            Budgets &amp; Goals
          </TabsTrigger>
          <TabsTrigger
            value="splits"
            className="rounded-xl data-[state=active]:bg-[#e5c158]/20 data-[state=active]:text-[#e5c158] text-xs sm:text-sm gap-1.5 px-3.5 py-2 cursor-pointer"
          >
            <Handshake className="h-3.5 w-3.5" />
            Splits &amp; IOUs
          </TabsTrigger>
          <TabsTrigger
            value="radar"
            className="rounded-xl data-[state=active]:bg-[#e5c158]/20 data-[state=active]:text-[#e5c158] text-xs sm:text-sm gap-1.5 px-3.5 py-2 cursor-pointer"
          >
            <Radio className="h-3.5 w-3.5" />
            Radar &amp; Digest
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-0">
          <AccountsTab />
        </TabsContent>

        <TabsContent value="budgets" className="mt-0">
          <BudgetsGoalsTab />
        </TabsContent>

        <TabsContent value="splits" className="mt-0">
          <SplitsTab />
        </TabsContent>

        <TabsContent value="radar" className="mt-0">
          <RadarDigestTab />
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
