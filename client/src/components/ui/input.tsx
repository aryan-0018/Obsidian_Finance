import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-[#8e8e93] selection:bg-[#e5c158] selection:text-black border-white/[0.09] flex h-10 w-full min-w-0 rounded-xl border bg-white/[0.04] px-3.5 py-2 text-sm text-[#f5f5f7] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] transition-all duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:dark]",
          "hover:border-white/[0.16]",
          "focus:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:border-[#e5c158]/70 focus-visible:ring-2 focus-visible:ring-[#e5c158]/25",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
