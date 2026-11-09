import { cn } from "@/lib/utils";
import PageHeader from "./page-header";

interface PropsType {
  children: React.ReactNode;
  className?: string
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  showHeader?: boolean;
  addMarginTop?: boolean;
  renderPageHeader?: React.ReactNode
}

const PageLayout = ({
  children,
  className,
  title,
  subtitle,
  rightAction,
  showHeader = true,
  renderPageHeader,
}: PropsType) => {
  return (
    <div className="w-full min-h-[calc(100vh-4rem)] flex flex-col">
      {showHeader && (
        <PageHeader 
          title={title} 
          subtitle={subtitle} 
          rightAction={rightAction} 
          renderPageHeader={renderPageHeader}
        />
      )}
      <div
        className={cn(
          "w-full max-w-[var(--max-width)] mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8 flex-1",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default PageLayout;
