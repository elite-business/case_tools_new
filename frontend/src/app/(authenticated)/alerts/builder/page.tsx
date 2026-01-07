'use client';

import React from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Result, Button } from 'antd';

export default function RuleBuilderPage() {
  // Alert Rule Builder is disabled - users must use Grafana directly
  return (
    <PageContainer>
      <Result
        status="info"
        title="Alert Rule Builder"
        subTitle="The built-in rule builder has been disabled. Please use Grafana directly to create and manage alert rules."
        extra={[
          <Button 
            key="grafana" 
            type="primary" 
            onClick={() => window.open(process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:9000', '_blank')}
          >
            Open Grafana
          </Button>,
          <Button key="back" onClick={() => window.history.back()}>
            Go Back
          </Button>,
        ]}
      />
    </PageContainer>
  );
}

/* DISABLED COMPONENT - Use Grafana directly for rule creation
import GrafanaRuleBuilder from '@/components/alerts/RuleBuilder/GrafanaRuleBuilder';

export default function RuleBuilderPage() {
  return <GrafanaRuleBuilder />;
}
*/