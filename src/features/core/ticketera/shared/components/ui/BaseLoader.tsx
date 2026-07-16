import React from 'react'

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
        className={`rounded-full border-gray-200 border-t-red-600 animate-spin ${sizeClasses[size]}`}
      />
      {message && (
        <p className={`mt-4 text-sm text-center ${fullScreen ? 'text-white' : 'text-gray-600'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
