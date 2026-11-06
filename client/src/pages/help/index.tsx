import PageLayout from "@/components/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield,
  LayoutDashboard,
  Database,
  FileCheck,
} from "lucide-react";

const Help = () => {
  return (
    <PageLayout
      title="Obsidian Wealth & Platform Guide"
      subtitle="Comprehensive documentation on configuring, managing, and maximizing your Obsidian Finance ecosystem."
      addMarginTop
    >
      <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-12">
        {/* Section I: Dashboard & Live Metrics */}
        <Card className="border shadow-none bg-[#111] border-[#2a2520]">
          <CardHeader className="pb-4 border-b border-[#2a2520]">
            <CardTitle className="flex items-center gap-3 text-[#c1a063] font-serif font-light tracking-wide text-2xl">
              <LayoutDashboard className="w-6 h-6" />
              I. Executive Dashboard & Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="dash-1" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  Understanding Summary Metrics & Balance Calculation
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light space-y-2">
                  <p>
                    The dashboard consolidates your incoming cash flows and expenditures in real-time.
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-[#e8e0d4]/80">
                    <li>
                      <strong>Total Balance:</strong> Current calculated net capital derived from all inflows minus outflows.
                    </li>
                    <li>
                      <strong>Income & Expenses:</strong> Dynamic aggregations respecting your selected date window (e.g., This Month, Last 30 Days, Year-to-Date, or All Time).
                    </li>
                    <li>
                      <strong>Remaining Budget:</strong> Strict tracking against your personalized Monthly Budget ceiling, functioning independently of current income.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="dash-2" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  Calibrating Your Spending Budget & Monthly Ceilings
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  On the <strong>Remaining Budget</strong> card on your dashboard, locate the target spending limit. Click the edit icon to adjust your monthly ceiling. The gauge and percentage metrics update instantly across the entire application.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="dash-3" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  Filtering Historical Time Horizons
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  Use the global date range selector at the top-right of the dashboard to toggle between presets (e.g. <em>This Month</em>, <em>Last Month</em>, <em>Last 30 Days</em>, <em>This Year</em>, or <em>All Time</em>) or pick explicit custom calendar ranges.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section II: Ledger & Transaction Operations */}
        <Card className="border shadow-none bg-[#111] border-[#2a2520]">
          <CardHeader className="pb-4 border-b border-[#2a2520]">
            <CardTitle className="flex items-center gap-3 text-[#c1a063] font-serif font-light tracking-wide text-2xl">
              <Database className="w-6 h-6" />
              II. Ledger Management & Smart Ingestion
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tx-1" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  Recording Inflows & Outflows
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  Open the <strong>Add Transaction</strong> drawer from the dashboard or transactions page. Input the exact amount, date, payment method (Cash, Card, Bank Transfer, Auto-Debit), and classification. You can also flag recurring transfers with custom intervals (Daily, Weekly, Monthly, Yearly).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tx-2" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  AI Receipt Scanner (Optical Extraction)
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  Inside the transaction creation drawer, use the <strong>Scan Receipt</strong> tool to upload a photo or invoice screenshot. Powered by Gemini Multimodal AI, the scanner extracts the merchant name, date, total amount, and category, pre-populating the form automatically.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tx-3" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  CSV Bulk Ingestion & Column Mapping
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  Use the <strong>Import</strong> button on the transactions page to upload bank statements in `.csv` format. Obsidian's intelligent column mapper matches header variations (such as <em>Debit</em>, <em>Cost</em>, <em>Payee</em>, <em>Transaction Date</em>) and previews valid rows prior to database ingestion.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tx-4" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  Data Portability & Secure CSV Export
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  Export your full ledger or filtered queries anytime by selecting <strong>Export</strong>. Choose the format and timeframe, and a verified CSV file will be dispatched directly to your registered email address.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section III: Reports & Intelligence */}
        <Card className="border shadow-none bg-[#111] border-[#2a2520]">
          <CardHeader className="pb-4 border-b border-[#2a2520]">
            <CardTitle className="flex items-center gap-3 text-[#c1a063] font-serif font-light tracking-wide text-2xl">
              <FileCheck className="w-6 h-6" />
              III. AI Intelligence & Financial Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="rep-1" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  Instant On-Demand Reports via Email
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  Under the <strong>Reports</strong> page, click <strong>Instant Report</strong>. Select any period—ranging from <em>This Month</em>, <em>Last 30 Days</em>, <em>This Quarter</em>, to <em>All Time</em>. The system analyzes your income and expenses, calculates savings rates, drafts 3 custom AI financial insights, and sends a styled executive email breakdown complete with your key transaction ledger.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="rep-2" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  Automated Recurring Reports
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  Configure automated report dispatches (Weekly or Monthly) from the Reports configuration panel. The cron background service processes your period-end ledger and delivers periodic summaries without manual action.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="rep-3" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  Conversing with Obsidian AI Assistant
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  Click the <strong>AI Assistant</strong> floating pill or navigate to the AI console to query your financial database using natural language (e.g., <em>"How much did I spend on dining this month?"</em> or <em>"What is my highest expense category?"</em>).
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Section IV: Account, Security & Privacy */}
        <Card className="border shadow-none bg-[#111] border-[#2a2520]">
          <CardHeader className="pb-4 border-b border-[#2a2520]">
            <CardTitle className="flex items-center gap-3 text-[#c1a063] font-serif font-light tracking-wide text-2xl">
              <Shield className="w-6 h-6" />
              IV. Security, Currency & Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="sec-1" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  Display Currency & Localization
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  Obsidian supports localized standard formatting (INR ₹ / USD $). Ensure your display preferences are synced under <strong>Settings {">"} Account</strong>.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sec-2" className="border-[#2a2520]">
                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                  Session Privacy & Authentication
                </AccordionTrigger>
                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                  Your credentials and session tokens are strictly isolated. For maximum security, sign out of shared terminals and review your registered email address under profile settings.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Help;
