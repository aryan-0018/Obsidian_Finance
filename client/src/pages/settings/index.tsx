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
    { title: "Billing", href: PROTECTED_ROUTES.SETTINGS_BILLING },
    { title: "Telegram", href: PROTECTED_ROUTES.SETTINGS_COPILOT },
  ];
  return (
    <PageLayout
      title="Settings"
      subtitle="Manage your personal account, billing preferences, and connected services."
    >
      <div className="obsidian-card rounded-2xl p-6 md:p-8">
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
              "flex items-center px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150",
              isActive
                ? "bg-gradient-to-r from-[#e5c158]/20 to-[#c1a063]/15 text-[#e5c158] font-semibold border border-[#c1a063]/35 shadow-[0_2px_8px_rgba(229,193,88,0.15)]"
                : "text-[#a1a1aa] hover:text-white hover:bg-white/[0.05]"
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
