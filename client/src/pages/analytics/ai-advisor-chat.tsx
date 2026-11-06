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
  Trash2,
  TrendingUp,
  Calendar,
  RotateCcw,
} from "lucide-react";
import { useChatWithAiAdvisorMutation } from "@/features/analytics/analyticsAPI";
import { toast } from "sonner";

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
    data?: any;
  };
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
              <span className="size-1.5 rounded-full bg-[#c1a063] mt-2 shrink-0" />
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

export default function AiAdvisorChat() {
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
    const query = (messageToSend ?? inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: StructuredMessage = { role: "user", parts: query };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputMessage("");

    try {
      const response = await chatWithAi({
        message: query,
        history: messages.slice(1).map((m) => ({
          role: m.role,
          parts: m.parts || m.summary || "",
        })),
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
    } catch (err: any) {
      toast.error(
        err?.data?.message || "Failed to communicate with AI Assistant"
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
  };

  const quickActionPrompts = [
    {
      label: "+ Add ₹450 Lunch",
      icon: PlusCircle,
      prompt: "Add an expense of 450 for lunch today.",
    },
    {
      label: "+ Add ₹80,000 Salary",
      icon: TrendingUp,
      prompt: "Add income of 80000 for monthly salary.",
    },
    {
      label: "Delete Last Transaction",
      icon: Trash2,
      prompt: "Delete my last transaction.",
    },
    {
      label: "Set Budget to ₹50,000",
      icon: Sparkles,
      prompt: "Set my monthly budget limit to 50000.",
    },
    {
      label: "Generate Monthly Report",
      icon: Calendar,
      prompt: "Generate my financial report for this month.",
    },
  ];

  return (
    <div className="w-full bg-[#111] dark:bg-black text-white rounded-xl border border-[#c1a063]/30 shadow-2xl mb-6 overflow-hidden transition-all duration-300">
      {/* Header bar */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors border-b border-white/5"
      >
        <div className="flex items-center gap-3">
          <div className="bg-[#c1a063]/20 p-2.5 rounded-xl border border-[#c1a063]/40 shadow-[0_0_12px_rgba(193,160,99,0.2)]">
            <Bot className="text-[#c1a063] size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-medium tracking-tight text-[#c1a063]">
                Obsidian AI Financial Assistant
              </h3>
              <span className="text-[10px] uppercase font-semibold tracking-widest px-2.5 py-0.5 rounded-full bg-[#c1a063]/10 text-[#c1a063] border border-[#c1a063]/30 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#c1a063] animate-pulse" />
                Live Assistant
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5 font-light">
              Chat to analyze your spending or directly add expenses, income, edit dates, and manage budgets
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && messages.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleResetChat();
              }}
              className="text-xs text-neutral-400 hover:text-white hover:bg-white/5 h-8 px-2.5 cursor-pointer"
            >
              <RotateCcw className="size-3.5 mr-1" />
              Clear Chat
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-[#c1a063] hover:text-[#c1a063] hover:bg-[#c1a063]/10"
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
            <span className="text-neutral-500 font-light flex items-center gap-1 mr-1">
              <Sparkles className="size-3 text-[#c1a063]" /> Quick Commands:
            </span>
            {quickActionPrompts.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSend(item.prompt)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-neutral-300 hover:text-[#c1a063] hover:border-[#c1a063]/50 hover:bg-[#c1a063]/5 transition-all text-xs font-light cursor-pointer disabled:opacity-50"
                >
                  <Icon className="size-3 text-[#c1a063]" />
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
                        ? "bg-[#c1a063] text-black shadow-md"
                        : "bg-neutral-900 border border-[#c1a063]/40 text-[#c1a063]"
                    }`}
                  >
                    {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl p-4 text-sm leading-relaxed space-y-3 ${
                      isUser
                        ? "bg-[#c1a063]/15 border border-[#c1a063]/30 text-white font-normal"
                        : "bg-[#141414] border border-neutral-800 text-neutral-200 shadow-xl"
                    }`}
                  >
                    {isUser ? (
                      <p className="font-light whitespace-pre-wrap">{msg.parts}</p>
                    ) : (
                      <>
                        {/* Headline */}
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <span className="text-xs font-medium uppercase tracking-wider text-[#c1a063] flex items-center gap-1.5">
                            <Sparkles className="size-3.5" />
                            {msg.headline || "Assistant"}
                          </span>
                          {msg.actionTaken && (
                            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#c1a063]/15 text-[#c1a063] border border-[#c1a063]/30 flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              Completed
                            </span>
                          )}
                        </div>

                        {/* Action Confirmation Banner */}
                        {msg.actionTaken && (
                          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-[#c1a063]/10 border border-[#c1a063]/25 text-[#e8dcc4] text-xs">
                            <CheckCircle2 className="size-4 text-[#c1a063] shrink-0" />
                            <div className="font-normal">
                              {msg.actionTaken.description}
                            </div>
                          </div>
                        )}

                        {/* Summary / Core Answer */}
                        <div className="pt-0.5">
                          {msg.summary ? (
                            <p className="text-neutral-200 text-sm leading-relaxed font-light">
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
                                className="bg-black/60 border border-neutral-800 rounded-lg p-2.5 text-center"
                              >
                                <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium truncate">
                                  {metric.label}
                                </div>
                                <div className="text-sm font-semibold text-[#c1a063] mt-0.5">
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
                                <span className="size-1.5 rounded-full bg-[#c1a063] mt-1.5 shrink-0 shadow-[0_0_6px_rgba(193,160,99,0.5)]" />
                                <span className="font-light leading-relaxed">
                                  {point}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Recommendation */}
                        {msg.recommendation && (
                          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-[#c1a063]/5 border border-[#c1a063]/20 text-xs text-[#e8dcc4] font-light mt-1">
                            <Lightbulb className="size-3.5 text-[#c1a063] mt-0.5 shrink-0" />
                            <span>
                              <strong className="font-medium text-[#c1a063]">
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
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="E.g., 'Add expense of 450 for lunch' or 'Change coffee date to yesterday'"
              disabled={isLoading}
              className="bg-neutral-950 border-neutral-800 focus:border-[#c1a063] text-white placeholder:text-neutral-500 text-sm h-11"
            />
            <Button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="bg-[#c1a063] hover:bg-[#a88a4e] text-black h-11 px-5 cursor-pointer font-medium"
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
