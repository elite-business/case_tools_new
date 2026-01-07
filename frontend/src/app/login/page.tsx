'use client';

import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Space,
  message,
  theme,
  Row,
  Col,
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import Cookies from 'js-cookie';

const { Title, Text } = Typography;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    const token = Cookies.get('token');
    if (token || isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated]);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('Login successful!');
      // Use replace instead of push to prevent back button issues
      router.replace('/dashboard');
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryBg} 100%)`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background Pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Main Content */}
        <Row 
          style={{ 
            width: '100%', 
            minHeight: 'calc(100vh - 64px)', // Adjust based on your header height
            padding: 24, 
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Col xs={24} sm={24} md={12} lg={10}>
            <Card
              style={{
                width: '100%',
                maxWidth: 400,
                margin: '0 auto',
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                borderRadius: 16,
              }}
              variant="borderless"
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      margin: '0 auto 16px',
                      background: token.colorPrimary,
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                      fontWeight: 'bold',
                      color: '#fff',
                    }}
                  >
                    CT
                  </div>
                  <Title level={2} style={{ marginBottom: 8 }}>
                    Sign In
                  </Title>
                  <Text type="secondary">
                    Enter your credentials to access the platform
                  </Text>
                </div>
                {/* Login Form */}
                <Form
                  name="login"
                  onFinish={handleSubmit}
                  autoComplete="off"
                  layout="vertical"
                  requiredMark={false}
                >
                  <Form.Item
                    name="username"
                    rules={[
                      { required: true, message: 'Please enter your username!' },
                    ]}
                  >
                    <Input
                      size="large"
                      prefix={<UserOutlined />}
                      placeholder="Username"
                      autoComplete="username"
                    />
                  </Form.Item>
                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: 'Please enter your password!' },
                    ]}
                  >
                    <Input.Password
                      size="large"
                      prefix={<LockOutlined />}
                      placeholder="Password"
                      autoComplete="current-password"
                    />
                  </Form.Item>
                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      size="large"
                      loading={loading}
                      block
                      icon={<LoginOutlined />}
                    >
                      Sign In
                    </Button>
                  </Form.Item>
                </Form>
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    © 2026 Elite Business Solutions. All rights reserved.
                  </Text>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
    </div>
  );
}