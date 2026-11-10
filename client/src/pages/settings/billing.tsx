import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const Billing = () => {
  const planDetails = [
    { label: "Plan Tier", value: "Obsidian Edition" },
    { label: "Billing Cycle", value: "Lifetime Access" },
    { label: "Renewal Date", value: "No Expiration" },
    { label: "Recurring Fee", value: "₹0.00 / month" },
    { label: "Payment Method", value: "None Required" },
  ];

  const features = [
    {
      title: "Receipt Scanning",
      description: "Extract amounts, vendors, and dates directly from uploaded receipt images.",
    },
    {
      title: "Telegram Assistant",
      description: "Log expenses and query your balances on the go via your Telegram bot.",
    },
    {
      title: "Automated Monthly Reports",
      description: "Scheduled email statements delivered straight to your inbox on the 1st of each month.",
    },
    {
      title: "Cryptographic Ledger Audit",
      description: "Tamper-evident verification of all transaction records using sequential hashing.",
    },
    {
      title: "AI Financial Insights",
      description: "Detailed category breakdowns, savings recommendations, and spending analysis.",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-white">Plan & Features</h3>
        <p className="text-xs text-[#8e8e93] mt-1 font-normal">
          Review your account subscription status and included workspace capabilities.
        </p>
      </div>
      <Separator className="bg-white/[0.06]" />

      <div className="space-y-5">
        {/* Subscription Status Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h4 className="text-base font-semibold text-white tracking-tight">Obsidian Lifetime</h4>
                <Badge className="bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/20 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                  Active
                </Badge>
              </div>
              <p className="text-xs text-[#8e8e93]">
                Full access to all financial tracking tools, automated reporting, and integrations.
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <span className="text-lg font-semibold text-white">Free</span>
              <p className="text-[11px] text-[#8e8e93]">Lifetime access</p>
            </div>
          </div>

          <div className="border-t border-white/[0.06] pt-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {planDetails.map((item) => (
                <div key={item.label} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <dt className="text-[#8e8e93] font-normal">{item.label}</dt>
                  <dd className="text-white font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Included Capabilities */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight">Included Features</h4>
            <p className="text-xs text-[#8e8e93] mt-0.5">
              Everything available with your active Obsidian account.
            </p>
          </div>

          <div className="divide-y divide-white/[0.06]">
            {features.map((feat) => (
              <div key={feat.title} className="py-3 first:pt-1 last:pb-1 flex items-start gap-3">
                <div className="h-5 w-5 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="h-3 w-3 text-[#e5c158]" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-white">{feat.title}</p>
                  <p className="text-[11px] text-[#8e8e93] leading-relaxed font-normal">
                    {feat.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Billing;
