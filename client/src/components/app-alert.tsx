/* eslint-disable @typescript-eslint/no-unused-vars */
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Check, Info, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

type AlertVariant = "default" | "destructive" | "success" | "warning" | "info";

interface AppAlertProps {
  isError?: boolean;
  message: string;
  title?: string;
  variant?: AlertVariant;
  position?:
    | "top"
    | "top-right"
    | "top-left"
    | "bottom"
    | "bottom-right"
    | "bottom-left"
    | "center";
  autoHideDuration?: number;
  onDismiss?: () => void;
  className?: string;
  showDismissButton?: boolean;
}

const variantClasses = {
  default:
    "bg-white/[0.04] text-[#fcfcfc] border border-white/[0.10]",
  destructive:
    "bg-[#f43f5e]/10 text-[#f43f5e] border border-[#f43f5e]/25",
  success:
    "bg-white/[0.04] text-white border border-white/[0.10]",
  warning:
    "bg-[#e5c158]/10 text-[#e5c158] border border-[#e5c158]/25",
  info:
    "bg-white/[0.04] text-[#fcfcfc] border border-white/[0.10]",
};

const iconMap = {
  default: <Info className="h-4 w-4 text-[#e5c158]" />,
  destructive: <AlertTriangle className="h-4 w-4 text-[#f43f5e]" />,
  success: <Check className="h-4 w-4 text-[#e5c158]" />,
  warning: <AlertTriangle className="h-4 w-4 text-[#e5c158]" />,
  info: <Info className="h-4 w-4 text-[#e5c158]" />,
};

export const AppAlert = ({
  isError = false,
  title = "Notice",
  message,
  variant = "destructive",
  autoHideDuration = 5000,
  onDismiss,
  className,
  showDismissButton = true,
}: AppAlertProps) => {
  const [_, setShowError] = useState(isError);

  useEffect(() => {
    if (isError) {
      setShowError(true);
      if (autoHideDuration > 0) {
        const timer = setTimeout(() => {
          setShowError(false);
          onDismiss?.();
        }, autoHideDuration);
        return () => clearTimeout(timer);
      }
    }
  }, [isError, autoHideDuration, onDismiss]);

  const handleDismiss = () => {
    setShowError(false);
    onDismiss?.();
  };

  return (
    <div className={cn("max-w-[calc(100%-2rem)] w-full", className)}>
      <Alert
        className={cn(
          "relative flex items-start gap-4 pr-12",
          variantClasses[variant]
        )}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {iconMap[variant]}
            <AlertTitle>{title}</AlertTitle>
          </div>
          <AlertDescription className="text-sm">{message}</AlertDescription>
        </div>
        {showDismissButton && (
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </Alert>
    </div>
  );
};
