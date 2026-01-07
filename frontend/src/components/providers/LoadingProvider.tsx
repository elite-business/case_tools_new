'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Spin, Typography, Progress, Space } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

const { Text } = Typography;

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  key?: string;
}

interface LoadingContextType {
  loadingStates: Map<string, LoadingState>;
  setLoading: (key: string, loading: boolean, message?: string, progress?: number) => void;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
  isGlobalLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export function LoadingProvider({ children }: LoadingProviderProps) {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());

  const setLoading = (key: string, loading: boolean, message?: string, progress?: number) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      if (loading) {
        newMap.set(key, { isLoading: true, message, progress, key });
      } else {
        newMap.delete(key);
      }
      return newMap;
    });
  };

  const clearLoading = (key: string) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  };

  const clearAllLoading = () => {
    setLoadingStates(new Map());
  };

  const isGlobalLoading = loadingStates.size > 0;

  return (
    <LoadingContext.Provider
      value={{
        loadingStates,
        setLoading,
        clearLoading,
        clearAllLoading,
        isGlobalLoading,
      }}
    >
      {children}
      {isGlobalLoading && <GlobalLoadingOverlay loadingStates={loadingStates} />}
    </LoadingContext.Provider>
  );
}

interface GlobalLoadingOverlayProps {
  loadingStates: Map<string, LoadingState>;
}

function GlobalLoadingOverlay({ loadingStates }: GlobalLoadingOverlayProps) {
  const [primaryLoading, setPrimaryLoading] = useState<LoadingState | null>(null);

  useEffect(() => {
    // Get the most important loading state
    const states = Array.from(loadingStates.values());
    const withProgress = states.find(state => state.progress !== undefined);
    const withMessage = states.find(state => state.message);
    
    setPrimaryLoading(withProgress || withMessage || states[0] || null);
  }, [loadingStates]);

  if (!primaryLoading) return null;

  const antIcon = <LoadingOutlined style={{ fontSize: 24, color: '#1890ff' }} spin />;

  return (
    <div className="loading-overlay">
      <div className="loading-card" style={{ minWidth: 300 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Spin indicator={antIcon} />
          
          {primaryLoading.message && (
            <Text style={{ fontSize: 16, color: '#666' }}>
              {primaryLoading.message}
            </Text>
          )}
          
          {primaryLoading.progress !== undefined && (
            <Progress 
              percent={primaryLoading.progress} 
              status="active"
              strokeColor={{
                from: '#108ee9',
                to: '#87d068',
              }}
            />
          )}
          
          {loadingStates.size > 1 && (
            <Text style={{ fontSize: 12, color: '#999' }}>
              {loadingStates.size} operations in progress
            </Text>
          )}
        </Space>
      </div>
    </div>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Hook for simple loading state management
export function useSimpleLoading() {
  const { setLoading, clearLoading } = useLoading();
  const [key] = useState(() => `loading_${Date.now()}_${Math.random()}`);

  const startLoading = (message?: string, progress?: number) => {
    setLoading(key, true, message, progress);
  };

  const stopLoading = () => {
    clearLoading(key);
  };

  const updateProgress = (progress: number, message?: string) => {
    setLoading(key, true, message, progress);
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      clearLoading(key);
    };
  }, [clearLoading, key]);

  return {
    startLoading,
    stopLoading,
    updateProgress,
  };
}

// Higher-order component to automatically show loading for async operations
export function withLoading<P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string
) {
  const WrappedComponent = (props: P) => {
    const { startLoading, stopLoading } = useSimpleLoading();
    
    // Auto-start loading when component mounts
    React.useEffect(() => {
      startLoading(loadingMessage);
      
      // Auto-stop loading after a timeout (fallback)
      const timeout = setTimeout(() => {
        stopLoading();
      }, 10000);
      
      return () => {
        clearTimeout(timeout);
        stopLoading();
      };
    }, [startLoading, stopLoading]);

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withLoading(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

export default LoadingProvider;