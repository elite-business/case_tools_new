'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Result, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: 'calc(100vh - 200px)',
      padding: '40px 20px'
    }}>
      <Result
        status="403"
        title="403"
        subTitle="Sorry, you are not authorized to access this page."
        icon={<LockOutlined style={{ fontSize: 72, color: '#ff4d4f' }} />}
        extra={[
          <Button 
            type="primary" 
            key="dashboard"
            onClick={() => router.push('/dashboard')}
          >
            Go to Dashboard
          </Button>,
          <Button 
            key="back"
            onClick={() => router.back()}
          >
            Go Back
          </Button>,
        ]}
      />
    </div>
  );
}