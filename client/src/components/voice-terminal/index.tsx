import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  useProcessVoiceCommandMutation,
  VoiceTerminalCommandResponse,
} from "@/features/analytics/analyticsAPI";

interface SpeechRecognitionEventLike {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function VoiceTerminalModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [activeVoiceReply, setActiveVoiceReply] = useState<
    VoiceTerminalCommandResponse["data"] | null
  >(null);
  const [executingQuery, setExecutingQuery] = useState<string>("");

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const executedRef = useRef<string>("");
  const transcriptRef = useRef<string>("");
  const isProcessingRef = useRef<boolean>(false);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [processCommand, { isLoading }] = useProcessVoiceCommandMutation();

  // Preload speech synthesis voices
  useEffect(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      const onVoicesChanged = () => {
        window.speechSynthesis.getVoices();
      };
      window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      };
    }
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let currentText = "";
        for (let i = 0; i < event.results.length; i++) {
          currentText += event.results[i][0].transcript;
        }
        transcriptRef.current = currentText;
        setTranscript(currentText);

        // Reset silence timer on every new speech token
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        const trimmed = currentText.trim();
        if (trimmed.length > 2 && !isProcessingRef.current && trimmed !== executedRef.current) {
          silenceTimerRef.current = setTimeout(() => {
            try {
              recognition.stop();
            } catch {
              // ignore
            }
            handleExecute(trimmed);
          }, 1400);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
        // Silently tolerate harmless speech recognition events like no-speech or aborted
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }
        console.warn("[Voice Terminal] Recognition notice:", event.error);
        setIsListening(false);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        if (event.error === "not-allowed") {
          toast.error("Microphone access denied. You can type commands below.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        const finalTranscript = transcriptRef.current.trim();
        if (
          finalTranscript.length > 2 &&
          !isProcessingRef.current &&
          finalTranscript !== executedRef.current
        ) {
          handleExecute(finalTranscript);
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Keyboard shortcut listener: Alt+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === "v") || (e.ctrlKey && e.key.toLowerCase() === "m")) {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open triggered by parent state or custom event
          window.dispatchEvent(new CustomEvent("open-voice-terminal"));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle SpeechSynthesis audio playback
  const speakText = (text: string) => {
    if (isAudioMuted || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel(); // Stop prior audio
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    // Pick crisp English voice, prioritizing Indian English voices when present
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice =
      voices.find((v) => v.lang === "en-IN") ||
      voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Natural") ||
            v.name.includes("Google") ||
            v.name.includes("Samantha") ||
            v.name.includes("Aria"))
      ) ||
      voices.find((v) => v.lang.startsWith("en"));

    if (naturalVoice) utterance.voice = naturalVoice;

    window.speechSynthesis.speak(utterance);
  };

  // Subtle luxury audio chimes via Web Audio API (zero dependencies)
  const playChime = (type: "start" | "success") => {
    if (isAudioMuted || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      if (type === "start") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
      } else if (type === "success") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch {
      // AudioContext not allowed before user gesture
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      toast.error(
        "Speech Recognition is not supported by your browser. Please type below."
      );
      return;
    }

    try {
      window.speechSynthesis?.cancel();
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      playChime("start");
      setIsSpeaking(false);
      setTranscript("");
      transcriptRef.current = "";
      setActiveVoiceReply(null);
      executedRef.current = "";
      recognitionRef.current.start();
    } catch (err) {
      console.warn("Recognition already started:", err);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const handleExecute = async (commandText: string) => {
    const textToRun = commandText.trim();
    if (!textToRun || isProcessingRef.current) return;
    if (textToRun === executedRef.current) return;

    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    isProcessingRef.current = true;
    executedRef.current = textToRun;
    setExecutingQuery(textToRun);
    setTranscript(textToRun);
    setManualInput("");
    stopListening();

    try {
      const res = await processCommand({ transcript: textToRun }).unwrap();
      const data = res.data;
      setActiveVoiceReply(data);
      playChime("success");

      if (data.speechReply) {
        speakText(data.speechReply);
      }

      // Handle Automated Navigation
      if (data.action === "NAVIGATE" && data.path) {
        toast.success(`Navigating to ${data.path}...`);
        setTimeout(() => {
          onClose();
          navigate(data.path!);
        }, 1200);
      }

      // Handle Modal Trigger Actions
      if (data.action === "OPEN_MODAL" && data.modalTarget) {
        toast.success(data.displayText || "Opening requested panel...");
        setTimeout(() => {
          onClose();
          if (data.path && window.location.pathname !== data.path) {
            navigate(data.path);
            setTimeout(() => {
              window.dispatchEvent(
                new CustomEvent("obsidian:open-modal", {
                  detail: { modal: data.modalTarget },
                })
              );
            }, 500);
          } else {
            window.dispatchEvent(
              new CustomEvent("obsidian:open-modal", {
                detail: { modal: data.modalTarget },
              })
            );
          }
        }, 1100);
      }

      if (data.action === "AUDIT_LEDGER") {
        toast.success("Record security check completed!");
      }

      if (data.action === "BUDGET_UPDATED") {
        toast.success("Monthly budget updated!");
      }

      if (data.action === "TRANSACTION_DELETED") {
        toast.success("Transaction removed!");
      }

      if (data.action === "TRANSACTION_UPDATED") {
        toast.success("Transaction updated!");
      }

      if (data.action === "TELEGRAM_ACTION") {
        toast.success("Telegram action processed!");
      }

      if (data.action === "TRANSACTION_CREATED") {
        toast.success("Transaction saved successfully!");
      }

      if (data.action === "EXPORT_ACTION") {
        toast.success("Transaction report emailed successfully!");
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string }; message?: string };
      const errMsg =
        error?.data?.message || error?.message || "Failed to process voice command.";
      toast.error(errMsg);
    } finally {
      isProcessingRef.current = false;
      setExecutingQuery("");
      setTimeout(() => {
        executedRef.current = "";
      }, 500);
    }
  };

  // Auto-start listening on open
  useEffect(() => {
    if (isOpen) {
      executedRef.current = "";
      transcriptRef.current = "";
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      setTranscript("");
      setActiveVoiceReply(null);
      const timer = setTimeout(() => {
        try {
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
        } catch {
          // ignore
        }
      }, 350);
      return () => {
        clearTimeout(timer);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      };
    } else {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      stopListening();
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl obsidian-card bg-[#0e0e13]/95 backdrop-blur-2xl border-white/[0.09] text-[#f5f5f7] p-7 rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <DialogHeader className="pb-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-[#e5c158]/10 text-[#e5c158] flex items-center justify-center border border-[#e5c158]/20">
                <Mic className="h-4.5 w-4.5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold tracking-tight text-white flex items-center gap-2">
                  Voice Assistant
                </DialogTitle>
                <DialogDescription className="text-xs text-[#8e8e93] mt-0.5">
                  Speak naturally to log expenses, check balances, or navigate
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsAudioMuted(!isAudioMuted)}
              className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-[#8e8e93] hover:text-white transition-all cursor-pointer"
              title={isAudioMuted ? "Unmute Voice Feedback" : "Mute Voice Feedback"}
            >
              {isAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-[#e5c158]" />}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-3 text-center">
          {/* Mic Trigger */}
          <div className="relative flex flex-col items-center justify-center py-5">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`relative h-20 w-20 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer select-none active:scale-95 ${
                isListening
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.3)]"
                  : "bg-white/[0.04] hover:bg-white/[0.08] text-[#e5c158] border border-white/[0.10] hover:border-[#e5c158]/50 shadow-sm"
              }`}
            >
              {isListening && (
                <>
                  <span className="absolute inset-0 rounded-full border border-rose-500/40 animate-ping pointer-events-none" />
                  <span className="absolute -inset-2 rounded-full border border-rose-500/20 animate-pulse pointer-events-none" />
                </>
              )}
              {isListening ? (
                <MicOff className="h-8 w-8 z-10" />
              ) : (
                <Mic className="h-8 w-8 z-10" />
              )}
            </button>

            {isListening && (
              <div className="flex items-center justify-center gap-1 mt-2.5 h-4">
                <span className="w-1 bg-[#e5c158] rounded-full animate-[pulse_0.6s_ease-in-out_infinite] h-3" />
                <span className="w-1 bg-[#e5c158] rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.15s] h-4" />
                <span className="w-1 bg-[#e5c158] rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.3s] h-2" />
                <span className="w-1 bg-[#e5c158] rounded-full animate-[pulse_0.9s_ease-in-out_infinite_0.45s] h-4" />
                <span className="w-1 bg-[#e5c158] rounded-full animate-[pulse_0.7s_ease-in-out_infinite_0.2s] h-3" />
              </div>
            )}

            <div className="flex items-center gap-2 mt-2.5">
              {isLoading ? (
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#e5c158]/10 border border-[#e5c158]/30 text-xs text-[#e5c158] animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Processing: {executingQuery || transcript || "request"}...</span>
                </div>
              ) : isSpeaking ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e5c158]/10 border border-[#e5c158]/30 text-xs text-[#e5c158] animate-pulse">
                  <Volume2 className="h-3.5 w-3.5 animate-bounce" />
                  <span>Speaking response...</span>
                </div>
              ) : (
                <p className="text-xs font-normal text-[#8e8e93]">
                  {isListening
                    ? "Listening... Speak naturally in English or Hinglish"
                    : "Tap microphone to begin speaking"}
                </p>
              )}
            </div>
          </div>

          {/* Real-time Transcription Stream */}
          <div className="min-h-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3.5 text-left shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]">
            <p className="text-[11px] text-[#8e8e93] font-medium">Spoken Query</p>
            <p className="text-xs text-white mt-1 font-medium min-h-5 leading-relaxed">
              {transcript || (
                <span className="text-[#8e8e93]/60 italic">
                  Say &quot;Spent 450 on lunch&quot;, &quot;What is my balance?&quot;, or &quot;Delete last transaction&quot;...
                </span>
              )}
            </p>
          </div>

          {/* Execution Response Card */}
          {isLoading && (
            <div className="p-3.5 rounded-xl border border-[#e5c158]/20 bg-[#e5c158]/5 flex items-center justify-center gap-2 text-xs text-[#e5c158]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#e5c158]" />
              Processing: &quot;{executingQuery || transcript}&quot;...
            </div>
          )}

          {activeVoiceReply && !isLoading && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#30d158]" />
                  {activeVoiceReply.displayHeadline || "Command Processed"}
                </span>
                <Badge className="bg-white/[0.06] text-[#8e8e93] border-none text-[10px] font-normal">
                  {activeVoiceReply.action}
                </Badge>
              </div>

              <p className="text-xs text-[#8e8e93] leading-relaxed">
                {activeVoiceReply.displayText || activeVoiceReply.speechReply}
              </p>

              {activeVoiceReply.metrics && activeVoiceReply.metrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/[0.06]">
                  {activeVoiceReply.metrics.map((m, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-2 text-center">
                      <p className="text-[10px] text-[#8e8e93]">{m.label}</p>
                      <p className="text-xs font-medium text-white tabular-nums mt-0.5">
                        {m.value}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Suggestion Chips */}
          <div className="space-y-2 text-left pt-1">
            <p className="text-[11px] font-medium text-[#8e8e93] flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#e5c158]" /> Suggested Commands (Tap to execute):
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "Spent 450 on lunch",
                "What's my balance?",
                "How much did I spend this month?",
                "Delete last transaction",
                "Set my monthly budget to 40k",
                "How much do I spend each day?",
                "Check my record security",
                "Scan a receipt",
                "Import my bank statement",
                "Link telegram assistant",
              ].map((cmd, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setTranscript(cmd);
                    handleExecute(cmd);
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-[#e5c158]/50 text-[#8e8e93] hover:text-white transition-all duration-150 cursor-pointer select-none active:scale-[0.97] shadow-xs"
                >
                  &quot;{cmd}&quot;
                </button>
              ))}
            </div>
          </div>

          {/* Manual Text Fallback Input */}
          <div className="flex gap-2 pt-2 border-t border-white/[0.08]">
            <Input
              placeholder="Or type any financial command or question..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualInput.trim()) {
                  handleExecute(manualInput);
                  setManualInput("");
                }
              }}
              className="bg-white/[0.03] border-white/[0.10] text-xs h-9 text-white placeholder:text-[#71717a] rounded-xl"
            />
            <Button
              onClick={() => {
                if (manualInput.trim()) {
                  handleExecute(manualInput);
                  setManualInput("");
                }
              }}
              size="sm"
              className="h-9 cursor-pointer font-semibold shadow-[0_2px_12px_rgba(193,160,99,0.3)] text-xs"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function VoiceTerminalTriggerButton({
  className = "",
}: {
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleCustomOpen = () => setIsOpen(true);
    window.addEventListener("open-voice-terminal", handleCustomOpen);
    return () => window.removeEventListener("open-voice-terminal", handleCustomOpen);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3.5 py-1.5 h-9 rounded-full border-white/[0.10] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/[0.18] text-white active:scale-[0.97] transition-all cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] ${className}`}
        title="Voice Assistant (Alt+V)"
      >
        <Mic className="h-3.5 w-3.5 text-[#e5c158]" />
        <span className="text-xs font-medium hidden sm:inline tracking-tight">Voice Assistant</span>
      </Button>

      <VoiceTerminalModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
