import { Separator } from "@/components/ui/separator";
import { AccountForm } from "./_components/account-form";

const Account = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-white">Account Details</h3>
        <p className="text-xs text-[#8e8e93] mt-1 font-normal">
          Update your public profile, photo, and preferences.
        </p>
      </div>
      <Separator className="bg-white/[0.06]" />
      <AccountForm />
    </div>
  );
};

export default Account;
