import PageLayout from "@/components/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PieChart, Shield, LayoutDashboard, Database } from "lucide-react";

const Help = () => {
    return (
        <PageLayout
            title="Obsidian Wealth Guide"
            subtitle="Comprehensive instructions on managing your portfolio and leveraging our proprietary intelligence."
            addMarginTop
        >
            <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-10">

                {/* Section I: The Dashboard */}
                <Card className="border shadow-none bg-[#111] border-[#2a2520]">
                    <CardHeader className="pb-4 border-b border-[#2a2520]">
                        <CardTitle className="flex items-center gap-3 text-[#c1a063] font-serif font-light tracking-wide text-2xl">
                            <LayoutDashboard className="w-6 h-6" />
                            I. The Intelligence Dashboard
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-[#2a2520]">
                                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                                    Understanding the Summary Analytics
                                </AccordionTrigger>
                                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                                    The dashboard provides real-time oversight of your wealth.
                                    The <strong>Income</strong> and <strong>Expenses</strong> cards aggregate transactions executed within your designated date bounds.
                                    The <strong>Remaining Budget</strong> strictly tracks your expenses against your defined Lifetime Budget Limit, completely independent of incoming capital.
                                    Adjust the date pickers dynamically to filter legacy metrics.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2" className="border-[#2a2520]">
                                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                                    Editing the Absolute Budget Limit
                                </AccordionTrigger>
                                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                                    Within the 'Remaining' metric card on the dashboard, hover over the established budget value (e.g., / ₹500,000.00).
                                    Click the <strong>edit icon</strong> to re-calibrate your monthly or absolute spending ceiling.
                                    This instantly repopulates the available budget differential.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                {/* Section II: The Ledger */}
                <Card className="border shadow-none bg-[#111] border-[#2a2520]">
                    <CardHeader className="pb-4 border-b border-[#2a2520]">
                        <CardTitle className="flex items-center gap-3 text-[#c1a063] font-serif font-light tracking-wide text-2xl">
                            <Database className="w-6 h-6" />
                            II. Ledger & Transactions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-[#2a2520]">
                                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                                    Executing Capital Transfers (Adding Entries)
                                </AccordionTrigger>
                                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                                    Navigate to <strong>Transactions</strong> and select 'Add Transaction'.
                                    Define the principal <em>Amount</em>, assign an institutional <em>Category</em> (e.g., Equity, Real Estate, Procurement),
                                    and declare whether it is an Inflow (Income) or Outflow (Expense).
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2" className="border-[#2a2520]">
                                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                                    Automated CSV Auto-Mapping
                                </AccordionTrigger>
                                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                                    To import bulk institutional data, use the <strong>Import</strong> utility.
                                    Upload a standard `.csv` file.
                                    If your file contains header names matching the required schema (`amount`, `date`, `category`, `payee`, `notes`),
                                    Obsidian Intelligence will <strong>automatically map</strong> the fields and bypass manual classification, importing hundreds of ledgers in seconds.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-3" className="border-[#2a2520]">
                                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                                    Exporting Secure Reports to Email
                                </AccordionTrigger>
                                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                                    Need external reporting? Click <strong>Export</strong> from the Transactions ledger.
                                    You may instruct the system to filter by specific dates, types, or ledgers.
                                    Upon initiation, the system compiles a Base64 encoded CSV attachment and securely dispatches it directly to your registered private email inbox via Resend.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                {/* Section III: Intelligence & Analytics */}
                <Card className="border shadow-none bg-[#111] border-[#2a2520]">
                    <CardHeader className="pb-4 border-b border-[#2a2520]">
                        <CardTitle className="flex items-center gap-3 text-[#c1a063] font-serif font-light tracking-wide text-2xl">
                            <PieChart className="w-6 h-6" />
                            III. AI Intelligence & Analytics
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-[#2a2520]">
                                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                                    Consulting Obsidian AI
                                </AccordionTrigger>
                                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                                    The dashboard features the <strong>Obsidian Intelligence</strong> module.
                                    Click 'Ask AI' to interrogate your proprietary financial data.
                                    The AI analyzes your entire ledger history, calculating velocity of spend, category risk, and trajectory, outputting hyper-specific executive summaries.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2" className="border-[#2a2520]">
                                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                                    Reviewing Categorical Breakdowns
                                </AccordionTrigger>
                                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                                    Under <strong>Analytics</strong>, observe macroscopic overviews of capital flow.
                                    Visualize precise allocation percentages across asset classes and expenditures via the integrated pie charts, allowing for immediate re-balancing decisions.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </CardContent>
                </Card>

                {/* Section IV: Account Security & Settings */}
                <Card className="border shadow-none bg-[#111] border-[#2a2520]">
                    <CardHeader className="pb-4 border-b border-[#2a2520]">
                        <CardTitle className="flex items-center gap-3 text-[#c1a063] font-serif font-light tracking-wide text-2xl">
                            <Shield className="w-6 h-6" />
                            IV. Security & System Configuration
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="item-1" className="border-[#2a2520]">
                                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                                    Currency Calibration
                                </AccordionTrigger>
                                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                                    Ensure strict accuracy by setting your base currency.
                                    Navigate to <strong>Settings {">"} Account</strong>.
                                    Modify the display currency (e.g., INR or USD). The entire application's formatting protocols will instantaneously adapt.
                                </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="item-2" className="border-[#2a2520]">
                                <AccordionTrigger className="text-white hover:text-[#c1a063] hover:no-underline font-light tracking-wide">
                                    Obsidian Private Wealth Status
                                </AccordionTrigger>
                                <AccordionContent className="text-[#e8e0d4]/70 leading-relaxed font-light">
                                    Under <strong>Settings {">"} Billings</strong>, you can review your access tier.
                                    You hold the <em>Private Wealth</em> designation, guaranteeing lifetime complimentary access to all high-performance analytics and infrastructure without recurring friction.
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
