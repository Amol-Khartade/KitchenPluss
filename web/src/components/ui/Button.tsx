import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:pointer-events-none disabled:opacity-50 active:scale-95 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600 text-white shadow-glow-sky hover:from-sky-400 hover:to-indigo-500 border border-sky-300/30 active:shadow-neu-inset-sm",
        destructive:
          "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 shadow-sm active:shadow-neu-inset-sm",
        outline:
          "border border-neu-border bg-neu-surface text-slate-700 dark:text-slate-200 shadow-neu-raised-sm hover:shadow-neu-raised active:shadow-neu-inset-sm",
        secondary:
          "bg-neu-surface text-slate-700 dark:text-slate-200 border border-neu-border shadow-neu-raised-sm hover:shadow-neu-raised active:shadow-neu-inset-sm",
        ghost: "hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200",
        glass: "bg-neu-surface border border-neu-border shadow-neu-raised-sm text-slate-700 dark:text-slate-200 hover:shadow-neu-raised active:shadow-neu-inset-sm",
        success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 shadow-sm active:shadow-neu-inset-sm",
        warning: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 shadow-sm active:shadow-neu-inset-sm",
        neuRaised: "bg-neu-surface text-slate-800 dark:text-slate-100 border border-neu-border shadow-neu-raised hover:shadow-neu-raised-lg active:shadow-neu-inset-sm active:scale-[0.98]",
        neuInset: "bg-neu-sunken text-sky-600 dark:text-sky-400 border border-neu-borderSubtle shadow-neu-inset-sm",
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
