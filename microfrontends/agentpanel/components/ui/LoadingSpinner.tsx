import React from 'react'

interface LoadingSpinnerProps {
  message?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Cargando...' }) => {
  return (
    <div className="flex justify-center py-12">
      <div className="text-center">
        <div className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4 border-4 border-gray-200 border-t-blue-600 rounded-full"></div>
        <p className="text-slate-600 dark:text-slate-300">{message}</p>
      </div>
    </div>
  )
}
