'use client';

import React from 'react';
import { Badge, Tooltip, Space, Typography } from 'antd';
import { motion } from 'framer-motion';
import { 
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  MinusCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { CaseStatus, CaseSeverity, CasePriority } from '@/lib/types';

const { Text } = Typography;

interface StatusIndicatorProps {
  type: 'status' | 'severity' | 'priority' | 'health';
  value: string;
  showIcon?: boolean;
  showText?: boolean;
  size?: 'small' | 'default' | 'large';
  animated?: boolean;
  tooltip?: string;
  className?: string;
}

const statusConfig = {
  OPEN: { color: 'blue', icon: MinusCircleOutlined, text: 'Open' },
  ASSIGNED: { color: 'orange', icon: ClockCircleOutlined, text: 'Assigned' },
  IN_PROGRESS: { color: 'processing', icon: LoadingOutlined, text: 'In Progress' },
  PENDING_CUSTOMER: { color: 'warning', icon: WarningOutlined, text: 'Pending Customer' },
  PENDING_VENDOR: { color: 'warning', icon: WarningOutlined, text: 'Pending Vendor' },
  RESOLVED: { color: 'success', icon: CheckCircleOutlined, text: 'Resolved' },
  CLOSED: { color: 'default', icon: CheckCircleOutlined, text: 'Closed' },
  CANCELLED: { color: 'error', icon: CloseCircleOutlined, text: 'Cancelled' },
};

const severityConfig = {
  LOW: { color: '#52c41a', text: 'Low' },
  MEDIUM: { color: '#fadb14', text: 'Medium' },
  HIGH: { color: '#ffa940', text: 'High' },
  CRITICAL: { color: '#ff4d4f', text: 'Critical' },
};

const priorityConfig = {
  LOW: { color: '#52c41a', text: 'Low' },
  MEDIUM: { color: '#fadb14', text: 'Medium' },
  HIGH: { color: '#ffa940', text: 'High' },
  URGENT: { color: '#ff4d4f', text: 'Urgent' },
};

const healthConfig = {
  UP: { color: 'success', icon: CheckCircleOutlined, text: 'Healthy' },
  HEALTHY: { color: 'success', icon: CheckCircleOutlined, text: 'Healthy' },
  DOWN: { color: 'error', icon: CloseCircleOutlined, text: 'Down' },
  UNHEALTHY: { color: 'error', icon: CloseCircleOutlined, text: 'Unhealthy' },
  DEGRADED: { color: 'warning', icon: WarningOutlined, text: 'Degraded' },
  UNKNOWN: { color: 'default', icon: MinusCircleOutlined, text: 'Unknown' },
  CONNECTED: { color: 'success', icon: CheckCircleOutlined, text: 'Connected' },
  DISCONNECTED: { color: 'error', icon: CloseCircleOutlined, text: 'Disconnected' },
  ERROR: { color: 'error', icon: ExclamationCircleOutlined, text: 'Error' },
};

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  type,
  value,
  showIcon = false,
  showText = true,
  size = 'default',
  animated = false,
  tooltip,
  className,
}) => {
  let config: any;
  
  switch (type) {
    case 'status':
      config = statusConfig[value as CaseStatus];
      break;
    case 'severity':
      config = severityConfig[value as CaseSeverity];
      break;
    case 'priority':
      config = priorityConfig[value as CasePriority];
      break;
    case 'health':
      config = healthConfig[value as keyof typeof healthConfig];
      break;
    default:
      config = { color: 'default', text: value };
  }

  if (!config) {
    config = { color: 'default', text: value };
  }

  const variants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
    }
  };

  const iconVariants = {
    rotate: {
      rotate: 360,
      transition: { duration: 1, repeat: Infinity, ease: 'linear' }
    }
  };

  const IconComponent = config.icon;
  const isProcessing = type === 'status' && value === 'IN_PROGRESS';

  const content = (
    <motion.div
      variants={variants}
      initial={animated ? "initial" : false}
      animate={animated ? (isProcessing ? "pulse" : "animate") : false}
      className={className}
    >
      {type === 'severity' || type === 'priority' ? (
        <Badge
          color={config.color}
          text={showText ? config.text : undefined}
          style={{ 
            fontSize: size === 'small' ? 12 : size === 'large' ? 16 : 14,
          }}
        />
      ) : (
        <Space size={4} align="center">
          {showIcon && IconComponent && (
            <motion.div
              variants={iconVariants}
              animate={isProcessing && animated ? "rotate" : false}
            >
              <IconComponent 
                style={{ 
                  color: typeof config.color === 'string' ? config.color : undefined,
                  fontSize: size === 'small' ? 12 : size === 'large' ? 16 : 14,
                }} 
              />
            </motion.div>
          )}
          {showText && (
            <Badge
              status={typeof config.color === 'string' ? undefined : config.color as any}
              color={typeof config.color === 'string' ? config.color : undefined}
              text={
                <Text
                  style={{
                    fontSize: size === 'small' ? 12 : size === 'large' ? 16 : 14,
                    fontWeight: 500,
                  }}
                >
                  {config.text}
                </Text>
              }
            />
          )}
        </Space>
      )}
    </motion.div>
  );

  return tooltip ? (
    <Tooltip title={tooltip}>
      {content}
    </Tooltip>
  ) : content;
};

export default StatusIndicator;