'use client';

import { Modal, Button, Space, Tooltip, message } from 'antd';
import { CopyOutlined, DatabaseOutlined, ExpandOutlined } from '@ant-design/icons';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SqlQueryModalProps {
  visible: boolean;
  query: string;
  title?: string;
  datasource?: string;
  onClose: () => void;
}

export default function SqlQueryModal({ 
  visible, 
  query, 
  title = 'SQL Query',
  datasource,
  onClose 
}: SqlQueryModalProps) {

  const handleCopy = () => {
    navigator.clipboard.writeText(query);
    message.success('Query copied to clipboard');
  };

  const formatSQL = (sql: string): string => {
    // Basic SQL formatting
    return sql
      .replace(/\bSELECT\b/gi, '\nSELECT')
      .replace(/\bFROM\b/gi, '\nFROM')
      .replace(/\bWHERE\b/gi, '\nWHERE')
      .replace(/\bGROUP BY\b/gi, '\nGROUP BY')
      .replace(/\bORDER BY\b/gi, '\nORDER BY')
      .replace(/\bLIMIT\b/gi, '\nLIMIT')
      .replace(/\bJOIN\b/gi, '\nJOIN')
      .replace(/\bLEFT JOIN\b/gi, '\nLEFT JOIN')
      .replace(/\bRIGHT JOIN\b/gi, '\nRIGHT JOIN')
      .replace(/\bINNER JOIN\b/gi, '\nINNER JOIN')
      .replace(/\bAND\b/gi, '\n  AND')
      .replace(/\bOR\b/gi, '\n  OR')
      .replace(/,/g, ',\n      ')
      .trim();
  };

  return (
    <Modal
      title={
        <Space>
          <DatabaseOutlined />
          <span>{title}</span>
          {datasource && (
            <Tooltip title="Datasource">
              <span className="text-sm text-gray-500">({datasource})</span>
            </Tooltip>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width="80%"
      style={{ maxWidth: '900px' }}
      footer={[
        <Button key="copy" icon={<CopyOutlined />} onClick={handleCopy}>
          Copy Query
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <div style={{ maxHeight: '500px', overflow: 'auto' }}>
        <SyntaxHighlighter
          language="sql"
          style={vscDarkPlus}
          showLineNumbers={true}
          wrapLines={true}
          wrapLongLines={true}
          customStyle={{
            fontSize: '14px',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          {formatSQL(query)}
        </SyntaxHighlighter>
      </div>
      
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <div className="text-xs text-gray-600">
          <strong>Query Info:</strong>
          <ul className="mt-2 space-y-1">
            <li>• Characters: {query.length}</li>
            <li>• Lines: {query.split('\n').length}</li>
            {datasource && <li>• Datasource: {datasource}</li>}
          </ul>
        </div>
      </div>
    </Modal>
  );
}