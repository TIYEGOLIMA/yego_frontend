import React from 'react'
import { GLOBAL_THEME } from '../../utils/constants'

interface BaseLoaderProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  fullScreen?: boolean
  className?: string
}

export const BaseLoader: React.FC<BaseLoaderProps> = ({ 
  size = 'md', 
  message,
  fullScreen = false,
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3', 
    lg: 'w-12 h-12 border-4',
    xl: 'w-16 h-16 border-4'
  }

  const containerClasses = fullScreen 
    ? 'fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50'
    : 'flex flex-col items-center justify-center py-8'

  return (
    <div className={`${containerClasses} ${className}`}>
      <div 
        className={`border-gray-200 border-t-[${GLOBAL_THEME.COLORS.PRIMARY}] rounded-full animate-spin ${sizeClasses[size]}`}
        style={{
          borderTopColor: GLOBAL_THEME.COLORS.PRIMARY
        }}
      />
      {message && (
        <p className={`mt-4 text-sm text-center ${fullScreen ? 'text-white' : 'text-gray-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
