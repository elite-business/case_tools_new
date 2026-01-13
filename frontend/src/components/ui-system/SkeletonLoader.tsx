'use client';

import React from 'react';
import { Skeleton, Card, Space, Row, Col } from 'antd';

interface SkeletonLoaderProps {
  type?: 'list' | 'card' | 'table' | 'form' | 'dashboard';
  rows?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'list', 
  rows = 5 
}) => {
  switch (type) {
    case 'dashboard':
      return (
        <div style={{ padding: 24 }}>
          <Row gutter={[16, 16]}>
            {[1, 2, 3, 4].map(i => (
              <Col key={i} xs={24} sm={12} md={6}>
                <Card>
                  <Skeleton.Input active block />
                  <Skeleton active paragraph={{ rows: 2 }} title={false} />
                </Card>
              </Col>
            ))}
          </Row>
          <Card style={{ marginTop: 16 }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </Card>
        </div>
      );

    case 'table':
      return (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Skeleton.Input active block />
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} active />
            ))}
          </Space>
        </Card>
      );

    case 'card':
      return (
        <Row gutter={[16, 16]}>
          {Array.from({ length: rows }).map((_, i) => (
            <Col key={i} xs={24} sm={12} md={8}>
              <Card>
                <Skeleton active />
              </Card>
            </Col>
          ))}
        </Row>
      );

    case 'form':
      return (
        <Card>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {Array.from({ length: rows }).map((_, i) => (
              <div key={i}>
                <Skeleton.Input active size="small" style={{ width: 100 }} />
                <Skeleton.Input active block style={{ marginTop: 8 }} />
              </div>
            ))}
          </Space>
        </Card>
      );

    case 'list':
    default:
      return (
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {Array.from({ length: rows }).map((_, i) => (
            <Card key={i}>
              <Skeleton active avatar paragraph={{ rows: 2 }} />
            </Card>
          ))}
        </Space>
      );
  }
};

