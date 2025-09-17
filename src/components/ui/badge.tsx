import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../utils/cn"

const badgeVariants = cva(
  "yego-badge",
  {
    variants: {
      variant: {
        primary: "yego-badge-primary",
        secondary: "yego-badge-neutral",
        success: "yego-badge-success",
        warning: "yego-badge-warning",
        error: "yego-badge-error",
        outline: "border border-border dark:border-border-dark text-neutral-700 dark:text-neutral-300",
      },
    },
    defaultVariants: {
      variant: "primary",
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