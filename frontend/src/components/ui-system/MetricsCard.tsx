'use client';

import React from 'react';
import { Card, Statistic, Space, Typography, Tooltip, Skeleton } from 'antd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  QuestionCircleOutlined 
} from '@ant-design/icons';

const { Text } = Typography;

export interface MetricsCardProps {
  title: string;
  value: number | string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  precision?: number;
  loading?: boolean;
  color?: string;
  icon?: React.ReactNode;
  tooltip?: string;
  onClick?: () => void;
  className?: string;
  formatter?: (value: any) => string;
  extra?: React.ReactNode;
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  trend,
  precision = 0,
  loading = false,
  color = '#1677ff',
  icon,
  tooltip,
  onClick,
  className,
  formatter,
  extra,
}) => {
  const cardVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    hover: { 
      scale: onClick ? 1.02 : 1,
      boxShadow: onClick 
        ? '0 4px 20px rgba(0, 0, 0, 0.12)' 
        : '0 2px 8px rgba(0, 0, 0, 0.06)',
      transition: { duration: 0.2 }
    }
  };

  const valueVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1, transition: { delay: 0.1 } }
  };

  const trendColor = trend?.isPositive === false ? '#ff4d4f' : '#52c41a';

  const titleElement = (
    <Space align="center" size={4}>
      {icon}
      <Text type="secondary" style={{ fontSize: 14, fontWeight: 500 }}>
        {title}
      </Text>
      {tooltip && (
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined 
            style={{ 
              fontSize: 12, 
              color: '#999',
              cursor: 'help'
            }} 
          />
        </Tooltip>
      )}
    </Space>
  );

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      className={className}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      <Card
        size="small"
        loading={loading}
        style={{
          height: '100%',
          border: `1px solid #f0f0f0`,
          borderRadius: 8,
        }}
        bodyStyle={{ 
          padding: '20px 24px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}
      >
        {loading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              {titleElement}
            </div>
            
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <motion.div variants={valueVariants}>
                <Statistic
                  value={value}
                  precision={precision}
                  prefix={prefix}
                  suffix={suffix}
                  formatter={formatter}
                  valueStyle={{ 
                    color,
                    fontSize: 28,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                  }}
                />
              </motion.div>
              
              <AnimatePresence>
                {trend && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: 0.2 }}
                    style={{ marginTop: 8 }}
                  >
                    <Space size={4} align="center">
                      <Space size={2} align="center">
                        {trend.value > 0 && (
                          <ArrowUpOutlined 
                            style={{ 
                              color: trendColor, 
                              fontSize: 12 
                            }} 
                          />
                        )}
                        {trend.value < 0 && (
                          <ArrowDownOutlined 
                            style={{ 
                              color: trendColor, 
                              fontSize: 12 
                            }} 
                          />
                        )}
                        <Text
                          style={{
                            color: trendColor,
                            fontSize: 12,
                            fontWeight: 500,
                          }}
                        >
                          {Math.abs(trend.value).toFixed(1)}%
                        </Text>
                      </Space>
                      {trend.label && (
                        <Text 
                          type="secondary" 
                          style={{ fontSize: 12 }}
                        >
                          {trend.label}
                        </Text>
                      )}
                    </Space>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {extra && (
              <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 12 }}>
                {extra}
              </div>
            )}
          </>
        )}
      </Card>
    </motion.div>
  );
};

export default MetricsCard;