import React from 'react'
import { ButtonVariant, ButtonSize } from '../../types'
import { GLOBAL_THEME } from '../../utils/constants'

interface BaseButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  children: React.ReactNode
}

export const BaseButton: React.FC<BaseButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed'
  
  const variantClasses = {
    primary: `bg-[${GLOBAL_THEME.COLORS.PRIMARY}] text-white hover:opacity-90 focus:ring-red-500`,
    secondary: `bg-[${GLOBAL_THEME.COLORS.SECONDARY}] text-white hover:opacity-90 focus:ring-slate-500`,
    success: `bg-[${GLOBAL_THEME.COLORS.SUCCESS}] text-white hover:opacity-90 focus:ring-green-500`,
    warning: `bg-[${GLOBAL_THEME.COLORS.WARNING}] text-white hover:opacity-90 focus:ring-orange-500`,
    error: `bg-[${GLOBAL_THEME.COLORS.ERROR}] text-white hover:opacity-90 focus:ring-red-500`,
    ghost: `bg-transparent text-[${GLOBAL_THEME.COLORS.TEXT_PRIMARY}] hover:bg-gray-100 focus:ring-gray-500`,
    outline: `border-2 border-[${GLOBAL_THEME.COLORS.PRIMARY}] text-[${GLOBAL_THEME.COLORS.PRIMARY}] hover:bg-[${GLOBAL_THEME.COLORS.PRIMARY}] hover:text-white focus:ring-red-500`
  }
  
  const sizeClasses = {
    xs: 'px-2 py-1 text-xs min-h-[28px]',
    sm: 'px-3 py-1.5 text-sm min-h-[32px]',
    md: 'px-4 py-2 text-base min-h-[40px]',
    lg: 'px-6 py-3 text-lg min-h-[44px]',
    xl: 'px-8 py-4 text-xl min-h-[48px]'
  }
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`
  
  return (
    <button
      className={combinedClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      )}
      {icon && !loading && <span className="mr-2 flex-shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  )
}
