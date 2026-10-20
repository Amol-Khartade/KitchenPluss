import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-500 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600 text-white shadow-glow-sky hover:from-sky-400 hover:to-indigo-500 border border-sky-300/30",
        destructive:
          "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
        outline:
          "border border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-800/80 hover:text-white shadow-sm",
        secondary:
          "bg-slate-800 text-slate-100 hover:bg-slate-800/80 border border-white/10",
        ghost: "hover:bg-white/10 text-slate-400 hover:text-slate-200",
        glass: "bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-glass text-slate-200 hover:text-white hover:bg-white/5",
        success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-glow-emerald",
        warning: "bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-glow-amber",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-10 rounded-xl px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
