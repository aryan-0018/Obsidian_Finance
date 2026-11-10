import { FileSearch, LucideIcon } from "lucide-react";
import * as React from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  className = "",
}) => {
  const Icon = icon || FileSearch;
  return (
    <div className={`flex flex-col items-center justify-center min-h-[260px] w-full py-8 text-center ${className}`}>
      {Icon && (
        <div className="bg-white/[0.03] border border-white/[0.08] p-4 rounded-2xl mb-4 text-[#e5c158] shadow-[0_8px_20px_rgba(0,0,0,0.3)]">
          <Icon className="w-8 h-8 text-[#e5c158]" />
        </div>
      )}
      <h3 className="text-base font-semibold tracking-tight text-white mb-1.5">{title}</h3>
      <p className="text-xs text-[#8e8e93] max-w-sm text-center leading-relaxed font-normal">
        {description}
      </p>
    </div>
  );
};

