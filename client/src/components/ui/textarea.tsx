import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "border-white/[0.10] placeholder:text-[#71717a] selection:bg-[#e5c158] selection:text-black focus-visible:border-[#e5c158]/60 focus-visible:ring-2 focus-visible:ring-[#e5c158]/20 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive bg-white/[0.03] flex field-sizing-content min-h-16 w-full rounded-xl border px-3.5 py-2 text-sm text-[#fcfcfc] shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)] transition-all duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
