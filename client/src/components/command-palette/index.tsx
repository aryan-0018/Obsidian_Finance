import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  LineChart,
  Settings,
  HelpCircle,
  Info,
  Mic,
  PlusCircle,
  FileSpreadsheet,
  Camera,
  ShieldCheck,
  Send,
  Coins,
  Search,
} from "lucide-react";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";
import { useUpdateUserMutation } from "@/features/user/userAPI";
import { useTypedSelector } from "@/app/hook";
import { toast } from "sonner";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useTypedSelector((state) => state.auth);
  const [updateUser] = useUpdateUserMutation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K or / (when not typing in an input/textarea)
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" &&
          !["INPUT", "TEXTAREA"].includes(
            (document.activeElement as HTMLElement)?.tagName
          ))
      ) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }

      // Alt+N for quick transaction
      if (e.altKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("obsidian:open-modal", {
            detail: { modal: "ADD_TRANSACTION" },
          })
        );
      }

      // Alt+V for Voice Terminal
      if ((e.altKey && e.key.toLowerCase() === "v") || (e.ctrlKey && e.key.toLowerCase() === "m")) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-voice-terminal"));
      }

      // Alt+A for Ledger Audit
      if (e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("obsidian:open-modal", {
            detail: { modal: "LEDGER_AUDIT" },
          })
        );
      }
    };

    const handleOpenCommand = () => setOpen(true);
    window.addEventListener("keydown", down);
    window.addEventListener("open-command-palette", handleOpenCommand);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("open-command-palette", handleOpenCommand);
    };
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const handleCurrencyChange = async (currency: string) => {
    try {
      const formData = new FormData();
      formData.append("currency", currency);
      await updateUser(formData).unwrap();
      toast.success(`Currency switched to ${currency}`);
    } catch {
      toast.error("Failed to update currency");
    }
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command, search transactions, or jump to a page..." />
        <CommandList>
          <CommandEmpty>No matching actions or pages found.</CommandEmpty>

          {/* Quick Actions */}
          <CommandGroup heading="Quick Actions">
            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  window.dispatchEvent(
                    new CustomEvent("obsidian:open-modal", {
                      detail: { modal: "ADD_TRANSACTION" },
                    })
                  )
                )
              }
            >
              <PlusCircle className="mr-2 h-4 w-4 text-[#e5c158]" />
              <span>Record New Transaction</span>
              <CommandShortcut>Alt + N</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  window.dispatchEvent(new CustomEvent("open-voice-terminal"))
                )
              }
            >
              <Mic className="mr-2 h-4 w-4 text-[#e5c158]" />
              <span>Voice Assistant (Hinglish / English)</span>
              <CommandShortcut>Alt + V</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  window.dispatchEvent(
                    new CustomEvent("obsidian:open-modal", {
                      detail: { modal: "RECEIPT_SCANNER" },
                    })
                  )
                )
              }
            >
              <Camera className="mr-2 h-4 w-4 text-emerald-400" />
              <span>Scan Receipt with OCR</span>
              <CommandShortcut>OCR</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  window.dispatchEvent(
                    new CustomEvent("obsidian:open-modal", {
                      detail: { modal: "IMPORT_STATEMENT" },
                    })
                  )
                )
              }
            >
              <FileSpreadsheet className="mr-2 h-4 w-4 text-sky-400" />
              <span>Import Bank Statement (PDF / CSV / XLSX)</span>
              <CommandShortcut>Import</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  window.dispatchEvent(
                    new CustomEvent("obsidian:open-modal", {
                      detail: { modal: "LEDGER_AUDIT" },
                    })
                  )
                )
              }
            >
              <ShieldCheck className="mr-2 h-4 w-4 text-amber-400" />
              <span>Verify Record Security</span>
              <CommandShortcut>Alt + A</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() =>
                  window.dispatchEvent(
                    new CustomEvent("obsidian:open-modal", {
                      detail: { modal: "TELEGRAM_COPILOT" },
                    })
                  )
                )
              }
            >
              <Send className="mr-2 h-4 w-4 text-[#e5c158]" />
              <span>Telegram Copilot Assistant</span>
              <CommandShortcut>Bot</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Navigation */}
          <CommandGroup heading="Navigation">
            <CommandItem
              onSelect={() => runCommand(() => navigate(PROTECTED_ROUTES.OVERVIEW))}
            >
              <LayoutDashboard className="mr-2 h-4 w-4 text-[#e5c158]" />
              <span>Dashboard</span>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runCommand(() => navigate(PROTECTED_ROUTES.TRANSACTIONS))
              }
            >
              <Receipt className="mr-2 h-4 w-4" />
              <span>Transactions</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate(PROTECTED_ROUTES.ANALYTICS))}
            >
              <LineChart className="mr-2 h-4 w-4 text-[#e5c158]" />
              <span>AI Advisor & Analytics</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate(PROTECTED_ROUTES.REPORTS))}
            >
              <FileText className="mr-2 h-4 w-4" />
              <span>Monthly Financial Reports</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate(PROTECTED_ROUTES.SETTINGS))}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings & Account Configuration</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate(PROTECTED_ROUTES.HELP))}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              <span>Help Center & FAQ</span>
            </CommandItem>

            <CommandItem
              onSelect={() => runCommand(() => navigate(PROTECTED_ROUTES.ABOUT))}
            >
              <Info className="mr-2 h-4 w-4" />
              <span>About Obsidian Finance</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Currency Switcher */}
          <CommandGroup heading="Active Currency Display">
            {["INR", "USD", "EUR", "GBP", "AED", "SGD", "JPY"].map((curr) => (
              <CommandItem
                key={curr}
                onSelect={() => runCommand(() => handleCurrencyChange(curr))}
              >
                <Coins className="mr-2 h-4 w-4 text-[#e5c158]" />
                <span>Set Currency to {curr}</span>
                {user?.currency === curr && (
                  <CommandShortcut>Active</CommandShortcut>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function CommandPaletteTriggerButton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
      className={`hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-[#e5c158]/40 text-xs text-[#a1a1aa] hover:text-white transition-all cursor-pointer ${className}`}
      title="Open Command Palette (Ctrl+K or ⌘K)"
    >
      <Search className="h-3.5 w-3.5 text-[#e5c158]" />
      <span className="hidden lg:inline text-[11px] font-normal">Search or Actions</span>
      <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[#a1a1aa] tracking-tight">
        ⌘K
      </kbd>
    </button>
  );
}

