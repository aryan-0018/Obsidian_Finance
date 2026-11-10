import PageLayout from "@/components/page-layout";
import { cn } from "@/lib/utils";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";
import { Link, Outlet, useLocation } from "react-router-dom";

interface ItemPropsType {
  items: {
    title: string;
    href: string;
  }[];
}

const Settings = () => {
  const sidebarNavItems = [
    { title: "Account", href: PROTECTED_ROUTES.SETTINGS },
    { title: "Security & Audit", href: PROTECTED_ROUTES.SETTINGS_SECURITY },
    { title: "Billing", href: PROTECTED_ROUTES.SETTINGS_BILLING },
    { title: "Telegram", href: PROTECTED_ROUTES.SETTINGS_COPILOT },
  ];
  return (
    <PageLayout
      title="Settings"
      subtitle="Manage your personal account, billing preferences, and connected services."
    >
      <div className="obsidian-card rounded-2xl p-6 md:p-8 bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08]">
        <div
          className="flex flex-col space-y-8 lg:flex-row lg:space-x-12
       lg:space-y-0"
        >
          <aside className="mr-4 lg:w-1/5">
            <SidebarNav items={sidebarNavItems} />
          </aside>
          <div className="flex-1 lg:max-w-2xl">
            <Outlet />
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

function SidebarNav({ items }: ItemPropsType) {
  const { pathname } = useLocation();
  return (
    <nav className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0 lg:space-y-1 select-none">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex items-center px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 active:scale-[0.98]",
              isActive
                ? "bg-white/[0.08] text-white font-semibold border border-white/[0.12] shadow-sm"
                : "text-[#8e8e93] hover:text-white hover:bg-white/[0.04]"
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}

export default Settings;
