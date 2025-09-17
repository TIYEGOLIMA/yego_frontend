import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../utils/cn"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group",
  {
    variants: {
      variant: {
        primary: "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white focus:ring-primary-500 shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:shadow-primary-500/30 transform hover:scale-105",
        secondary: "glassmorphism-light hover:glassmorphism text-neutral-900 dark:text-neutral-100 hover:scale-105 focus:ring-neutral-500", 
        ghost: "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 focus:ring-neutral-500 backdrop-blur-sm",
        danger: "bg-gradient-to-r from-error-500 to-error-600 hover:from-error-600 hover:to-error-700 text-white focus:ring-error-500 shadow-xl shadow-error-500/25 hover:shadow-2xl hover:shadow-error-500/30 transform hover:scale-105",
        outline: "border-2 border-primary-500 text-primary-500 dark:text-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-950/50 focus:ring-primary-500 backdrop-blur-sm",
        link: "text-primary-500 underline-offset-4 hover:underline p-0 h-auto font-normal",
        glassmorphism: "glassmorphism hover:glassmorphism-strong text-neutral-900 dark:text-neutral-100 hover:scale-105 focus:ring-neutral-500",
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
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {(variant === "primary" || variant === "danger") && (
          <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl"></div>
        )}
        
        <div className="relative flex items-center justify-center">
          {loading && (
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5"
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
          
          {!loading && leftIcon && <span className="mr-3 transition-transform group-hover:scale-110">{leftIcon}</span>}
          <span className="transition-transform group-hover:scale-105">{children}</span>
          {!loading && rightIcon && <span className="ml-3 transition-transform group-hover:scale-110">{rightIcon}</span>}
        </div>
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }