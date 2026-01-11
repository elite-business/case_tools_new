'use client';

import React, { useEffect } from 'react';
import { Select, Space, Typography, Card, Alert, Spin, Tag, Button } from 'antd';
import { 
  FolderOutlined, 
  FolderOpenOutlined,
  PlusOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { alertsApi } from '@/lib/api-client';
import { useAlertBuilderStore } from '@/store/alert-builder-store';
import { GrafanaFolder } from '@/lib/types';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface FolderSelectorProps {
  className?: string;
}

const FolderSelector: React.FC<FolderSelectorProps> = ({ className }) => {
  const {
    folders,
    selectedFolder,
    setFolders,
    setSelectedFolder,
    setError,
    clearError,
  } = useAlertBuilderStore();

  const {
    data: foldersData,
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['grafana-folders'],
    queryFn: () => alertsApi.getGrafanaFolders(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (foldersData?.data) {
      setFolders(foldersData.data);
    }
  }, [foldersData, setFolders]);

  useEffect(() => {
    if (isError && error) {
      setError('folder', 'Failed to load Grafana folders');
    } else {
      clearError('folder');
    }
  }, [isError, error, setError, clearError]);

  const handleFolderChange = (value: string | undefined) => {
    setSelectedFolder(value || null);
    clearError('folder');
  };

  const getFolderIcon = (title: string): React.ReactNode => {
    if (title.toLowerCase().includes('alert')) {
      return <FolderOpenOutlined className="text-red-500" />;
    }
    if (title.toLowerCase().includes('dashboard')) {
      return <FolderOutlined className="text-blue-500" />;
    }
    if (title.toLowerCase().includes('monitor')) {
      return <FolderOpenOutlined className="text-orange-500" />;
    }
    return <FolderOutlined className="text-gray-500" />;
  };

  const getFolderDescription = (folder: GrafanaFolder): string => {
    if (folder.title.toLowerCase().includes('alert')) {
      return 'Alerting rules and configurations';
    }
    if (folder.title.toLowerCase().includes('dashboard')) {
      return 'Monitoring dashboards and panels';
    }
    if (folder.title.toLowerCase().includes('monitor')) {
      return 'System monitoring and metrics';
    }
    if (folder.title.toLowerCase().includes('telecom') || folder.title.toLowerCase().includes('cdr')) {
      return 'Telecom and CDR monitoring';
    }
    if (folder.title.toLowerCase().includes('revenue')) {
      return 'Business assurance and billing';
    }
    return 'General folder for organizing alert rules';
  };

  if (isLoading) {
    return (
      <Card title="Organization Folder" size="small" className={className}>
        <div className="flex flex-col items-center justify-center p-4 space-y-2">
          <Spin />
          <Text type="secondary" className="text-sm">Loading Grafana folders...</Text>
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card title="Organization Folder" size="small" className={className}>
        <Alert
          type="error"
          message="Failed to Load Folders"
          description="Unable to retrieve folders from Grafana. Please check the Grafana connection and try again."
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
          <FolderOutlined className="text-blue-600" />
          <span>Organization Folder</span>
        </Space>
      } 
      size="small" 
      className={className}
      extra={
        folders.length > 0 && (
          <Text type="secondary" className="text-xs">
            {folders.length} folders available
          </Text>
        )
      }
    >
      <Space direction="vertical" className="w-full">
        <div>
          <Text strong className="block mb-2">
            Select Grafana Folder
            <Text type="secondary" className="text-xs ml-2 font-normal">
              (Optional - helps organize your alert rules)
            </Text>
          </Text>
          
          <Select
            value={selectedFolder}
            onChange={handleFolderChange}
            placeholder="Choose a folder to organize this alert rule"
            className="w-full"
            size="large"
            allowClear
            optionFilterProp="children"
            showSearch
            filterOption={(input, option) =>
              (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
            }
            notFoundContent={
              folders.length === 0 
                ? "No folders found in Grafana" 
                : "No matching folders"
            }
          >
            {folders.filter((folder: GrafanaFolder) => folder && folder.uid).map((folder: GrafanaFolder) => (
              <Option key={folder.uid} value={folder.uid}>
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getFolderIcon(folder.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{folder.title}</span>
                      <Tag color="blue" className="text-xs">
                        ID: {folder.id}
                      </Tag>
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {getFolderDescription(folder)}
                    </div>
                  </div>
                </div>
              </Option>
            ))}
          </Select>
        </div>

        {selectedFolder && (
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message={
              <div>
                <Text strong>
                  Selected: {folders.find(f => f.uid === selectedFolder)?.title}
                </Text>
                <Paragraph className="mb-0 mt-1 text-sm">
                  Your alert rule will be organized in this folder for better management.
                </Paragraph>
              </div>
            }
            className="bg-blue-50 border-blue-200"
          />
        )}

        {!selectedFolder && folders.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <Text type="secondary" className="block text-center mb-3">
              Select a folder to organize your alert rule (optional)
            </Text>
            
            <div className="grid grid-cols-1 gap-2">
              {folders.filter((f) => f && f.uid).slice(0, 4).map((folder) => (
                <button
                  key={folder.uid}
                  onClick={() => handleFolderChange(folder.uid)}
                  className="text-left p-3 bg-white border border-gray-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {getFolderIcon(folder.title)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm">{folder.title}</span>
                        <Tag color="blue" className="text-xs">
                          ID: {folder.id}
                        </Tag>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {getFolderDescription(folder)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {folders.length > 4 && (
              <div className="mt-2 text-center">
                <Text type="secondary" className="text-xs">
                  + {folders.length - 4} more folders available
                </Text>
              </div>
            )}
          </div>
        )}

        {folders.length === 0 && (
          <Alert
            type="warning"
            message="No Folders Found"
            description={
              <div>
                <Paragraph className="mb-2">
                  No folders are configured in Grafana. You can create folders to organize your alert rules.
                </Paragraph>
                <Button 
                  type="primary" 
                  size="small" 
                  icon={<PlusOutlined />}
                  onClick={() => window.open(process.env.NEXT_PUBLIC_GRAFANA_URL + '/dashboards', '_blank')}
                >
                  Create Folder in Grafana
                </Button>
              </div>
            }
            showIcon
          />
        )}

        {/* Folder Categories */}
        {folders.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <Text type="secondary" className="text-xs block mb-2">Folder Categories:</Text>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-600">Alert Folders:</span>
                <span className="font-medium ml-1">
                  {folders.filter(f => f.title.toLowerCase().includes('alert')).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Dashboard Folders:</span>
                <span className="font-medium ml-1">
                  {folders.filter(f => f.title.toLowerCase().includes('dashboard')).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Monitor Folders:</span>
                <span className="font-medium ml-1">
                  {folders.filter(f => f.title.toLowerCase().includes('monitor')).length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Other Folders:</span>
                <span className="font-medium ml-1">
                  {folders.filter(f => 
                    !f.title.toLowerCase().includes('alert') &&
                    !f.title.toLowerCase().includes('dashboard') &&
                    !f.title.toLowerCase().includes('monitor')
                  ).length}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
          <InfoCircleOutlined className="mr-1" />
          Organizing alert rules in folders helps with management and permissions in Grafana.
        </div>
      </Space>
    </Card>
  );
};

export default FolderSelector;
