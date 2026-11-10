import { useState } from "react";
import {
  useGetTelegramStatusQuery,
  useGenerateTelegramPairCodeMutation,
  useUnlinkTelegramMutation,
} from "@/features/user/userAPI";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Unlink,
  Loader2,
  Camera,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export default function TelegramCopilotSettings() {
  const { data: statusData, isLoading, refetch } = useGetTelegramStatusQuery();
  const [generatePairCode, { isLoading: isGenerating }] = useGenerateTelegramPairCodeMutation();
  const [unlinkTelegram, { isLoading: isUnlinking }] = useUnlinkTelegramMutation();

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
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold tracking-tight text-white">Telegram Assistant</h3>
          {isConnected ? (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20">
              Connected
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-white/[0.04] text-[#8e8e93] border border-white/[0.08]">
              Disconnected
            </span>
          )}
        </div>
        <p className="text-xs text-[#8e8e93] mt-1 font-normal">
          Quick expense logging, photo receipt scanning, and balance inquiries directly from Telegram.
        </p>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Connection Status Card */}
      <div className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_15px_35px_rgba(0,0,0,0.5)] p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-[#e5c158]/10 border border-[#e5c158]/20 flex items-center justify-center text-[#e5c158]">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white tracking-tight">Telegram Sync Channel</h4>
              <p className="text-xs text-[#8e8e93] font-normal">
                {isLoading
                  ? "Checking pairing status..."
                  : isConnected
                  ? `Active link with @${telegramUsername || "User"}`
                  : "No device currently paired"}
              </p>
            </div>
          </div>
          <div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal bg-white/[0.04] text-[#fcfcfc] border border-white/[0.08]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#30d158]" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.04] text-[#8e8e93] border border-white/[0.08]">
                <AlertCircle className="h-3.5 w-3.5" />
                Unlinked
              </span>
            )}
          </div>
        </div>

        <div>
          {isConnected ? (
            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-white">
                    Active Sync
                  </p>
                  <p className="text-[11px] text-[#8e8e93] mt-0.5 font-normal">
                    Messages and scanned receipts sent to @{botUsername} are automatically saved to your transactions.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  className="rounded-xl text-[#ff453a] hover:bg-[#ff453a]/10 border-[#ff453a]/30 text-xs active:scale-[0.98]"
                >
                  {isUnlinking ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Unlink className="h-4 w-4 mr-1.5" />
                  )}
                  Disconnect
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!pairingInfo ? (
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div>
                    <p className="text-xs font-semibold text-white">Instant Pairing in 5 Seconds</p>
                    <p className="text-[11px] text-[#8e8e93] font-normal">
                      Generate a secure one-time token and link directly to your Telegram client.
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateCode}
                    disabled={isGenerating}
                    className="gap-2 shrink-0 cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] text-xs"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Generate Pairing Code
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Pairing Code Ready
                      </p>
                      <p className="text-[11px] text-[#8e8e93] font-normal">
                        Valid for 15 minutes. Send this code to @{pairingInfo.botUsername} or click below to connect.
                      </p>
                    </div>
                    <span className="tabular-nums font-semibold tracking-wider text-base px-3.5 py-1 text-[#e5c158] border border-[#e5c158]/30 rounded-xl bg-black/40">
                      {pairingInfo.code}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    <Button
                      size="sm"
                      className="gap-2 cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)]"
                      asChild
                    >
                      <a href={pairingInfo.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open in Telegram
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(`/start ${pairingInfo.code}`)}
                      className="gap-2 rounded-xl border-white/[0.12] bg-white/[0.04] text-white active:scale-[0.98]"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy Code
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => refetch()}
                      className="rounded-xl text-xs text-[#8e8e93] hover:text-white active:scale-[0.98]"
                    >
                      Check Status
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Capabilities & Examples */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="obsidian-card rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 text-[#e5c158] font-medium text-xs">
            <Camera className="h-4 w-4" />
            <span>Receipt Scanning</span>
          </div>
          <p className="text-[11px] text-[#8e8e93] font-normal leading-relaxed">
            Upload photos of store receipts, bills, or invoices. The system automatically detects amounts, dates, and categories.
          </p>
        </div>

        <div className="obsidian-card rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 text-[#e5c158] font-medium text-xs">
            <MessageSquare className="h-4 w-4" />
            <span>Text Logging</span>
          </div>
          <p className="text-[11px] text-[#8e8e93] font-normal leading-relaxed">
            Record expenses through natural messages like &ldquo;Spent ₹450 on lunch with card&rdquo; or &ldquo;Got ₹45,000 salary&rdquo;.
          </p>
        </div>

        <div className="obsidian-card rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center gap-2 text-[#e5c158] font-medium text-xs">
            <Sparkles className="h-4 w-4" />
            <span>Account Inquiries</span>
          </div>
          <p className="text-[11px] text-[#8e8e93] font-normal leading-relaxed">
            Quickly query your finances with &ldquo;What is my balance?&rdquo; or &ldquo;How much did I spend this week?&rdquo;.
          </p>
        </div>
      </div>
    </div>
  );
}

