import React from 'react'

interface ErrorMessageProps {
  message: string
  title?: string
  className?: string
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  title = 'Error',
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-center text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="w-6 h-6 text-red-600 dark:text-red-400">
          ⚠️
        </div>
        <div>
          {title && (
            <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
              {title}
            </h4>
          )}
          <p className="text-red-700 dark:text-red-300">
            {message}
          </p>
        </div>
      </div>
    </div>
  )
}