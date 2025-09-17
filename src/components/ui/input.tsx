import * as React from "react"
import { cn } from "../../utils/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, leftIcon, rightIcon, label, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2 ml-1">
            {label}
          </label>
        )}
        <div className="relative group">
          {/* Efecto de fondo glassmorphism */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 dark:from-neutral-900/20 dark:to-neutral-800/10 rounded-xl blur-sm group-hover:blur-md transition-all duration-300"></div>
          
          {/* Contenedor principal con glassmorphism */}
          <div className="relative input-glassmorphism group-hover:shadow-lg group-hover:shadow-primary-500/10">
            {leftIcon && (
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors duration-300">
                {leftIcon}
              </div>
            )}
            
            <input
              type={type}
              id={inputId}
              className={cn(
                "block w-full bg-transparent border-0 px-4 py-3 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-0 focus:border-0 transition-all duration-300 text-base",
                leftIcon && "pl-12",
                rightIcon && "pr-12",
                error && "text-error-600 dark:text-error-400",
                className
              )}
              ref={ref}
              {...props}
            />
            
            {rightIcon && (
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors duration-300">
                {rightIcon}
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="mt-2 flex items-center gap-2 p-3 bg-error-50/80 dark:bg-error-900/30 border border-error-200/50 dark:border-error-800/50 rounded-lg backdrop-blur-sm">
            <div className="w-2 h-2 bg-error-500 rounded-full animate-pulse"></div>
            <p className="text-sm text-error-700 dark:text-error-300 font-medium">{error}</p>
          </div>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }