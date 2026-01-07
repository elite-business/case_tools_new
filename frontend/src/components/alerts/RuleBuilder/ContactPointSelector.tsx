'use client';

import React, { useEffect } from 'react';
import { Select, Space, Typography, Card, Alert, Spin, Tag, Button } from 'antd';
import { 
  NotificationOutlined, 
  MailOutlined, 
  MessageOutlined, 
  PhoneOutlined,
  GlobalOutlined,
  PlusOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api-client';
import { useAlertBuilderStore } from '@/store/alert-builder-store';
import { GrafanaContactPoint } from '@/lib/types';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface ContactPointSelectorProps {
  className?: string;
}

const ContactPointSelector: React.FC<ContactPointSelectorProps> = ({ className }) => {
  const {
    contactPoints,
    selectedContactPoints,
    setContactPoints,
    setSelectedContactPoints,
    setError,
    clearError,
  } = useAlertBuilderStore();

  const {
    data: contactPointsData,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['grafana-contact-points'],
    queryFn: () => alertsApi.getGrafanaContactPoints(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (contactPointsData?.data) {
      setContactPoints(contactPointsData.data);
    }
  }, [contactPointsData, setContactPoints]);

  useEffect(() => {
    if (isError && error) {
      setError('contactPoints', 'Failed to load Grafana contact points');
    } else {
      clearError('contactPoints');
    }
  }, [isError, error, setError, clearError]);

  const handleContactPointsChange = (values: string[]) => {
    setSelectedContactPoints(values);
    clearError('contactPoints');
  };

  const getContactPointIcon = (type: string): React.ReactNode => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('email') || lowerType.includes('smtp')) {
      return <MailOutlined className="text-blue-500" />;
    }
    if (lowerType.includes('slack') || lowerType.includes('discord') || lowerType.includes('teams')) {
      return <MessageOutlined className="text-green-500" />;
    }
    if (lowerType.includes('webhook') || lowerType.includes('http')) {
      return <GlobalOutlined className="text-purple-500" />;
    }
    if (lowerType.includes('sms') || lowerType.includes('phone')) {
      return <PhoneOutlined className="text-orange-500" />;
    }
    return <NotificationOutlined className="text-gray-500" />;
  };

  const getContactPointTypeColor = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('email')) return 'blue';
    if (lowerType.includes('slack')) return 'green';
    if (lowerType.includes('discord')) return 'purple';
    if (lowerType.includes('teams')) return 'cyan';
    if (lowerType.includes('webhook')) return 'orange';
    if (lowerType.includes('sms')) return 'magenta';
    return 'default';
  };

  const getContactPointDescription = (contactPoint: GrafanaContactPoint): string => {
    if (contactPoint.settings) {
      const { settings } = contactPoint;
      if (settings.url) {
        return `Webhook: ${settings.url}`;
      }
      if (settings.addresses && Array.isArray(settings.addresses)) {
        return `Recipients: ${settings.addresses.slice(0, 2).join(', ')}${settings.addresses.length > 2 ? '...' : ''}`;
      }
      if (settings.channel) {
        return `Channel: ${settings.channel}`;
      }
      if (settings.username) {
        return `User: ${settings.username}`;
      }
    }
    return `${contactPoint.type} notification channel`;
  };

  if (isLoading) {
    return (
      <Card title="Notification Channels" size="small" className={className}>
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
          <Spin />
          <Text type="secondary" className="text-sm">Loading Grafana contact points...</Text>
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card title="Notification Channels" size="small" className={className}>
        <Alert
          type="error"
          message="Failed to Load Contact Points"
          description="Unable to retrieve contact points from Grafana. Please check the Grafana connection and try again."
          showIcon
          action={
            <Button 
              size="small"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card 
      title={
        <Space>
          <NotificationOutlined className="text-orange-600" />
          <span>Notification Channels</span>
        </Space>
      } 
      size="small" 
      className={className}
      extra={
        contactPoints.length > 0 && (
          <Text type="secondary" className="text-xs">
            {contactPoints.length} channels available
          </Text>
        )
      }
    >
      <Space direction="vertical" className="w-full">
        <div>
          <Text strong className="block mb-2">
            Select Notification Channels
            {selectedContactPoints.length > 0 && (
              <Text type="secondary" className="text-xs ml-2">
                ({selectedContactPoints.length} selected)
              </Text>
            )}
          </Text>
          
          <Select
            mode="multiple"
            value={selectedContactPoints}
            onChange={handleContactPointsChange}
            placeholder="Choose notification channels for alerts"
            className="w-full"
            size="large"
            optionFilterProp="children"
            showSearch
            maxTagCount={2}
            maxTagTextLength={20}
            filterOption={(input, option) =>
              (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent={
              contactPoints.length === 0 
                ? "No contact points configured in Grafana" 
                : "No matching contact points"
            }
          >
            {contactPoints.filter((contactPoint: GrafanaContactPoint) => contactPoint && contactPoint.uid).map((contactPoint: GrafanaContactPoint) => (
              <Option key={contactPoint.uid} value={contactPoint.uid}>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getContactPointIcon(contactPoint.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{contactPoint.name}</span>
                      <Tag color={getContactPointTypeColor(contactPoint.type)} className="text-xs">
                        {contactPoint.type.toUpperCase()}
                      </Tag>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {getContactPointDescription(contactPoint)}
                    </div>
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        {selectedContactPoints.length > 0 && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={
              <div>
                <Text strong>
                  {selectedContactPoints.length} Channel{selectedContactPoints.length !== 1 ? 's' : ''} Selected
                </Text>
                <Paragraph className="mb-0 mt-1 text-sm">
                  Alerts will be sent to: {selectedContactPoints.map(uid => {
                    const cp = contactPoints.find(c => c.uid === uid);
                    return cp?.name;
                  }).join(', ')}
                </Paragraph>
              </div>
            }
            className="bg-green-50 border-green-200"
          />
        )}

        {selectedContactPoints.length === 0 && contactPoints.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Text type="secondary" className="block text-center mb-3">
              Select notification channels where alerts will be sent
            </Text>
            
            <div className="grid grid-cols-1 gap-2">
              {contactPoints.filter((cp) => cp && cp.uid).slice(0, 3).map((contactPoint) => (
                <button
                  key={contactPoint.uid}
                  onClick={() => handleContactPointsChange([...selectedContactPoints, contactPoint.uid])}
                  className="text-left p-3 bg-white border border-gray-200 rounded hover:border-orange-400 hover:bg-orange-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getContactPointIcon(contactPoint.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{contactPoint.name}</span>
                        <Tag color={getContactPointTypeColor(contactPoint.type)} className="text-xs">
                          {contactPoint.type}
                        </Tag>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getContactPointDescription(contactPoint)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {contactPoints.length > 3 && (
              <div className="mt-2 text-center">
                <Text type="secondary" className="text-xs">
                  + {contactPoints.length - 3} more channels available
                </Text>
              </div>
            )}
          </div>
        )}

        {contactPoints.length === 0 && (
          <Alert
            type="warning"
            message="No Contact Points Found"
            description={
              <div>
                <Paragraph className="mb-2">
                  No notification channels are configured in Grafana.
                </Paragraph>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<PlusOutlined />}
                  onClick={() => window.open(process.env.NEXT_PUBLIC_GRAFANA_URL + '/alerting/notifications', '_blank')}
                >
                  Configure in Grafana
                </Button>
              </div>
            }
            showIcon
          />
        )}

        {/* Channel Type Summary */}
        {contactPoints.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <Text type="secondary" className="text-xs block mb-2">Channel Summary:</Text>
            <div className="flex flex-wrap gap-2">
              {['email', 'slack', 'webhook', 'sms'].map(type => {
                const count = contactPoints.filter(cp => 
                  cp.type.toLowerCase().includes(type)
                ).length;
                
                if (count === 0) return null;
                
                return (
                  <Tag key={type} color={getContactPointTypeColor(type)} className="text-xs">
                    {count} {type}
                  </Tag>
                );
              })}
            </div>
          </div>
        )}
      </Space>
    </Card>
  );
};

export default ContactPointSelector;