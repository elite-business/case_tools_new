'use client';

import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface LoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'small' | 'default' | 'large';
}

export default function LoadingScreen({ 
  message = 'Loading...', 
  fullScreen = false,
  size = 'large' 
}: LoadingScreenProps) {
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'large' ? 48 : size === 'small' ? 24 : 32 }} spin />;
  
  if (fullScreen) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        zIndex: 9999,
      }}>
        <Spin indicator={antIcon} />
        {message && (
          <div style={{ 
            marginTop: 16, 
            fontSize: 14, 
            color: '#666',
            fontWeight: 500 
          }}>
            {message}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      minHeight: 200,
    }}>
      <Spin indicator={antIcon} />
      {message && (
        <div style={{ 
          marginTop: 16, 
          fontSize: 14, 
          color: '#666' 
        }}>
          {message}
        </div>
      )}
    </div>
  );
}