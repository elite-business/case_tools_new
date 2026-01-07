'use client';

import React from 'react';
import { 
  Dropdown, 
  Button, 
  Menu, 
  Space, 
  Typography, 
  Divider,
  Tooltip,
  Badge
} from 'antd';
import {
  MoreOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  UserAddOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CopyOutlined,
  DownloadOutlined,
  ShareAltOutlined,
  PrinterOutlined,
  MailOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text } = Typography;

export interface ActionItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  hidden?: boolean;
  type?: 'item' | 'divider' | 'group';
  children?: ActionItem[];
  tooltip?: string;
  badge?: string | number;
  confirm?: {
    title: string;
    description?: string;
    okText?: string;
    cancelText?: string;
  };
}

interface ActionDropdownProps {
  items: ActionItem[];
  trigger?: ('click' | 'hover' | 'contextMenu')[];
  placement?: 'bottomLeft' | 'bottomCenter' | 'bottomRight' | 'topLeft' | 'topCenter' | 'topRight';
  size?: 'small' | 'middle' | 'large';
  type?: 'default' | 'primary' | 'text' | 'link';
  shape?: 'default' | 'circle' | 'round';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

const IconMap: Record<string, React.ComponentType> = {
  'eye': EyeOutlined,
  'edit': EditOutlined,
  'delete': DeleteOutlined,
  'assign': UserAddOutlined,
  'check': CheckCircleOutlined,
  'close': CloseCircleOutlined,
  'copy': CopyOutlined,
  'download': DownloadOutlined,
  'share': ShareAltOutlined,
  'print': PrinterOutlined,
  'email': MailOutlined,
  'play': PlayCircleOutlined,
  'pause': PauseCircleOutlined,
  'refresh': ReloadOutlined,
  'settings': SettingOutlined,
  'warning': WarningOutlined,
  'info': InfoCircleOutlined,
  'error': ExclamationCircleOutlined,
};

const ActionDropdown: React.FC<ActionDropdownProps> = ({
  items,
  trigger = ['click'],
  placement = 'bottomLeft',
  size = 'middle',
  type = 'text',
  shape = 'default',
  icon = <MoreOutlined />,
  children,
  disabled = false,
  loading = false,
  className,
  onOpenChange,
}) => {
  const processItems = (actionItems: ActionItem[]): any[] => {
    return actionItems
      .filter(item => !item.hidden)
      .map(item => {
        if (item.type === 'divider') {
          return { type: 'divider' };
        }

        if (item.type === 'group') {
          return {
            type: 'group',
            label: item.label,
            children: processItems(item.children || []),
          };
        }

        const menuItem: any = {
          key: item.key,
          disabled: item.disabled,
          danger: item.danger,
          onClick: item.onClick,
          label: (
            <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space align="center" size={8}>
                {item.icon}
                <span>{item.label}</span>
              </Space>
              {item.badge && (
                <Badge 
                  count={item.badge} 
                  size="small"
                  style={{ 
                    backgroundColor: item.danger ? '#ff4d4f' : '#1677ff' 
                  }}
                />
              )}
            </Space>
          ),
        };

        if (item.tooltip) {
          menuItem.label = (
            <Tooltip title={item.tooltip} placement="left">
              {menuItem.label}
            </Tooltip>
          );
        }

        return menuItem;
      });
  };

  const menuItems = processItems(items);

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  return (
    <motion.div
      variants={buttonVariants}
      initial="initial"
      whileHover="hover"
      whileTap="tap"
      className={className}
    >
      <Dropdown
        menu={{ items: menuItems }}
        trigger={trigger}
        placement={placement}
        disabled={disabled}
        onOpenChange={onOpenChange}
        overlayStyle={{
          minWidth: 180,
        }}
        overlayClassName="action-dropdown-overlay"
      >
        {children || (
          <Button
            type={type}
            size={size}
            shape={shape}
            icon={icon}
            disabled={disabled}
            loading={loading}
            style={{
              border: type === 'text' ? 'none' : undefined,
              boxShadow: type === 'text' ? 'none' : undefined,
            }}
          />
        )}
      </Dropdown>
    </motion.div>
  );
};

// Predefined action sets for common use cases
export const CommonActions = {
  view: {
    key: 'view',
    label: 'View Details',
    icon: <EyeOutlined />,
  },
  edit: {
    key: 'edit',
    label: 'Edit',
    icon: <EditOutlined />,
  },
  delete: {
    key: 'delete',
    label: 'Delete',
    icon: <DeleteOutlined />,
    danger: true,
  },
  assign: {
    key: 'assign',
    label: 'Assign',
    icon: <UserAddOutlined />,
  },
  close: {
    key: 'close',
    label: 'Close',
    icon: <CheckCircleOutlined />,
  },
  copy: {
    key: 'copy',
    label: 'Copy',
    icon: <CopyOutlined />,
  },
  download: {
    key: 'download',
    label: 'Download',
    icon: <DownloadOutlined />,
  },
  share: {
    key: 'share',
    label: 'Share',
    icon: <ShareAltOutlined />,
  },
  divider: {
    key: 'divider',
    type: 'divider' as const,
    label: '',
  },
};

export default ActionDropdown;