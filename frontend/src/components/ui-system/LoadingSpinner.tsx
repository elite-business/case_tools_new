import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  message?: string;
  showCard?: boolean;
  centered?: boolean;
  fullscreen?: boolean;
}

export function LoadingSpinner({
  size = 'md',
  className = '',
  message,
  showCard = false,
  centered = false,
  fullscreen = false,
}: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2', 
    lg: 'w-8 h-8 border-4',
    xl: 'w-12 h-12 border-4'
  }[size];

  const spinner = (
    <div 
      className={`${sizeClass} border-gray-300 border-t-primary-600 rounded-full animate-spin ${className}`}
      style={{ animation: 'spin 0.6s linear infinite' }}
    />
  );

  const content = (
    <div className="flex flex-col items-center gap-3">
      {spinner}
      {message && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
          {message}
        </p>
      )}
    </div>
  );

  if (fullscreen) {
    return (
      <div className="loading-fullscreen">
        {showCard ? (
          <div className="loading-card">
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    );
  }

  if (centered) {
    return (
      <div className="loading-center">
        {showCard ? (
          <div className="loading-card">
            {content}
          </div>
        ) : (
          content
        )}
      </div>
    );
  }

  return showCard ? (
    <div className="loading-card">
      {content}
    </div>
  ) : (
    content
  );
}

export default LoadingSpinner;