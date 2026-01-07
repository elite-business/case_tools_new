'use client';

import React, { Component, ReactNode } from 'react';
import { Result, Button, Typography, Card, Space, Alert } from 'antd';
import { ExceptionOutlined, ReloadOutlined, HomeOutlined, BugOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Log error to external service or console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#f5f5f5'
        }}>
          <Card style={{ maxWidth: 600, width: '100%' }}>
            <Result
              status="error"
              icon={<ExceptionOutlined />}
              title="Something went wrong"
              subTitle="An unexpected error occurred. Our team has been notified."
              extra={[
                <Button
                  key="retry"
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={this.handleRetry}
                >
                  Try Again
                </Button>,
                <Button
                  key="reload"
                  icon={<ReloadOutlined />}
                  onClick={this.handleReload}
                >
                  Reload Page
                </Button>,
                <Button
                  key="home"
                  icon={<HomeOutlined />}
                  onClick={this.handleGoHome}
                >
                  Go Home
                </Button>,
              ]}
            >
              {process.env.NODE_ENV === 'development' && (
                <div style={{ textAlign: 'left', marginTop: 24 }}>
                  <Alert
                    message="Development Error Details"
                    type="warning"
                    showIcon
                    icon={<BugOutlined />}
                    description={
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text strong>Error: </Text>
                          <Text code>{this.state.error?.name}</Text>
                        </div>
                        <div>
                          <Text strong>Message: </Text>
                          <Paragraph copyable={{ text: this.state.error?.message }}>
                            {this.state.error?.message}
                          </Paragraph>
                        </div>
                        {this.state.error?.stack && (
                          <div>
                            <Text strong>Stack Trace: </Text>
                            <Paragraph
                              copyable={{ text: this.state.error.stack }}
                              style={{
                                fontSize: 12,
                                fontFamily: 'monospace',
                                background: '#f5f5f5',
                                padding: 8,
                                borderRadius: 4,
                                maxHeight: 200,
                                overflow: 'auto'
                              }}
                            >
                              {this.state.error.stack}
                            </Paragraph>
                          </div>
                        )}
                        {this.state.errorInfo?.componentStack && (
                          <div>
                            <Text strong>Component Stack: </Text>
                            <Paragraph
                              copyable={{ text: this.state.errorInfo.componentStack }}
                              style={{
                                fontSize: 12,
                                fontFamily: 'monospace',
                                background: '#f5f5f5',
                                padding: 8,
                                borderRadius: 4,
                                maxHeight: 200,
                                overflow: 'auto'
                              }}
                            >
                              {this.state.errorInfo.componentStack}
                            </Paragraph>
                          </div>
                        )}
                      </Space>
                    }
                  />
                </div>
              )}
            </Result>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for throwing errors in functional components (useful for testing)
export function useErrorHandler() {
  const throwError = (error: Error) => {
    throw error;
  };

  return throwError;
}

export default ErrorBoundary;