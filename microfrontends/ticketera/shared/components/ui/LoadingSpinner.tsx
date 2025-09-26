import React from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  message?: string
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  message = 'Cargando...',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  return (
    <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
      <div 
        className={`border-4 border-red-200 border-t-red-600 rounded-full animate-spin ${sizeClasses[size]}`}
      />
      {message && (
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
          {message}
        </p>
      )}
    </div>
  )
}