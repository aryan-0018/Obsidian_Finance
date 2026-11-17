import { useState } from "react";
import {
  useGetApiKeyStatusQuery,
  useGenerateApiKeyMutation,
  useRevokeApiKeyMutation,
  useTestSmsIngestMutation,
} from "@/features/user/userAPI";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Key,
  Copy,
  Check,
  Smartphone,
  Send,
  Trash2,
  AlertTriangle,
  Loader2,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface TestTransactionData {
  title?: string;
  amount?: number;
  category?: string;
  externalRef?: string;
  [key: string]: unknown;
}

export default function SmsSyncSettings() {
  const { data: statusData, isLoading: isLoadingStatus } = useGetApiKeyStatusQuery();
  const [generateApiKey, { isLoading: isGenerating }] = useGenerateApiKeyMutation();
  const [revokeApiKey, { isLoading: isRevoking }] = useRevokeApiKeyMutation();
  const [testSmsIngest, { isLoading: isTesting }] = useTestSmsIngestMutation();

  const [rawSecretKey, setRawSecretKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Test simulator state
  const [testSms, setTestSms] = useState(
    "HDFC Bank: Rs 450.00 debited from a/c **8921 on 17-11-26 to VPA swiggy@icici (UPI Ref 432190123456). Avl bal: Rs 12345.00"
  );
  const [testSender, setTestSender] = useState("VM-HDFCBK");
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    isDuplicate?: boolean;
    data?: TestTransactionData;
  } | null>(null);

  const hasKey = statusData?.data?.hasKey;
  const keyPrefix = statusData?.data?.prefix;
  const keyCreatedAt = statusData?.data?.createdAt;

  // Determine base API url
  const apiBase =
    import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") ||
    window.location.origin;
  const webhookUrl = `${apiBase}/api/sms/ingest`;

  const handleGenerateKey = async () => {
    try {
      const res = await generateApiKey().unwrap();
      setRawSecretKey(res.data.apiKey);
      toast.success("New API key generated! Copy and store it securely.");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error?.data?.message || "Failed to generate API key");
    }
  };

  const handleRevokeKey = async () => {
    if (!window.confirm("Are you sure you want to revoke your API key? iOS Shortcut automations using this key will immediately stop working.")) {
      return;
    }
    try {
      await revokeApiKey().unwrap();
      setRawSecretKey(null);
      setTestResult(null);
      toast.success("API key revoked successfully.");
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      toast.error(error?.data?.message || "Failed to revoke API key");
    }
  };

  const handleCopy = (text: string, type: "key" | "url") => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const handleRunTest = async () => {
    const keyToUse = rawSecretKey || keyPrefix;
    if (!keyToUse) {
      toast.error("Please generate an API key first before testing.");
      return;
    }
    if (!rawSecretKey) {
      toast.error("For the test simulator, please generate a fresh key or pass the active raw key.");
      return;
    }

    try {
      const res = await testSmsIngest({
        message: testSms,
        sender: testSender,
        apiKey: rawSecretKey,
      }).unwrap();

      setTestResult(res as { success: boolean; message: string; isDuplicate?: boolean; data?: TestTransactionData });
      if (res.success) {
        toast.success(res.isDuplicate ? "Duplicate identified cleanly!" : "SMS parsed and transaction committed!");
      } else {
        toast.error(res.message);
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      const msg = error?.data?.message || "Test ingestion request failed";
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold tracking-tight text-white">
            iOS Shortcuts & SMS Automation
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20">
            Native iOS
          </span>
        </div>
        <p className="text-xs text-[#8e8e93] mt-1 font-normal">
          Direct, zero-credential SMS ingestion. When your bank sends a UPI or card debit alert, iOS Shortcuts forwards it to your private webhook in under 2 seconds.
        </p>
      </div>

      <Separator className="bg-white/[0.06]" />

      {/* Security Banner */}
      <div className="rounded-2xl bg-[#0e0e13]/80 border border-white/[0.08] p-4 flex items-start gap-3.5 text-xs text-[#8e8e93]">
        <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#e5c158] shrink-0">
          <Shield className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-white">Zero-Knowledge Financial Security</p>
          <p className="text-[11px] leading-relaxed">
            No bank passwords, NetBanking logins, or SMS screen-reading apps. iOS executes inside Apple's sandboxed Personal Automations, pushing only the matched alert directly to your encrypted Obsidian ledger.
          </p>
        </div>
      </div>

      {/* Card 1: API Key & Webhook Setup */}
      <div className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_15px_35px_rgba(0,0,0,0.5)] p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-[#e5c158]/10 border border-[#e5c158]/20 flex items-center justify-center text-[#e5c158]">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-white tracking-tight">Private Webhook Key</h4>
              <p className="text-xs text-[#8e8e93]">
                {isLoadingStatus
                  ? "Loading key metadata..."
                  : hasKey
                  ? `Active API Key (${keyPrefix})`
                  : "No active webhook key"}
              </p>
            </div>
          </div>
          <div>
            {hasKey ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal bg-white/[0.04] text-[#8e8e93] border border-white/[0.08]">
                Not Configured
              </span>
            )}
          </div>
        </div>

        {/* Webhook Endpoint Display */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#8e8e93] uppercase tracking-wider">
            Ingestion Webhook URL
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] font-mono text-xs text-white select-all overflow-x-auto whitespace-nowrap">
              {webhookUrl}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCopy(webhookUrl, "url")}
              className="rounded-xl border-white/[0.08] hover:bg-white/[0.06] text-xs h-10 px-3 shrink-0"
            >
              {copiedUrl ? (
                <Check className="h-4 w-4 text-[#30d158]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* API Key Display or Generation */}
        <div className="space-y-3 pt-2">
          {rawSecretKey ? (
            <div className="rounded-2xl bg-[#e5c158]/5 border border-[#e5c158]/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#e5c158]">
                <AlertTriangle className="h-4 w-4" />
                Save your key immediately
              </div>
              <p className="text-[11px] text-[#8e8e93]">
                This key is hashed using SHA-256 and will never be shown again once you navigate away.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/60 border border-[#e5c158]/30 font-mono text-xs text-[#e5c158] select-all break-all">
                  {rawSecretKey}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleCopy(rawSecretKey, "key")}
                  className="rounded-xl bg-[#e5c158] text-black hover:bg-[#e5c158]/90 font-medium text-xs h-10 px-4 shrink-0"
                >
                  {copiedKey ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  Copy Key
                </Button>
              </div>
            </div>
          ) : hasKey ? (
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <p className="text-xs font-medium text-white font-mono">{keyPrefix}</p>
                <p className="text-[11px] text-[#8e8e93] mt-0.5">
                  Generated {keyCreatedAt ? new Date(keyCreatedAt).toLocaleDateString("en-IN") : "recently"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateKey}
                  disabled={isGenerating}
                  className="rounded-xl border-white/[0.08] hover:bg-white/[0.04] text-xs h-9"
                >
                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeKey}
                  disabled={isRevoking}
                  className="rounded-xl text-[#ff453a] hover:bg-[#ff453a]/10 border-[#ff453a]/30 text-xs h-9"
                >
                  {isRevoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                  Revoke
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleGenerateKey}
              disabled={isGenerating}
              className="rounded-xl bg-white text-black hover:bg-white/90 text-xs font-medium px-4 h-10"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Key className="h-4 w-4 mr-2" />
              )}
              Generate Private Webhook Key
            </Button>
          )}
        </div>
      </div>

      {/* Card 2: Interactive Test Simulator */}
      {rawSecretKey && (
        <div className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_15px_35px_rgba(0,0,0,0.5)] p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Webhook Test Simulator</h4>
                <p className="text-[11px] text-[#8e8e93]">
                  Simulate an incoming bank SMS payload before configuring your iPhone.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-[#8e8e93]">Bank Sender Header</label>
              <input
                type="text"
                value={testSender}
                onChange={(e) => setTestSender(e.target.value)}
                placeholder="e.g. VM-HDFCBK"
                className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-white/20 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-[#8e8e93]">SMS Alert Body</label>
              <textarea
                rows={3}
                value={testSms}
                onChange={(e) => setTestSms(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-xs text-white focus:outline-none focus:border-white/20 font-mono resize-none"
              />
            </div>

            <Button
              onClick={handleRunTest}
              disabled={isTesting}
              size="sm"
              className="rounded-xl bg-white text-black hover:bg-white/90 text-xs font-medium h-9"
            >
              {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Send Test Payload
            </Button>

            {testResult && (
              <div
                className={`mt-3 p-3.5 rounded-xl border text-xs font-mono space-y-1.5 ${
                  testResult.success
                    ? "bg-[#30d158]/5 border-[#30d158]/20 text-[#30d158]"
                    : "bg-[#ff453a]/5 border-[#ff453a]/20 text-[#ff453a]"
                }`}
              >
                <p className="font-semibold">{testResult.message}</p>
                {testResult.data && (
                  <div className="text-[11px] text-white/90 space-y-0.5 pt-1">
                    <p>• Title: {testResult.data.title}</p>
                    <p>• Amount: ₹{testResult.data.amount}</p>
                    <p>• Category: {testResult.data.category}</p>
                    <p>• Ref/UTR: {testResult.data.externalRef || "None"}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Card 3: Step-by-Step Apple Shortcuts Setup Guide */}
      <div className="obsidian-card rounded-2xl bg-[#0e0e13]/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_15px_35px_rgba(0,0,0,0.5)] p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white">
            <Smartphone className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">3-Step Apple Shortcuts Setup</h4>
            <p className="text-[11px] text-[#8e8e93]">
              Configure once on your iPhone. Zero maintenance afterwards.
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-[#8e8e93]">
          {/* Step 1 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="h-6 w-6 rounded-lg bg-white/[0.08] text-white font-semibold text-xs flex items-center justify-center shrink-0">
              1
            </span>
            <div className="space-y-1">
              <p className="font-medium text-white">Create Personal Automation</p>
              <p className="text-[11px]">
                Open the native <strong>Shortcuts</strong> app on your iPhone $\rightarrow$ Tap the <strong>Automation</strong> tab $\rightarrow$ Tap <strong>New Automation</strong> $\rightarrow$ Select <strong>Message</strong>.
              </p>
              <p className="text-[11px] text-[#e5c158]">
                Set <em>Message Contains</em> to: <code className="bg-black/40 px-1 py-0.5 rounded text-white">debited</code> or <code className="bg-black/40 px-1 py-0.5 rounded text-white">spent</code>. Select <strong>Run Immediately</strong> (Turn off "Notify When Run").
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="h-6 w-6 rounded-lg bg-white/[0.08] text-white font-semibold text-xs flex items-center justify-center shrink-0">
              2
            </span>
            <div className="space-y-1">
              <p className="font-medium text-white">Add "Get Contents of URL" Action</p>
              <p className="text-[11px]">
                Tap <strong>Add Action</strong> and search for <strong>Get Contents of URL</strong>.
              </p>
              <div className="space-y-1 pt-1 font-mono text-[11px]">
                <p>• <strong>URL:</strong> <span className="text-white select-all">{webhookUrl}</span></p>
                <p>• <strong>Method:</strong> <span className="text-white">POST</span></p>
                <p>• <strong>Headers:</strong> Key: <code className="text-white">x-api-key</code> $\rightarrow$ Value: <span className="text-[#e5c158]">[Your Secret Key]</span></p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <span className="h-6 w-6 rounded-lg bg-white/[0.08] text-white font-semibold text-xs flex items-center justify-center shrink-0">
              3
            </span>
            <div className="space-y-1">
              <p className="font-medium text-white">Set Request Body</p>
              <p className="text-[11px]">
                Set <strong>Request Body</strong> to <strong>JSON</strong>.
              </p>
              <p className="text-[11px] font-mono">
                Add Key: <code className="text-white">message</code> $\rightarrow$ Type: <code className="text-white">Text</code> $\rightarrow$ Select <strong className="text-white">Shortcut Input</strong>.
              </p>
              <p className="text-[11px] text-[#30d158] pt-1 flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Tap Done. Any UPI or card spend alert is now automatically synchronized to your ledger.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
