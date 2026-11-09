import { useState } from "react";
import { Menu } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";
import { cn } from "@/lib/utils";
import Logo from "../logo/logo";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "../ui/sheet";
import { UserNav } from "./user-nav";
import LogoutDialog from "./logout-dialog";
import { useTypedSelector } from "@/app/hook";
import { TelegramCopilotButton } from "../telegram-copilot-modal";
import { VoiceTerminalTriggerButton } from "../voice-terminal";

const Navbar = () => {
  const { pathname } = useLocation();
  const { user } = useTypedSelector((state) => state.auth);

  const [isOpen, setIsOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const routes = [
    {
      href: PROTECTED_ROUTES.OVERVIEW,
      label: "Overview",
    },
    {
      href: PROTECTED_ROUTES.TRANSACTIONS,
      label: "Transactions",
    },
    {
      href: PROTECTED_ROUTES.REPORTS,
      label: "Reports",
    },
    {
      href: PROTECTED_ROUTES.ANALYTICS,
      label: "Analytics",
    },
    {
      href: PROTECTED_ROUTES.SETTINGS,
      label: "Settings",
    },
    {
      href: PROTECTED_ROUTES.ABOUT,
      label: "About",
    },
    {
      href: PROTECTED_ROUTES.HELP,
      label: "Help",
    },
  ];

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 w-full px-4 py-2.5 lg:px-14 bg-[#050507]/80 backdrop-blur-2xl text-[#f5f5f7] border-b border-white/[0.08] shadow-[0_4px_30px_rgba(0,0,0,0.65)]",
          pathname === PROTECTED_ROUTES.OVERVIEW && "!pb-2.5"
        )}
      >
        <div className="w-full flex h-14 max-w-[var(--max-width)] items-center mx-auto">
          <div className="w-full flex items-center justify-between">
            {/* Left side - Logo */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="inline-flex lg:hidden !cursor-pointer
               !bg-white/[0.05] !text-white hover:!bg-white/[0.10] border border-white/[0.08] active:scale-[0.97] rounded-xl"
                onClick={() => setIsOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>

              <Logo />
            </div>

            {/* Navigation*/}
            <nav className="hidden lg:flex flex-1 justify-center items-center gap-x-1 xl:gap-x-2 mx-4 p-1.5 bg-white/[0.04] backdrop-blur-2xl rounded-full border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_8px_24px_rgba(0,0,0,0.5)] max-w-fit select-none">
              {routes?.map((route) => {
                const isActive = pathname === route.href;
                return (
                  <NavLink
                    key={route.href}
                    to={route.href}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs xl:text-[13px] font-medium transition-all duration-150 ease-out cursor-pointer whitespace-nowrap active:scale-[0.97]",
                      isActive
                        ? "bg-gradient-to-r from-[#e5c158]/20 to-[#c1a063]/15 text-[#e5c158] font-semibold border border-[#c1a063]/40 shadow-[0_2px_12px_rgba(229,193,88,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]"
                        : "text-[#8e8e93] hover:text-white hover:bg-white/[0.06]"
                    )}
                  >
                    {route.label}
                  </NavLink>
                );
              })}
            </nav>

            {/* Mobile Navigation */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetContent side="left" className="bg-[#0b0b0e] border-r border-white/[0.08]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                  <SheetDescription>Quick navigation for Obsidian Finance</SheetDescription>
                </SheetHeader>
                <nav className="flex flex-col gap-y-2 pt-9">
                  {routes?.map((route) => (
                    <Button
                      key={route.href}
                      size="sm"
                      variant="ghost"
                      className={cn(
                        `w-full font-normal py-4.5
                       hover:bg-white/[0.06] hover:text-[#e5c158] border-none
                       text-[#a1a1aa] focus:bg-white/[0.08]
                       transition !bg-transparent justify-start rounded-xl`,
                        pathname === route.href && "!bg-[#e5c158]/10 !text-[#e5c158] font-medium"
                      )}
                      asChild
                    >
                      <NavLink to={route.href}>
                        {route.label}
                      </NavLink>
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            {/* {} */}
            {/* Right side - User actions */}
            <div className="flex items-center space-x-2 md:space-x-3">
              <VoiceTerminalTriggerButton />
              <TelegramCopilotButton />
              <UserNav
                userName={user?.name || ""}
                profilePicture={user?.profilePicture || ""}
                onLogout={() => setIsLogoutDialogOpen(true)}
              />
            </div>
          </div>
        </div>
      </header>

      <LogoutDialog
        isOpen={isLogoutDialogOpen}
        setIsOpen={setIsLogoutDialogOpen}
      />
    </>
  );
};

export default Navbar;
