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
  const Icon = icon || FileSearch
  return (
    <div className={`flex flex-col items-center justify-center min-h-[300px] w-full ${className}`}>
      {Icon && (
        <div className="bg-[#111] border border-[#c1a063]/20 p-5 rounded-full mb-6">
          <Icon className="w-10 h-10 text-[#c1a063]" />
        </div>
      )}
      <h3 className="text-xl font-light tracking-wide text-white mb-2">{title}</h3>
      <p className="text-sm text-neutral-400 max-w-sm text-center mb-6">
        {description}
      </p>
      <div className="h-[1px] w-16 bg-gradient-to-r from-transparent via-[#c1a063]/50 to-transparent rounded-full" />
    </div>
  );
};
