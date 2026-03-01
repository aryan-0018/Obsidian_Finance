import PageLayout from "@/components/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const About = () => {
    return (
        <PageLayout
            title="About Obsidian Finance"
            subtitle="The Philosophy Behind the Platform."
            addMarginTop
        >
            <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-10">
                <Card className="border shadow-none bg-[#111] border-[#2a2520]">
                    <CardContent className="pt-8 px-8 space-y-6">
                        <div className="space-y-4">
                            <h2 className="text-2xl font-light text-[#c1a063] font-serif tracking-wide">
                                Our Heritage
                            </h2>
                            <p className="text-[#e8e0d4]/80 leading-relaxed font-light text-[15px]">
                                Obsidian Finance was forged not merely as a ledger, but as the
                                digital custodian of your financial legacy. In a world of fleeting
                                trends and noisy interfaces, we return to the timeless principles
                                of wealth stewardship: discretion, absolute precision, and
                                unwavering focus.
                            </p>
                        </div>

                        <Separator className="bg-[#2a2520]" />

                        <div className="space-y-4">
                            <h2 className="text-2xl font-light text-[#c1a063] font-serif tracking-wide">
                                The Obsidian Standard
                            </h2>
                            <p className="text-[#e8e0d4]/80 leading-relaxed font-light text-[15px]">
                                True wealth is silent. It does not demand attention; it commands
                                respect. Obsidian Finance embodies this ethos through an interface
                                stripped of distractions, presenting only what is essential for
                                elite capital management. From multi-currency portfolio tracking
                                to AI-driven market intelligence, every tool is calibrated for the
                                discerning investor who understands that time is the ultimate
                                asset.
                            </p>
                        </div>

                        <Separator className="bg-[#2a2520]" />

                        <div className="space-y-4">
                            <h2 className="text-xl font-light text-white tracking-wide">
                                "Curating Elite Wealth."
                            </h2>
                            <p className="text-[#e8e0d4]/60 text-sm italic font-serif">
                                Built for those who play the long game. Welcome to the firm.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </PageLayout>
    );
};

export default About;
