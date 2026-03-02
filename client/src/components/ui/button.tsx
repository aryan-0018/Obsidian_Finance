import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[#c1a063] text-[#0a0a0a] shadow-xs hover:bg-[#a88a4e] font-semibold",
        destructive:
          "bg-[#b33a3a] text-white shadow-xs hover:bg-[#992e2e] focus-visible:ring-[#b33a3a]/20",
        outline:
          "border border-[#2a2520] bg-transparent text-[#e8e0d4] shadow-xs hover:bg-[#c1a063]/10 hover:text-[#c1a063] hover:border-[#c1a063]/30",
        secondary:
          "bg-[#1a1a1a] text-[#e8e0d4] shadow-xs hover:bg-[#222]",
        ghost:
          "hover:bg-[#c1a063]/10 hover:text-[#c1a063]",
        link: "text-[#c1a063] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
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
