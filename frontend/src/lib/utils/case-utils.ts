import { CasePriority, CasePriorityLabel, CaseStatus, CaseSeverity } from '@/lib/types';

/**
 * Convert priority number to label
 */
export function getPriorityLabel(priority: CasePriority): CasePriorityLabel {
  switch (priority) {
    case 1:
      return 'URGENT';
    case 2:
      return 'HIGH';
    case 3:
      return 'MEDIUM';
    case 4:
      return 'LOW';
    default:
      return 'MEDIUM';
  }
}

/**
 * Convert priority label to number
 */
export function getPriorityValue(label: CasePriorityLabel): CasePriority {
  switch (label) {
    case 'URGENT':
      return 1;
    case 'HIGH':
      return 2;
    case 'MEDIUM':
      return 3;
    case 'LOW':
      return 4;
    default:
      return 3;
  }
}

/**
 * Get priority color
 */
export function getPriorityColor(priority: CasePriority): string {
  switch (priority) {
    case 1: // URGENT
      return '#ff4d4f';
    case 2: // HIGH
      return '#ffa940';
    case 3: // MEDIUM
      return '#fadb14';
    case 4: // LOW
      return '#52c41a';
    default:
      return '#d9d9d9';
  }
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: CaseSeverity): string {
  switch (severity) {
    case 'CRITICAL':
      return '#ff4d4f';
    case 'HIGH':
      return '#ffa940';
    case 'MEDIUM':
      return '#fadb14';
    case 'LOW':
      return '#52c41a';
    default:
      return '#d9d9d9';
  }
}

/**
 * Get status color
 */
export function getStatusColor(status: CaseStatus): string {
  switch (status) {
    case 'OPEN':
      return '#ffa940';
    case 'ASSIGNED':
      return '#1677ff';
    case 'IN_PROGRESS':
      return '#13c2c2';
    case 'PENDING_CUSTOMER':
    case 'PENDING_VENDOR':
      return '#fadb14';
    case 'RESOLVED':
      return '#52c41a';
    case 'CLOSED':
      return '#595959';
    case 'CANCELLED':
      return '#ff4d4f';
    default:
      return '#d9d9d9';
  }
}

/**
 * Check if case is active
 */
export function isCaseActive(status: CaseStatus): boolean {
  return !['CLOSED', 'CANCELLED', 'RESOLVED'].includes(status);
}

/**
 * Check if case is editable
 */
export function isCaseEditable(status: CaseStatus): boolean {
  return !['CLOSED', 'CANCELLED'].includes(status);
}

/**
 * Calculate SLA status
 */
export function getSlaStatus(slaDeadline?: string, slaBreached?: boolean): {
  status: 'on-track' | 'at-risk' | 'breached';
  color: string;
  label: string;
} {
  if (slaBreached) {
    return { status: 'breached', color: '#ff4d4f', label: 'SLA Breached' };
  }

  if (!slaDeadline) {
    return { status: 'on-track', color: '#52c41a', label: 'No SLA' };
  }

  const now = new Date();
  const deadline = new Date(slaDeadline);
  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDeadline < 0) {
    return { status: 'breached', color: '#ff4d4f', label: 'SLA Breached' };
  } else if (hoursUntilDeadline < 4) {
    return { status: 'at-risk', color: '#ffa940', label: 'SLA At Risk' };
  } else {
    return { status: 'on-track', color: '#52c41a', label: 'SLA On Track' };
  }
}

/**
 * Format resolution time
 */
export function formatResolutionTime(minutes?: number): string {
  if (!minutes) return 'N/A';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else {
    return `${mins}m`;
  }
}

/**
 * Get case category label
 */
export function getCategoryLabel(category: string): string {
  const categoryMap: Record<string, string> = {
    'REVENUE_LOSS': 'Revenue Loss',
    'NETWORK_ISSUE': 'Network Issue',
    'QUALITY': 'Quality Issue',
    'FRAUD': 'Fraud Alert',
    'PERFORMANCE': 'Performance',
    'CUSTOM': 'Custom',
    'OTHER': 'Other'
  };
  return categoryMap[category] || category;
}