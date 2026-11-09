import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Send,
  Loader2,
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lightbulb,
  PlusCircle,
  Calendar,
  RotateCcw,
  Download,
  Flame,
  Mic,
  MicOff,
} from "lucide-react";
import { useChatWithAiAdvisorMutation } from "@/features/analytics/analyticsAPI";
import { toast } from "sonner";
import { DateRangeType } from "@/components/date-range-select/types";
import { cn } from "@/lib/utils";

interface StructuredMessage {
  role: "user" | "model";
  parts: string;
  headline?: string;
  summary?: string;
  keyMetrics?: Array<{ label: string; value: string }>;
  bulletPoints?: string[];
  recommendation?: string;
  actionTaken?: {
    type: string;
    description: string;
    data?: Record<string, unknown>;
  };
}

interface AiAdvisorChatProps {
  dateRange?: DateRangeType;
}

const CHAT_STORAGE_KEY = "obsidian_ai_chat_history_v1";

const DEFAULT_WELCOME_MESSAGE: StructuredMessage = {
  role: "model",
  parts:
    "Hello! I am your Obsidian Financial Assistant. I can answer questions about your spending, or help you directly add transactions, adjust dates, update budgets, and generate reports.",
  headline: "Assistant Ready",
  summary:
    "I have access to your finances and can update transactions, dates, and budgets directly.",
  keyMetrics: [],
  bulletPoints: [
    "Add expenses or income naturally (e.g., 'Add 450 for lunch on Nov 4').",
    "Change dates or amounts (e.g., 'Move my coffee expense to yesterday').",
    "Update your monthly budget or generate financial reports.",
  ],
  recommendation: "",
};

function FormattedText({ text }: { text: string }) {
  if (!text) return null;

  const clean = text.replace(/^[#]{1,6}\s+/gm, "");
  const lines = clean.split("\n");

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-neutral-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        const isBullet =
          trimmed.startsWith("- ") ||
          trimmed.startsWith("* ") ||
          trimmed.startsWith("• ");
        const content = isBullet ? trimmed.replace(/^[-*•]\s+/, "") : trimmed;

        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const formatted = parts.map((part, pIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={pIdx} className="font-semibold text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="size-1.5 rounded-full bg-[#e5c158] mt-2 shrink-0" />
              <span>{formatted}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="font-light leading-relaxed">
            {formatted}
          </p>
        );
      })}
    </div>
  );
}

export default function AiAdvisorChat({ dateRange }: AiAdvisorChatProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [inputMessage, setInputMessage] = useState("");

  const [messages, setMessages] = useState<StructuredMessage[]>(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to load chat history from storage", e);
    }
    return [DEFAULT_WELCOME_MESSAGE];
  });

  const [chatWithAi, { isLoading }] = useChatWithAiAdvisorMutation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isListeningChat, setIsListeningChat] = useState(false);
  const chatRecognitionRef = useRef<any>(null);
  const chatSilenceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const SpeechClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechClass) {
      const rec = new SpeechClass();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-IN";
      rec.onstart = () => setIsListeningChat(true);
      rec.onresult = (e: any) => {
        let text = "";
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript;
        }
        setInputMessage(text);

        if (chatSilenceTimerRef.current) {
          clearTimeout(chatSilenceTimerRef.current);
          chatSilenceTimerRef.current = null;
        }

        const trimmed = text.trim();
        if (trimmed.length > 2) {
          chatSilenceTimerRef.current = setTimeout(() => {
            try {
              rec.stop();
            } catch {
              // ignore
            }
            handleSend(trimmed);
          }, 1400);
        }
      };
      rec.onerror = (err: any) => {
        if (err?.error === "no-speech" || err?.error === "aborted") return;
        setIsListeningChat(false);
        if (chatSilenceTimerRef.current) {
          clearTimeout(chatSilenceTimerRef.current);
          chatSilenceTimerRef.current = null;
        }
      };
      rec.onend = () => {
        setIsListeningChat(false);
        if (chatSilenceTimerRef.current) {
          clearTimeout(chatSilenceTimerRef.current);
          chatSilenceTimerRef.current = null;
        }
      };
      chatRecognitionRef.current = rec;
    }
  }, []);

  const toggleMic = () => {
    if (!chatRecognitionRef.current) {
      toast.error("Speech recognition is not supported in this browser");
      return;
    }
    if (chatSilenceTimerRef.current) {
      clearTimeout(chatSilenceTimerRef.current);
      chatSilenceTimerRef.current = null;
    }
    if (isListeningChat) {
      try {
        chatRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListeningChat(false);
      const trimmed = inputMessage.trim();
      if (trimmed.length > 2) {
        handleSend(trimmed);
      }
    } else {
      try {
        setInputMessage("");
        chatRecognitionRef.current.start();
      } catch (err) {
        console.warn("Recognition start error:", err);
      }
    }
  };

  // Save messages to localStorage whenever they update
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save chat history to storage", e);
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (messageToSend?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (chatSilenceTimerRef.current) {
      clearTimeout(chatSilenceTimerRef.current);
      chatSilenceTimerRef.current = null;
    }
    const query = (messageToSend ?? inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: StructuredMessage = { role: "user", parts: query };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage("");

    try {
      const currentRangePayload = dateRange
        ? {
            label: dateRange.label,
            value: dateRange.value,
            from: dateRange.from ? new Date(dateRange.from).toISOString() : undefined,
            to: dateRange.to ? new Date(dateRange.to).toISOString() : undefined,
          }
        : undefined;

      const response = await chatWithAi({
        message: query,
        history: messages.slice(1).map((m) => ({
          role: m.role,
          parts: m.parts || m.summary || "",
        })),
        currentRange: currentRangePayload,
      }).unwrap();

      const modelMsg: StructuredMessage = {
        role: "model",
        parts: response.reply || response.summary || "",
        headline: response.headline,
        summary: response.summary,
        keyMetrics: response.keyMetrics,
        bulletPoints: response.bulletPoints,
        recommendation: response.recommendation,
        actionTaken: response.actionTaken,
      };

      setMessages((prev) => [...prev, modelMsg]);

      if (response.actionTaken?.description) {
        toast.success(response.actionTaken.description);
      }

      if (response.actionTaken?.type === "OPEN_MODAL") {
        const modalTarget = (response.actionTaken.data as { modal?: string })?.modal;
        if (modalTarget) {
          window.dispatchEvent(
            new CustomEvent("obsidian:open-modal", {
              detail: { modal: modalTarget },
            })
          );
        }
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      toast.error(
        error?.data?.message || error?.message || "Failed to communicate with AI Assistant"
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          parts:
            "Could not process your request at this moment. Please check your connection and try again.",
          headline: "Notice",
          summary:
            "Request could not be completed. Please try again shortly.",
        },
      ]);
    }
  };

  const handleResetChat = () => {
    localStorage.removeItem(CHAT_STORAGE_KEY);
    setMessages([DEFAULT_WELCOME_MESSAGE]);
    toast.success("Chat history cleared");
  };

  const handleExportTranscript = () => {
    if (messages.length <= 1) {
      toast.info("No conversation history to export yet.");
      return;
    }
    const transcript = [
      `# Obsidian Financial Advisor — Executive Transcript`,
      `Date: ${new Date().toLocaleString()}`,
      `Scope: ${dateRange?.label || "All Time"}`,
      `==================================================\n`,
      ...messages.map((m) => {
        const sender = m.role === "user" ? "USER" : "FINANCIAL ADVISOR";
        let body = `### [${sender}]\n${m.parts || m.summary || ""}\n`;
        if (m.keyMetrics && m.keyMetrics.length > 0) {
          body += `\nMetrics:\n` + m.keyMetrics.map((km) => `- ${km.label}: ${km.value}`).join("\n") + `\n`;
        }
        if (m.bulletPoints && m.bulletPoints.length > 0) {
          body += `\nKey Points:\n` + m.bulletPoints.map((bp) => `- ${bp}`).join("\n") + `\n`;
        }
        if (m.recommendation) {
          body += `\nExecutive Recommendation: ${m.recommendation}\n`;
        }
        return body;
      }),
    ].join("\n\n");

    const blob = new Blob([transcript], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `obsidian_advisor_transcript_${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Transcript downloaded as markdown");
  };

  const quickActionPrompts = [
    {
      label: "Verify Records",
      icon: Sparkles,
      prompt: "Verify my account records and check for any discrepancies.",
    },
    {
      label: "Spending Pace",
      icon: Flame,
      prompt: "How much do I spend each day and how long will my savings last?",
    },
    {
      label: "Subscription Leaks",
      icon: Sparkles,
      prompt: "Identify recurring subscriptions or unusual spending spikes.",
    },
    {
      label: "Year-End Projection",
      icon: Calendar,
      prompt: "Project my end-of-year net savings based on current cash flow.",
    },
    {
      label: "All-Time Report",
      icon: Calendar,
      prompt: "Generate my all-time financial summary report.",
    },
    {
      label: "+ Add ₹450 Lunch",
      icon: PlusCircle,
      prompt: "Add an expense of 450 for lunch today.",
    },
  ];

  return (
    <div className="w-full obsidian-card rounded-2xl mb-6 overflow-hidden">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-white/[0.06]"
      >
        <div className="flex items-center gap-3">
          <div className="bg-[#e5c158]/10 p-2.5 rounded-2xl border border-[#e5c158]/25">
            <Bot className="text-[#e5c158] size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight text-white">
                Financial Assistant
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-black/60 border border-white/10 text-neutral-300">
                <Calendar className="size-3 text-[#e5c158]" />
                {dateRange?.label || "All Time"}
              </span>
            </div>
            <p className="text-xs text-[#a1a1aa] mt-0.5 font-normal">
              Chat to analyze your spending or directly add expenses, income, edit dates, and manage budgets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && messages.length > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportTranscript();
                }}
                className="text-xs text-[#a1a1aa] hover:text-[#e5c158] hover:bg-white/5 h-8 px-2.5 cursor-pointer"
                title="Download chat transcript as markdown"
              >
                <Download className="size-3.5 mr-1" />
                Export
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetChat();
                }}
                className="text-xs text-[#a1a1aa] hover:text-white hover:bg-white/5 h-8 px-2.5 cursor-pointer"
              >
                <RotateCcw className="size-3.5 mr-1" />
                Clear Chat
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-[#e5c158] hover:text-[#e5c158] hover:bg-white/[0.06]"
          >
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expandable chat interface */}
      {isOpen && (
        <div className="p-5 space-y-4">
          {/* Action chips */}
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span className="text-[#a1a1aa] font-normal flex items-center gap-1 mr-1">
              <Sparkles className="size-3 text-[#e5c158]" /> Quick Commands:
            </span>
            {quickActionPrompts.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSend(item.prompt)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#fcfcfc] hover:text-[#e5c158] hover:border-[#c1a063]/50 hover:bg-[#c1a063]/10 transition-all duration-150 text-xs font-medium cursor-pointer disabled:opacity-50 select-none active:scale-95 shadow-xs"
                >
                  <Icon className="size-3 text-[#e5c158]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages list */}
          <div className="max-h-[440px] min-h-[260px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex gap-3 items-start ${
                    isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`size-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                      isUser
                        ? "bg-gradient-to-r from-[#e5c158] to-[#c1a063] text-black shadow-md"
                        : "bg-neutral-900 border border-[#e5c158]/40 text-[#e5c158]"
                    }`}
                  >
                    {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl p-4 text-sm leading-relaxed space-y-3 ${
                      isUser
                        ? "bg-[#e5c158]/15 border border-[#c1a063]/30 text-white font-normal"
                        : "bg-[#0e0e12] border border-white/[0.08] text-[#fcfcfc] shadow-xl"
                    }`}
                  >
                    {isUser ? (
                      <p className="font-normal whitespace-pre-wrap">{msg.parts}</p>
                    ) : (
                      <>
                        {/* Headline */}
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <span className="text-xs font-medium text-[#e5c158] flex items-center gap-1.5">
                            <Sparkles className="size-3.5" />
                            {msg.headline || "Assistant"}
                          </span>
                          {msg.actionTaken && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#e5c158]/15 text-[#e5c158] border border-[#c1a063]/30 flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              Completed
                            </span>
                          )}
                        </div>

                        {/* Action Confirmation Banner */}
                        {msg.actionTaken && (
                          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#e5c158]/10 border border-[#c1a063]/25 text-white text-xs">
                            <CheckCircle2 className="size-4 text-[#e5c158] shrink-0" />
                            <div className="font-normal">
                              {msg.actionTaken.description}
                            </div>
                          </div>
                        )}

                        {/* Summary / Core Answer */}
                        <div className="pt-0.5">
                          {msg.summary ? (
                            <p className="text-[#fcfcfc] text-sm leading-relaxed font-normal">
                              {msg.summary}
                            </p>
                          ) : (
                            <FormattedText text={msg.parts} />
                          )}
                        </div>

                        {/* Key Metrics */}
                        {msg.keyMetrics && msg.keyMetrics.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                            {msg.keyMetrics.map((metric, mIdx) => (
                              <div
                                key={mIdx}
                                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-2.5 text-center"
                              >
                                <div className="text-[11px] text-[#a1a1aa] font-medium truncate">
                                  {metric.label}
                                </div>
                                <div className="text-sm font-semibold text-white tabular-nums mt-0.5">
                                  {metric.value}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Bullet Points */}
                        {msg.bulletPoints && msg.bulletPoints.length > 0 && (
                          <ul className="space-y-1.5 text-xs text-neutral-300 pt-1">
                            {msg.bulletPoints.map((point, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2">
                                <span className="size-1.5 rounded-full bg-[#e5c158] mt-1.5 shrink-0" />
                                <span className="font-normal leading-relaxed text-[#fcfcfc]">
                                  {point}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Recommendation */}
                        {msg.recommendation && (
                          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#e5c158]/5 border border-[#c1a063]/20 text-xs text-white font-normal mt-1">
                            <Lightbulb className="size-3.5 text-[#e5c158] mt-0.5 shrink-0" />
                            <span>
                              <strong className="font-medium text-[#e5c158]">
                                Tip:{" "}
                              </strong>
                              {msg.recommendation}
                            </span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 items-start">
                <div className="size-8 rounded-full bg-neutral-900 border border-[#c1a063]/40 text-[#c1a063] flex items-center justify-center shrink-0">
                  <Bot className="size-4" />
                </div>
                <div className="bg-[#141414] border border-neutral-800 rounded-xl p-3.5 text-sm text-[#c1a063] flex items-center gap-2.5 shadow-lg">
                  <Loader2 className="size-4 animate-spin text-[#c1a063]" />
                  <span className="font-light text-xs text-neutral-300">
                    Updating financial data...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input field */}
          <form onSubmit={(e) => handleSend(undefined, e)} className="flex gap-2 pt-2">
            <div className="relative flex-1">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  isListeningChat
                    ? "Listening... Speak naturally"
                    : "E.g., 'Add expense of 450 for lunch' or 'Change coffee date to yesterday'"
                }
                disabled={isLoading}
                className="bg-neutral-950 border-neutral-800 focus:border-[#c1a063] text-white placeholder:text-neutral-500 text-sm h-11 pr-11"
              />
              <button
                type="button"
                onClick={toggleMic}
                className={cn(
                  "absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center transition-colors cursor-pointer",
                  isListeningChat
                    ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse"
                    : "text-[#a1a1aa] hover:text-[#e5c158] hover:bg-white/5"
                )}
                title={isListeningChat ? "Stop listening" : "Speak to Financial Advisor"}
              >
                {isListeningChat ? <MicOff className="size-4" /> : <Mic className="size-4" />}
              </button>
            </div>
            <Button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-gradient-to-r from-[#e5c158] via-[#c1a063] to-[#b09055] hover:brightness-105 text-black h-11 px-5 cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)]"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
