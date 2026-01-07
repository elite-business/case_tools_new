import { useEffect } from 'react';
import { message, notification } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import wsService from '@/lib/websocket-stomp';
import { useAuthStore } from '@/store/auth-store';
import { BellOutlined, UserAddOutlined, TeamOutlined } from '@ant-design/icons';

interface RuleAssignmentNotification {
  type: 'RULE_ASSIGNED' | 'RULE_UNASSIGNED' | 'ALERT_FROM_RULE' | 'CASE_CREATED';
  ruleId: string;
  ruleName: string;
  message: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  data?: any;
}

export function useRuleAssignmentNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to rule assignment notifications
    const unsubscribeRuleAssignments = wsService.subscribe(
      `rule-assignments.${user.id}`,
      (notification: any) => {
        handleRuleAssignmentNotification(notification);
      }
    );

    // Subscribe to alert notifications from assigned rules
    const unsubscribeAlerts = wsService.subscribe(
      `alerts.user.${user.id}`,
      (notification: any) => {
        handleAlertNotification(notification);
      }
    );

    // Subscribe to case notifications
    const unsubscribeCases = wsService.subscribe(
      `cases.user.${user.id}`,
      (notification: any) => {
        handleCaseNotification(notification);
      }
    );

    return () => {
      unsubscribeRuleAssignments();
      unsubscribeAlerts();
      unsubscribeCases();
    };
  }, [user?.id, queryClient]);

  const handleRuleAssignmentNotification = (notif: RuleAssignmentNotification) => {
    switch (notif.type) {
      case 'RULE_ASSIGNED':
        notification.info({
          message: 'New Rule Assignment',
          description: `You have been assigned to rule: ${notif.ruleName}`,
          icon: <UserAddOutlined style={{ color: '#1890ff' }} />,
          duration: 5,
        });
        // Refresh rule assignments
        queryClient.invalidateQueries({ queryKey: ['user-rule-assignments'] });
        break;

      case 'RULE_UNASSIGNED':
        notification.warning({
          message: 'Rule Unassigned',
          description: `You have been removed from rule: ${notif.ruleName}`,
          icon: <UserAddOutlined style={{ color: '#fa8c16' }} />,
          duration: 5,
        });
        // Refresh rule assignments
        queryClient.invalidateQueries({ queryKey: ['user-rule-assignments'] });
        break;

      default:
        break;
    }
  };

  const handleAlertNotification = (notif: any) => {
    const severityColors : any = {
      CRITICAL: '#ff4d4f',
      HIGH: '#fa8c16',
      MEDIUM: '#1890ff',
      LOW: '#52c41a',
    };

    notification.open({
      message: 'New Alert',
      description: (
        <div>
          <div>{notif.message || 'A new alert has been triggered'}</div>
          {notif.ruleName && (
            <div style={{ marginTop: 4, fontSize: 12, color: '#666' }}>
              Rule: {notif.ruleName}
            </div>
          )}
        </div>
      ),
      icon: <BellOutlined style={{ color: severityColors[notif.severity] || '#1890ff' }} />,
      duration: 6,
      onClick: () => {
        // Navigate to alerts page
        window.location.href = '/alerts';
      },
    });

    // Refresh alerts
    queryClient.invalidateQueries({ queryKey: ['grafana-alerts'] });
    queryClient.invalidateQueries({ queryKey: ['alert-history'] });
  };

  const handleCaseNotification = (notif: any) => {
    switch (notif.type) {
      case 'CASE_ASSIGNED':
        notification.success({
          message: 'Case Assigned',
          description: `Case ${notif.caseNumber} has been assigned to you`,
          icon: <TeamOutlined style={{ color: '#52c41a' }} />,
          duration: 5,
          onClick: () => {
            if (notif.caseId) {
              window.location.href = `/cases/${notif.caseId}`;
            }
          },
        });
        break;

      case 'CASE_CREATED':
        message.info(`Case ${notif.caseNumber} created from alert`);
        break;

      case 'CASE_UPDATED':
        if (notif.assignedTo === user?.id) {
          message.info(`Case ${notif.caseNumber} has been updated`);
        }
        break;

      default:
        break;
    }

    // Refresh cases
    queryClient.invalidateQueries({ queryKey: ['cases'] });
  };
}

// Hook to send notifications
export function useNotifyAssignment() {
  const sendRuleAssignment = (userId: number, ruleName: string, assigned: boolean) => {
    wsService.send(`/app/notify/rule-assignment/${userId}`, {
      type: assigned ? 'RULE_ASSIGNED' : 'RULE_UNASSIGNED',
      ruleName,
      message: assigned 
        ? `You have been assigned to rule: ${ruleName}`
        : `You have been removed from rule: ${ruleName}`,
    });
  };

  const sendAlertNotification = (userId: number, alert: any) => {
    wsService.send(`/app/notify/alert/${userId}`, {
      type: 'ALERT_FROM_RULE',
      severity: alert.severity,
      ruleName: alert.ruleName,
      message: alert.summary || alert.title,
      data: alert,
    });
  };

  const sendCaseNotification = (userId: number, caseData: any, type: string) => {
    wsService.send(`/app/notify/case/${userId}`, {
      type,
      caseId: caseData.id,
      caseNumber: caseData.caseNumber,
      message: `Case ${caseData.caseNumber} ${type.toLowerCase().replace('_', ' ')}`,
      data: caseData,
    });
  };

  return {
    sendRuleAssignment,
    sendAlertNotification,
    sendCaseNotification,
  };
}