import { useState } from "react";
import { Menu } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";
import { cn } from "@/lib/utils";
import Logo from "../logo/logo";
import { Button } from "../ui/button";
import { Sheet, SheetContent } from "../ui/sheet";
import { UserNav } from "./user-nav";
import LogoutDialog from "./logout-dialog";
import { useTypedSelector } from "@/app/hook";

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
          "w-full px-4 py-3 pb-3 lg:px-14 bg-[#0f0f0f] text-[#e8e0d4] border-b border-[#2a2520]",
          pathname === PROTECTED_ROUTES.OVERVIEW && "!pb-3"
        )}
      >
        <div className="w-full flex h-14 max-w-[var(--max-width)] items-center mx-auto">
          <div className="w-full flex items-center justify-between">
            {/* Left side - Logo */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="inline-flex md:hidden !cursor-pointer
               !bg-white/10 !text-white hover:bg-white/10"
                onClick={() => setIsOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>

              <Logo />
            </div>

            {/* Navigation*/}
            <nav className="hidden md:flex flex-1 justify-center items-center gap-x-6 overflow-x-auto mx-4">
              {routes?.map((route) => (
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn(
                    `w-full lg:w-auto font-normal py-4.5
                     hover:text-[#c1a063] border-none
                     text-[#e8e0d4]/60 focus:bg-[#c1a063]/10
                     transition !bg-transparent !text-[14.5px]
                     `,
                    pathname === route.href && "!text-[#c1a063]"
                  )}
                  asChild
                >
                  <NavLink key={route.href} to={route.href}>
                    {route.label}
                  </NavLink>
                </Button>
              ))}
            </nav>

            {/* Mobile Navigation */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetContent side="left" className="bg-[#111] border-r border-[#2a2520]">
                <nav className="flex flex-col gap-y-2 pt-9">
                  {routes?.map((route) => (
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        `w-full font-normal py-4.5
                       hover:bg-[#c1a063]/10 hover:text-[#c1a063] border-none
                       text-[#e8e0d4]/70 focus:bg-[#c1a063]/10
                       transition !bg-transparent justify-start`,
                        pathname === route.href && "!bg-[#c1a063]/10 !text-[#c1a063]"
                      )}
                      asChild
                    >
                      <NavLink key={route.href} to={route.href}>
                        {route.label}
                      </NavLink>
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            {/* {} */}
            {/* Right side - User actions */}
            <div className="flex items-center space-x-2 md:space-x-4">
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
