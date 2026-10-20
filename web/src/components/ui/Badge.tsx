import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-sky-950/80 text-sky-300 shadow hover:bg-sky-900/80",
        secondary:
          "border-transparent bg-slate-800 text-slate-100 hover:bg-slate-700",
        destructive:
          "border-transparent bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30",
        outline: "text-foreground",
        glass: "bg-slate-900/60 border-white/10 text-slate-200 backdrop-blur-md",
        success: "border-transparent bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
        warning: "border-transparent bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.3)]",
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
