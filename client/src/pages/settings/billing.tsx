import { Separator } from "@/components/ui/separator";
import BillingPlanCard from "./_components/billing-plan-card";

const Billing = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-medium tracking-tight">Billing & Plans</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your subscription and premium features.
        </p>
      </div>
      <Separator className="bg-white/10" />

      <div className="w-full">
        <BillingPlanCard />
      </div>
    </div>
  );
};

export default Billing;
