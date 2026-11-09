import PageLayout from "@/components/page-layout";
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
      title="Obsidian Platform Guide"
      subtitle="A clear guide on how to manage your transactions, track budgets, and use AI features in Obsidian Finance."
    >
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-16">
        {/* Section I: Dashboard & Live Metrics */}
        <div className="obsidian-card rounded-2xl p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
            <div className="p-2.5 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/25">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold tracking-widest text-[#e5c158] uppercase">Section I</span>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Executive Dashboard & Real-Time Metrics
              </h2>
            </div>
          </div>
          <div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="dash-1" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Understanding Summary Metrics & Balance Calculation
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal space-y-2.5 pb-4">
                  <p>
                    The dashboard consolidates your incoming cash flows and expenditures in real-time with zero latency.
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-xs text-[#fcfcfc]">
                    <li>
                      <strong className="text-white">Total Balance:</strong> Current calculated net capital derived from all inflows minus outflows.
                    </li>
                    <li>
                      <strong className="text-white">Income & Expenses:</strong> Dynamic aggregations respecting your selected date window (e.g., This Month, Last 30 Days, Year-to-Date, or All Time).
                    </li>
                    <li>
                      <strong className="text-white">Remaining Budget:</strong> Strict tracking against your personalized Monthly Budget ceiling, functioning independently of current income.
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="dash-2" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Setting Your Spending Budget & Monthly Limits
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  On the <strong>Remaining Budget</strong> card on your dashboard, locate the target spending limit. Click the edit icon to adjust your monthly limit. The progress bar and remaining amount update instantly across the entire application.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="dash-3" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Filtering by Date and Time Period
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  Use the date range selector at the top-right of the dashboard to choose preset periods (like <em>This Month</em>, <em>Last Month</em>, <em>Last 30 Days</em>, <em>This Year</em>, or <em>All Time</em>) or pick custom dates on the calendar.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Section II: Transactions & Data Import */}
        <div className="obsidian-card rounded-2xl p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
            <div className="p-2.5 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/25">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold tracking-widest text-[#e5c158] uppercase">Section II</span>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Transactions & Data Import
              </h2>
            </div>
          </div>
          <div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="tx-1" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Adding Income & Expense Transactions
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  Open the <strong>Add Transaction</strong> drawer from the dashboard or transactions page. Input the exact amount, date, payment method (Cash, Card, Bank Transfer, Auto-Debit), and classification. You can also flag recurring transfers with custom intervals (Daily, Weekly, Monthly, Yearly).
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tx-2" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  AI Receipt Scanner
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  Inside the transaction creation drawer, use the <strong>Scan Receipt</strong> tool to upload a photo or invoice screenshot. The scanner extracts the merchant name, date, total amount, and category, pre-populating the form automatically.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tx-3" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Bank Statement & CSV Import
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  Use the <strong>Import</strong> button on the transactions page to upload bank statements in PDF or CSV format. Obsidian's column mapper matches common header variations and previews valid rows prior to saving.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="tx-4" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Data Export & CSV Download
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  Export your full transaction history or filtered results anytime by clicking <strong>Export</strong>. Choose the timeframe, and a clean CSV file will be sent directly to your email address.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Section III: Reports & Insights */}
        <div className="obsidian-card rounded-2xl p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
            <div className="p-2.5 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/25">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold tracking-widest text-[#e5c158] uppercase">Section III</span>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Financial Reports & AI Insights
              </h2>
            </div>
          </div>
          <div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="rep-1" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Instant On-Demand Reports via Email
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  Under the <strong>Reports</strong> page, click <strong>Instant Report</strong>. Select any period—such as <em>This Month</em>, <em>Last 30 Days</em>, <em>This Quarter</em>, or <em>All Time</em>. The system summarizes your income, expenses, and savings rate, generates helpful AI insights, and sends a clean breakdown directly to your email.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="rep-2" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Automated Recurring Reports
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  Set up automated reports (Weekly or Monthly) from the Reports settings. Obsidian will automatically calculate your summaries and email your report on schedule.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="rep-3" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Asking Questions to Obsidian AI
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  Click the <strong>AI Assistant</strong> button or open the AI tab to ask questions about your money in plain English (for example, <em>"How much did I spend on food this month?"</em> or <em>"What is my highest spending category?"</em>).
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Section IV: Account, Security & Privacy */}
        <div className="obsidian-card rounded-2xl p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
            <div className="p-2.5 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/25">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold tracking-widest text-[#e5c158] uppercase">Section IV</span>
              <h2 className="text-xl font-semibold text-white tracking-tight">
                Security, Currency & Account Settings
              </h2>
            </div>
          </div>
          <div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="sec-1" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Display Currency & Localization
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  Obsidian supports localized standard formatting (INR ₹ / USD $). Ensure your display preferences are synced under <strong>Settings &gt; Account</strong>.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sec-2" className="border-white/[0.06]">
                <AccordionTrigger className="text-white hover:text-[#e5c158] hover:no-underline font-medium text-[15px] py-4">
                  Session Privacy & Authentication
                </AccordionTrigger>
                <AccordionContent className="text-[#a1a1aa] leading-relaxed font-normal text-xs pb-4">
                  Your credentials and session tokens are strictly isolated. For maximum security, sign out of shared terminals and review your registered email address under profile settings.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default Help;
