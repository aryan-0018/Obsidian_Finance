import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#e5c158]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050507] aria-invalid:ring-destructive/20 aria-invalid:border-destructive select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-[#f5cf6d] via-[#e5b83b] to-[#c99a22] text-[#050507] shadow-[0_4px_16px_rgba(229,184,59,0.25),inset_0_1px_0_rgba(255,255,255,0.45)] hover:brightness-105 active:scale-[0.97] font-semibold tracking-wide",
        destructive:
          "bg-gradient-to-b from-[#ff453a] to-[#d73229] text-white shadow-[0_4px_16px_rgba(255,69,58,0.25),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-105 active:scale-[0.97] font-medium",
        outline:
          "border border-white/[0.10] bg-white/[0.04] backdrop-blur-xl text-[#f5f5f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.08] hover:border-white/[0.20] hover:text-white active:scale-[0.97]",
        secondary:
          "bg-white/[0.06] text-[#f5f5f7] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-white/[0.12] border border-white/[0.08] active:scale-[0.97]",
        ghost:
          "text-[#8e8e93] hover:bg-white/[0.06] hover:text-white active:scale-[0.97]",
        link: "text-[#e5c158] underline-offset-4 hover:text-[#f5cf6d] hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5 text-xs",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-4 text-base",
        icon: "size-9 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef<HTMLButtonElement, React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
