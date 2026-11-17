import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PROTECTED_ROUTES } from "@/routes/common/routePath";
import { ArrowLeft, Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#0B0B0E] flex flex-col items-center justify-center p-6 text-white select-none">
      <div className="w-full max-w-md obsidian-card rounded-3xl p-8 sm:p-10 text-center bg-[#111114] border border-white/[0.08] shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-24 bg-[#c1a063]/10 blur-3xl pointer-events-none" />

        <div className="mx-auto w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-6">
          <Compass className="w-6 h-6 text-[#c1a063]" />
        </div>

        <span className="text-[11px] font-medium tracking-wider uppercase px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#8e8e93] inline-block mb-3">
          Error 404
        </span>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mb-2">
          Page Not Found
        </h1>

        <p className="text-xs sm:text-sm text-[#8e8e93] leading-relaxed mb-8 font-normal">
          The requested page could not be located. It may have been moved or the address was entered incorrectly.
        </p>

        <Button
          asChild
          className="w-full rounded-xl bg-[#c1a063] hover:bg-[#b09054] text-black font-medium h-10 text-xs sm:text-sm cursor-pointer shadow-md transition-all active:scale-[0.98]"
        >
          <Link to={PROTECTED_ROUTES.OVERVIEW} className="flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
