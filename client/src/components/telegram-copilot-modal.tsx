import { useState, useEffect } from "react";
import {
  useGetTelegramStatusQuery,
  useGenerateTelegramPairCodeMutation,
  useUnlinkTelegramMutation,
} from "@/features/user/userAPI";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  CheckCircle2,
  Copy,
  ExternalLink,
  Unlink,
  Loader2,
  Camera,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export function TelegramCopilotButton({
  variant = "outline",
  size = "sm",
  className = "",
}: {
  variant?: "outline" | "default" | "ghost" | "secondary";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
}) {
  const { data: statusData, isLoading, refetch } = useGetTelegramStatusQuery();
  const [generatePairCode, { isLoading: isGenerating }] = useGenerateTelegramPairCodeMutation();
  const [unlinkTelegram, { isLoading: isUnlinking }] = useUnlinkTelegramMutation();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{ modal?: string }>;
      if (customEvent.detail?.modal === "TELEGRAM_COPILOT") {
        setIsOpen(true);
      }
    };
    window.addEventListener("obsidian:open-modal", handleOpen);
    return () => window.removeEventListener("obsidian:open-modal", handleOpen);
  }, []);

  const [pairingInfo, setPairingInfo] = useState<{
    code: string;
    botUsername: string;
    link: string;
    expiresAt: string;
  } | null>(null);

  const isConnected = statusData?.data?.isConnected;
  const telegramUsername = statusData?.data?.telegramUsername;
  const botUsername = statusData?.data?.botUsername || "ObsidianFinanceBot";

  const handleGenerateCode = async () => {
    try {
      const res = await generatePairCode().unwrap();
      setPairingInfo(res.data);
      toast.success("Pairing code generated! Open Telegram to connect.");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error?.data?.message || "Failed to generate pairing code.");
    }
  };

  const handleUnlink = async () => {
    try {
      await unlinkTelegram().unwrap();
      setPairingInfo(null);
      refetch();
      toast.success("Telegram Copilot disconnected.");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error?.data?.message || "Failed to disconnect Telegram.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`flex items-center gap-2 rounded-xl border-white/[0.10] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.16] text-white active:scale-[0.98] transition-all cursor-pointer ${className}`}
        >
          <Send className="h-4 w-4 text-[#e5c158]" />
          <span className="text-xs font-medium hidden sm:inline">
            {isLoading
              ? "Telegram..."
              : isConnected
              ? `@${telegramUsername || "Telegram"}`
              : "Telegram"}
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md obsidian-card bg-[#0e0e13]/95 backdrop-blur-2xl border-white/[0.09] text-[#f5f5f7] p-6 sm:p-7 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <DialogHeader className="pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-[#e5c158]/10 flex items-center justify-center text-[#e5c158] border border-[#e5c158]/20">
              <Send className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                Telegram Assistant
                {isConnected ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] h-5 rounded-full px-2 font-medium">
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[#a1a1aa] text-[10px] h-5 border-white/[0.08] rounded-full px-2 font-normal">
                    Not Connected
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#a1a1aa]">
                Record expenses, upload receipt photos, and check balances on Telegram.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {isConnected ? (
            <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-white flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-[#e5c158]" />
                    Connected to @{telegramUsername || "User"}
                  </p>
                  <p className="text-[11px] text-[#a1a1aa] mt-1 leading-relaxed">
                    Any receipt photo or message sent to @{botUsername} automatically saves to your transactions in real-time.
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/[0.06]">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-white/[0.08] text-[#e5c158] hover:text-white"
                  asChild
                >
                  <a href={`https://t.me/${botUsername}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" /> Open Bot
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  className="h-7 text-xs text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  {isUnlinking ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Unlink className="h-3 w-3 mr-1" />}
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!pairingInfo ? (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5 space-y-2.5">
                  <p className="text-xs text-white font-medium">Link in seconds</p>
                  <p className="text-[11px] text-[#a1a1aa]">
                    Generate your secure token to pair Obsidian with your personal Telegram account.
                  </p>
                  <Button
                    onClick={handleGenerateCode}
                    disabled={isGenerating}
                    size="sm"
                    className="w-full gap-2 rounded-xl bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] hover:opacity-95 text-black font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] cursor-pointer"
                  >
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Generate One-Click Link Code
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-white">Pairing Code (15 min)</p>
                      <p className="text-[11px] text-[#a1a1aa]">Send this to @{pairingInfo.botUsername}</p>
                    </div>
                    <Badge className="font-mono text-sm px-2.5 py-0.5 font-bold text-[#e5c158] bg-black/60 border border-[#e5c158]/30">
                      {pairingInfo.code}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 text-xs rounded-xl bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] hover:opacity-95 text-black font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] gap-1.5"
                      asChild
                    >
                      <a href={pairingInfo.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open Telegram
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(`/start ${pairingInfo.code}`)}
                      className="text-xs border-white/[0.08] rounded-xl gap-1.5 text-white hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feature Highlights */}
          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.06]">
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2 text-center">
              <Camera className="h-4 w-4 mx-auto text-[#e5c158] mb-1" />
              <p className="text-[10px] font-medium text-white">Receipt Scan</p>
              <p className="text-[9px] text-[#a1a1aa]">Automated entry</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2 text-center">
              <MessageSquare className="h-4 w-4 mx-auto text-[#e5c158] mb-1" />
              <p className="text-[10px] font-medium text-white">Quick Log</p>
              <p className="text-[9px] text-[#a1a1aa]">Natural language</p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-2 text-center">
              <Sparkles className="h-4 w-4 mx-auto text-[#e5c158] mb-1" />
              <p className="text-[10px] font-medium text-white">Balance Check</p>
              <p className="text-[9px] text-[#a1a1aa]">Instant query</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
