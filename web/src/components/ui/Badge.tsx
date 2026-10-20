import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-sky-500/20 bg-sky-500/15 text-sky-700 dark:text-sky-300 shadow-sm",
        secondary:
          "border-neu-borderSubtle bg-neu-sunken text-slate-700 dark:text-slate-300 shadow-neu-inset-sm",
        destructive:
          "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:text-rose-300 shadow-sm",
        outline: "border-neu-border text-slate-700 dark:text-slate-200",
        glass: "bg-neu-surface border-neu-border text-slate-700 dark:text-slate-200 shadow-neu-raised-sm",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 shadow-sm",
        warning: "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-300 shadow-sm",
        firing: "border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-800 dark:text-amber-300 shadow-glow-amber",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
