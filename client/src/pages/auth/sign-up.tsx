import SignUpForm from "./_component/signup-form";
import Logo from "@/components/logo/logo";
import { Sparkles, BarChart3, Lock } from "lucide-react";

const SignUp = () => {
  return (
    <div className="grid h-screen max-h-screen lg:grid-cols-2 bg-[#070709] w-full overflow-hidden">
      {/* Left Form Panel */}
      <div className="flex flex-col justify-between h-full p-4 sm:p-6 lg:p-8 w-full max-w-full overflow-hidden">
        <div className="flex justify-center md:justify-start shrink-0">
          <Logo url="/" />
        </div>
        <div className="flex flex-1 items-center justify-center my-auto">
          <div className="w-full max-w-[390px]">
            <div className="obsidian-card rounded-2xl sm:rounded-3xl p-5 sm:p-7 bg-[#0e0e12] border border-white/[0.10] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)]">
              <SignUpForm />
            </div>
          </div>
        </div>
        <div className="text-center md:text-left text-[11px] text-[#a1a1aa]/60 shrink-0">
          Encrypted & secure financial environment.
        </div>
      </div>

      {/* Right Editorial Hero Panel */}
      <div className="relative hidden lg:block h-full overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 xl:p-12 bg-gradient-to-br from-[#0e0e12] via-[#09090b] to-[#070709] text-center border-l border-white/[0.08] overflow-hidden">
          <div className="absolute -top-32 -right-32 w-80 h-80 bg-[#e5c158]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[#e5c158]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="w-full max-w-md xl:max-w-lg flex flex-col items-center space-y-5 xl:space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[#e5c158] text-xs font-medium tracking-wide shrink-0">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Private Wealth Management</span>
            </div>

            <h1 className="text-3xl xl:text-4xl font-light text-white tracking-tight leading-tight">
              Curate your <span className="text-[#e5c158] font-semibold italic">financial legacy</span>.
            </h1>
            <p className="text-xs sm:text-sm text-[#a1a1aa] font-normal max-w-md leading-relaxed">
              Personal wealth management with complete clarity, privacy, and full control over your finances.
            </p>

            <div className="grid grid-cols-2 gap-3 mt-4 w-full text-left">
              <div className="obsidian-card rounded-xl p-3.5 bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[#e5c158] mb-1">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <h3 className="text-xs font-semibold text-white">Automated Reports</h3>
                </div>
                <p className="text-[11px] text-[#a1a1aa] font-normal leading-relaxed">Scheduled monthly dispatches & verified balance tracking.</p>
              </div>

              <div className="obsidian-card rounded-xl p-3.5 bg-white/[0.02] border border-white/[0.06]">
                <div className="flex items-center gap-1.5 text-[#e5c158] mb-1">
                  <Lock className="h-3.5 w-3.5" />
                  <h3 className="text-xs font-semibold text-white">Private Infrastructure</h3>
                </div>
                <p className="text-[11px] text-[#a1a1aa] font-normal leading-relaxed">Independent, self-contained cloud deployment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;