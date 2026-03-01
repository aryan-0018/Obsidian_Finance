import SignUpForm from "./_component/signup-form"
import Logo from "@/components/logo/logo"


const SignUp = () => {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 bg-[#0a0a0a]">
      <div className="flex flex-col gap-4 p-6 md:p-10 md:pt-6">
        <div className="flex justify-center gap-2 md:justify-start">
          <Logo url="/" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <SignUpForm />
          </div>
        </div>
      </div>
      <div className="relative hidden lg:block -mt-3">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-[#0f0f0f] text-center border-l border-[#2a2520]">
          <div className="w-full max-w-2xl flex flex-col items-center space-y-8">
            <h1 className="text-4xl md:text-5xl font-light text-[#e8e0d4] tracking-tight leading-tight">
              Curate your <span className="text-[#c1a063] font-medium italic">financial legacy</span>.
            </h1>
            <p className="text-lg md:text-xl text-[#9a9080] font-light max-w-xl leading-relaxed">
              Join an exclusive tier of wealth management. ObsidianFinance offers precision, privacy, and power to build your empire.
            </p>

            <div className="grid grid-cols-2 gap-8 mt-12 w-full max-w-lg text-left">
              <div className="border-l-2 border-[#c1a063]/40 pl-4">
                <h3 className="text-[#c1a063] font-medium mb-1">Bespoke Reports</h3>
                <p className="text-[#9a9080] text-sm">Automated, elite financial summaries.</p>
              </div>
              <div className="border-l-2 border-[#c1a063]/40 pl-4">
                <h3 className="text-[#c1a063] font-medium mb-1">Global Scale</h3>
                <p className="text-[#9a9080] text-sm">Designed for significant portfolios.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SignUp