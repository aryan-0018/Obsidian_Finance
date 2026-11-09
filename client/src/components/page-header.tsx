import { Fragment, ReactNode } from "react";

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  rightAction?: ReactNode;
  renderPageHeader?: ReactNode
}

const PageHeader = ({ title, subtitle, rightAction, renderPageHeader }: PageHeaderProps) => {
  return (
    <div className="w-full py-6 sm:py-7 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white/[0.03] to-transparent text-[#f5f5f7] border-b border-white/[0.08]">
      <div className="w-full max-w-[var(--max-width)] mx-auto">
        {renderPageHeader
          ? <Fragment>{renderPageHeader}</Fragment>
          : (
            <div className="w-full flex flex-col gap-4 items-start justify-start lg:items-center lg:flex-row lg:justify-between">
              {(title || subtitle) && (
                <div className="space-y-1">
                  {title && <h2 className="text-2xl lg:text-3xl font-semibold tracking-tight text-white">{title}</h2>}
                  {subtitle && <p className="text-[#8e8e93] text-xs lg:text-sm font-normal">{subtitle}</p>}
                </div>
              )}
              {rightAction && (
                <div className="flex flex-wrap items-center gap-2">
                  {rightAction}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export default PageHeader