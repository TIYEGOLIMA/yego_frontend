import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-lg shadow-primary-500/20",
        secondary: "glassmorphism-light hover:glassmorphism text-neutral-900 dark:text-neutral-100",
        ghost: "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 backdrop-blur-sm",
        danger: "bg-gradient-to-r from-error-500 to-error-600 hover:from-error-600 hover:to-error-700 text-white shadow-lg shadow-error-500/20",
        outline: "border-2 border-primary-500 text-primary-500 dark:text-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/50 backdrop-blur-sm",
        link: "text-primary-500 underline-offset-4 hover:underline p-0 h-auto font-normal whitespace-normal",
        glassmorphism: "glassmorphism hover:glassmorphism-strong text-neutral-900 dark:text-neutral-100",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 py-2.5 text-sm", 
        lg: "h-14 px-8 py-4 text-base",
        xl: "h-16 px-10 py-5 text-lg",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {(variant === "primary" || variant === "danger") && (
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" aria-hidden />
        )}
        
        <div className="relative z-[1] flex flex-row flex-nowrap items-center justify-center gap-2 whitespace-nowrap">
          {loading && (
            <svg
              className="animate-spin h-5 w-5 shrink-0"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          
          {!loading && leftIcon && <span className="shrink-0 inline-flex items-center">{leftIcon}</span>}
          <span
            className={cn(
              "min-w-0",
              variant === "link"
                ? "text-left"
                : "inline-flex max-w-full flex-row flex-nowrap items-center justify-center gap-1.5 [&_svg]:shrink-0"
            )}
          >
            {children}
          </span>
          {!loading && rightIcon && <span className="shrink-0 inline-flex items-center">{rightIcon}</span>}
        </div>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }