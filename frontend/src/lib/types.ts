// Common types for the application

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  department?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  id: number;
  caseNumber: string; // Backend uses caseNumber, not caseId
  title: string;
  description: string;
  status: CaseStatus;
  severity: CaseSeverity;
  priority: number; // Backend uses number for priority (1=Urgent, 2=High, 3=Medium, 4=Low)
  category: string;
  assignedUsers?: UserSummaryDto[]; // Backend returns this as array
  assignedTeams?: TeamSummaryDto[]; // Backend returns this as array
  assignedTo?: UserSummaryDto; // Keep for backwards compatibility
  assignedBy?: UserSummaryDto;
  createdBy?: UserSummaryDto; // User who created the case
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  slaDeadline?: string;
  slaBreached?: boolean;
  rootCause?: string;
  resolutionActions?: string;
  preventiveMeasures?: string;
  closureReason?: string;
  resolution?: string; // Case resolution description
  estimatedLoss?: number;
  actualLoss?: number;
  affectedServices?: string;
  affectedCustomers?: number;
  tags?: string[];
  customFields?: string;
  alertId?: number;
  grafanaAlertId?: string;
  grafanaAlertUid?: string;
  alertData?: string;
  resolutionTimeMinutes?: number;
}

export interface CaseComment {
  id: number;
  caseId?: number;
  comment: string; // Backend uses 'comment', not 'content'
  content?: string; // Keep for backwards compatibility
  commentType?: string;
  user: UserSummaryDto; // Backend returns user
  author?: User; // Keep for backwards compatibility
  isInternal: boolean;
  createdAt: string;
  updatedAt?: string;
  attachments?: string;
}

export interface CaseActivity {
  id: number;
  caseId?: number;
  activityType: string; // Backend uses string values like 'STATUS_CHANGED', 'COMMENT_ADDED'
  fieldName?: string;
  description: string;
  user: UserSummaryDto; // Backend returns user, not actor
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

export type CaseStatus = 
  | 'OPEN' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'PENDING_CUSTOMER' 
  | 'PENDING_VENDOR' 
  | 'RESOLVED' 
  | 'CLOSED' 
  | 'CANCELLED';

export type CaseSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CasePriority = 1 | 2 | 3 | 4; // 1=Urgent, 2=High, 3=Medium, 4=Low
export type CasePriorityLabel = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ActivityType = 
  | 'CREATED' 
  | 'ASSIGNED' 
  | 'STATUS_CHANGED' 
  | 'COMMENT_ADDED' 
  | 'PRIORITY_CHANGED' 
  | 'SEVERITY_CHANGED' 
  | 'UPDATED' 
  | 'CLOSED' 
  | 'REOPENED'
  | 'ESCALATED'
  | 'MERGED';

export interface CaseFilters {
  status?: CaseStatus[];
  severity?: CaseSeverity[];
  priority?: CasePriority[];
  assignedTo?: number[];
  createdBy?: number[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  category?: string;
  tags?: string[];
  dateRange?: [string, string];
  slaBreached?: boolean;
}

// Quick Actions Types
export interface QuickActionRequest {
  caseId: number;
  userId: number;
  action: 'ACKNOWLEDGE' | 'FALSE_POSITIVE' | 'ESCALATE' | 'MERGE';
  notes?: string;
  reason?: string;
  secondaryCaseIds?: number[]; // For merge action
}

export interface QuickActionResponse {
  success: boolean;
  action: string;
  caseId: number;
  caseNumber: string;
  message: string;
  performedBy: string;
  performedAt: string;
  additionalData?: any;
}

export interface MergeResult {
  primaryCase: Case;
  mergedCount: number;
  mergedCaseNumbers: string[];
  performedBy: string;
  performedAt: string;
}

export interface CaseStats {
  total: number;
  open: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
  averageResolutionTime: number;
  slaCompliance: number;
}

export interface CreateCaseRequest {
  title: string;
  description: string;
  severity: CaseSeverity;
  priority: CasePriority;
  category: string;
  tags: string[];
  assignedToUserId?: number;
}

export interface UpdateCaseRequest {
  title?: string;
  description?: string;
  severity?: CaseSeverity;
  priority?: CasePriority;
  status?: CaseStatus;
  category?: string;
  tags?: string[];
}

export interface AssignCaseRequest {
  userId: number;
  notes?: string;
}

export interface CloseCaseRequest {
  resolution: string;
  closingNotes?: string;
}

// API Response types
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

// Table column helpers
export interface TableColumn {
  title: string;
  dataIndex: string;
  key: string;
  width?: number;
  fixed?: 'left' | 'right';
  sorter?: boolean;
  filters?: { text: string; value: any }[];
  render?: (value: any, record: any) => React.ReactNode;
}

// Alert Management Types
export interface AlertRule {
  id: number;
  name: string;
  description?: string;
  type: AlertRuleType;
  severity: AlertSeverity;
  query: string;
  threshold?: number;
  evaluationInterval: string;
  evaluationFor?: string;
  active: boolean;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
  lastTriggered?: string;
  syncStatus?: 'SUCCESS' | 'FAILED' | 'PENDING';
  lastSync?: string;
  notificationChannels?: string[];
  alertMessage?: string;
  category?: string;
  datasource?: string;
  aggregation?: string;
  groupBy?: string;
  alertOperator?: 'above' | 'below' | 'outside' | 'within' | 'nodata';
}

export interface AlertHistory {
  id: number;
  fingerprint: string; // For deduplication
  grafanaRuleUid?: string; // For finding assignment (can be null)
  alertName: string; // Alert name for display
  ruleName?: string; // Alternative field name
  ruleId?: string;
  receivedAt?: string;
  triggeredAt?: string; // When alert was triggered
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: UserSummaryDto;
  status: AlertStatus; // Use AlertStatus instead of AlertHistoryStatus for display
  severity: AlertSeverity;
  message?: string;
  value?: number;
  threshold?: number;
  assignedTo?: UserSummaryDto;
  caseId?: number; // Link to case if created
  notes?: string;
  rawPayload?: string; // Store original for audit
  createdAt: string;
  updatedAt?: string;
}

export interface AlertCondition {
  field: string;
  operator: string;
  value: string | number;
  logic?: 'AND' | 'OR';
}

export type AlertRuleType = 
  | 'THRESHOLD' 
  | 'TREND' 
  | 'ANOMALY' 
  | 'AGGREGATION';

export type AlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type AlertStatus = 
  | 'OPEN' 
  | 'ACKNOWLEDGED' 
  | 'RESOLVED' 
  | 'CLOSED'
  | 'SUPPRESSED';

export type AlertHistoryStatus = 
  | 'RECEIVED'      // Alert received from Grafana
  | 'CASE_CREATED'  // Case was created from this alert
  | 'SUPPRESSED'    // Alert was suppressed (e.g., duplicate pattern)
  | 'DUPLICATE';    // Duplicate alert within time window

export interface CreateAlertRuleRequest {
  name: string;
  description?: string;
  type: AlertRuleType;
  severity: AlertSeverity;
  query: string;
  threshold?: number;
  evaluationInterval: string;
  evaluationFor?: string;
  notificationChannels?: string[];
  alertMessage?: string;
  category?: string;
  datasource?: string;
  aggregation?: string;
  groupBy?: string;
  alertOperator?: string;
}

export interface UpdateAlertRuleRequest {
  name?: string;
  description?: string;
  type?: AlertRuleType;
  severity?: AlertSeverity;
  query?: string;
  threshold?: number;
  evaluationInterval?: string;
  evaluationFor?: string;
  active?: boolean;
  notificationChannels?: string[];
  alertMessage?: string;
  category?: string;
  datasource?: string;
  aggregation?: string;
  groupBy?: string;
  alertOperator?: string;
}

export interface AlertFilters {
  severity?: AlertSeverity[];
  status?: AlertStatus[];
  ruleId?: number[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  assignedTo?: number[];
}

export interface TestQueryRequest {
  query: string;
  datasource?: string;
  limit?: number;
}

export interface TestQueryResponse {
  columns: string[];
  rows: any[][];
  executionTime: number;
  rowCount: number;
}

// Enhanced Alert Rule Builder Types
export interface DatabaseSchema {
  schema_name: string;
  description?: string;
  tables: string[];
}

export interface DatabaseTable {
  table_name: string;
  schema_name: string;
  columns: DatabaseColumn[];
  description?: string;
  rowCount?: number;
  lastUpdated?: string;
  size:string;
  comment:any
}

export interface DatabaseColumn {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: any;
  character_maximum_length: number | null;
  numeric_precision: number | null;
  numeric_scale: number | null;
  ordinal_position: number;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  referenced_table_name: string | null;
  referenced_column_name: string | null;
  comment: string | null;
  type_info: {
    is_date: boolean;
    is_numeric: boolean;
    is_text: boolean;
    category: string;
    supports_aggregation: boolean;
  };
}

export interface QuerySuggestion {
  title: string;
  description: string;
  query: string;
  category: 'revenue' | 'performance' | 'fraud' | 'quality' | 'usage';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface GrafanaContactPoint {
  name: string;
  type: string;
  uid: string;
  settings?: Record<string, any>;
}

export interface GrafanaFolder {
  id: number;
  uid: string;
  title: string;
  url: string;
}

export interface ValidateQueryRequest {
  query: string;
  schema?: string;
  table?: string;
}

export interface ValidateQueryResponse {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
  estimatedRows?: number;
  queryPlan?: any;
}

export interface AlertRuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  query: string;
  thresholdOperator: string;
  thresholdValue?: number;
  evaluationInterval: string;
  evaluationFor: string;
  severity: AlertSeverity;
  tags: string[];
}

// Team Management Types
export interface Team {
  id: number;
  name: string;
  description?: string;
  lead?: User;
  members: User[];
  department?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  performance?: TeamPerformance;
}

export interface TeamPerformance {
  totalCases: number;
  resolvedCases: number;
  avgResolutionTime: number;
  slaCompliance: number;
  activeAlerts: number;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  leadId?: number;
  memberIds: number[];
  department?: string;
  isActive: boolean;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  leadId?: number;
  department?: string;
  isActive?: boolean;
}

export interface TeamMemberRequest {
  userId: number;
  role?: 'MEMBER' | 'LEAD';
}

// System Settings Types
export interface SystemSettings {
  id: number;
  category: string;
  key: string;
  value: string;
  description?: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  updatedAt: string;
  updatedBy: User;
}

export interface SystemHealth {
  database: HealthStatus;
  redis?: HealthStatus;
  grafana?: HealthStatus;
  notifications: HealthStatus;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  lastCheck: string;
}

export interface HealthStatus {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  responseTime?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface EmailSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password?: string;
  useTls: boolean;
  fromAddress: string;
  fromName: string;
}

// Grafana Integration Types
export interface GrafanaSettings {
  enabled: boolean;
  url: string;
  username?: string;
  password?: string;
  apiKey?: string;
  orgId?: number;
  defaultDashboard?: string;
  syncEnabled: boolean;
  syncInterval: number;
  lastSync?: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
}

export interface GrafanaConnection {
  url: string;
  apiKey: string;
  orgId?: number;
}

export interface GrafanaDashboard {
  id: number;
  uid: string;
  title: string;
  tags: string[];
  folderId?: number;
  folderTitle?: string;
  url: string;
}

// Enhanced Grafana Alert Types
export interface GrafanaAlert {
  id: number;
  fingerprint: string;
  ruleName: string;
  ruleId: string;
  ruleUid: string;
  severity: AlertSeverity;
  status: 'firing' | 'resolved' | 'pending';
  state: string;
  summary: string;
  description: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  generatorURL: string;
  startsAt: string;
  endsAt?: string;
  updatedAt: string;
  value?: number;
  threshold?: number;
  datasource?: string;
  processed: boolean;
  processedAt?: string;
  assignedTo?: User;
  caseId?: number;
  acknowledgedBy?: User;
  acknowledgedAt?: string;
  resolvedBy?: User;
  resolvedAt?: string;
  organizationId?: number;
  folderId?: number;
  folderTitle?: string;
  dashboardUid?: string;
  panelId?: number;
}

// Notification Types
export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  data?: Record<string, any>;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export type NotificationType = 
  | 'ALERT_TRIGGERED' 
  | 'CASE_ASSIGNED' 
  | 'CASE_UPDATED' 
  | 'CASE_CLOSED' 
  | 'ALERT_RESOLVED' 
  | 'CASE_CREATED'
  | 'CASE_RESOLVED'
  | 'CASE_REOPENED'
  | 'TEAM_CASE_CREATED'
  | 'TEAM_UPDATE'
  | 'ALERT_FIRED'
  | 'SYSTEM_MAINTENANCE' 
  | 'RULE_FAILED'
  | 'CUSTOM';

export type NotificationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'FAILED';

// Report Types
export interface ReportRequest {
  type: ReportType;
  startDate: string;
  endDate: string;
  filters?: Record<string, any>;
  format?: ExportFormat;
  includeCharts?: boolean;
}

export interface ReportResponse {
  id: number;
  type: ReportType;
  title: string;
  description?: string;
  generatedAt: string;
  generatedBy: User;
  data: any;
  summary: ReportSummary;
  charts?: ChartData[];
  downloadUrl?: string;
}

export type ReportType = 
  | 'CASE_SUMMARY' 
  | 'TEAM_PERFORMANCE' 
  | 'ALERT_ANALYTICS' 
  | 'SLA_COMPLIANCE' 
  | 'TREND_ANALYSIS';

export type ExportFormat = 'PDF' | 'EXCEL' | 'CSV' | 'JSON';

export interface ReportSummary {
  totalRecords: number;
  timeRange: { start: string; end: string };
  keyMetrics: Record<string, number>;
  insights?: string[];
}

export interface ChartData {
  type: ChartType;
  title: string;
  data: any[];
  config?: Record<string, any>;
}

export type ChartType = 
  | 'line' 
  | 'bar' 
  | 'pie' 
  | 'area' 
  | 'scatter' 
  | 'heatmap' 
  | 'gauge';

// Analytics Types
export interface AnalyticsOverview {
  totalCases: number;
  openCases: number;
  resolvedCases: number;
  avgResolutionTime: number;
  totalAlerts: number;
  firingAlerts: number;
  criticalAlerts: number;
  slaCompliance: number;
  teamPerformance: TeamPerformanceMetric[];
  recentTrends: TrendData[];
}

export interface TeamPerformanceMetric {
  teamName: string;
  totalCases: number;
  resolvedCases: number;
  avgResolutionTime: number;
  slaCompliance: number;
}

export interface TrendData {
  date: string;
  value: number;
  metric: string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'stable';
}

// Enhanced Filter Types
export interface AlertFiltersEnhanced extends AlertFilters {
  ruleNames?: string[];
  datasources?: string[];
  labels?: Record<string, string[]>;
  processed?: boolean;
  hasCase?: boolean;
  timeRange?: TimeRange;
  sortBy?: AlertSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface TimeRange {
  start: string;
  end: string;
  quick?: QuickTimeRange;
}

export type QuickTimeRange = 
  | 'last_hour' 
  | 'last_24h' 
  | 'last_7d' 
  | 'last_30d' 
  | 'last_90d' 
  | 'custom';

export type AlertSortField = 
  | 'startsAt' 
  | 'severity' 
  | 'status' 
  | 'ruleName' 
  | 'updatedAt';

// Notification Preferences
export interface NotificationPreferences {
  id: number;
  userId: number;
  enableEmail: boolean;
  enableInApp: boolean;
  enableDesktop: boolean;
  alertSeverityThreshold: AlertSeverity;
  notificationTypes: NotificationType[];
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone: string;
  updatedAt: string;
}

// Scheduled Report Types
export interface ScheduledReport {
  id: number;
  name: string;
  description?: string;
  reportType: ReportType;
  schedule: ReportSchedule;
  recipients: string[];
  filters?: Record<string, any>;
  format: ExportFormat;
  active: boolean;
  lastRun?: string;
  nextRun?: string;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSchedule {
  frequency: ScheduleFrequency;
  dayOfWeek?: number; // 0-6, 0 = Sunday
  dayOfMonth?: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string;
}

export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

// Rule Assignment Types
export interface RuleAssignment {
  id: number;
  grafanaRuleUid: string;
  grafanaRuleName: string;
  grafanaFolderUid?: string;
  grafanaFolderName?: string;
  datasourceUid?: string;
  description?: string;
  severity: RuleAssignmentSeverity;
  category: RuleAssignmentCategory;
  active: boolean;
  autoAssignEnabled: boolean;
  assignmentStrategy: AssignmentStrategy;
  caseTemplate?: string; // JSON with title template, description, initial actions
  escalationAfterMinutes?: number; // Auto-escalate if not acknowledged (default: 30)
  escalationTeamId?: number; // Team to escalate to
  assignedUsers: UserSummary[];
  assignedTeams: TeamSummary[];
  assignedUserCount: number;
  assignedTeamCount: number;
  totalAssignedUsers: number;
  caseCount?: number;
  openCaseCount?: number;
  lastAlertAt?: string;
  createdBy?: UserSummary;
  updatedBy?: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export type RuleAssignmentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RuleAssignmentCategory = 
  | 'REVENUE_LOSS' 
  | 'NETWORK_ISSUE' 
  | 'QUALITY_ISSUE' 
  | 'FRAUD_ALERT' 
  | 'OPERATIONAL' 
  | 'CUSTOM';

export type AssignmentStrategy = 
  | 'MANUAL' 
  | 'ROUND_ROBIN' 
  | 'LOAD_BASED' 
  | 'TEAM_BASED';

export interface CreateRuleAssignmentRequest {
  grafanaRuleName: string;
  grafanaFolderUid?: string;
  grafanaFolderName?: string;
  datasourceUid?: string;
  description?: string;
  severity: RuleAssignmentSeverity;
  category: RuleAssignmentCategory;
  active?: boolean;
  autoAssignEnabled?: boolean;
  assignmentStrategy?: AssignmentStrategy;
  userIds?: number[];
  teamIds?: number[];
}

export interface AssignRuleRequest {
  userIds?: number[];
  teamIds?: number[];
  assignmentStrategy?: AssignmentStrategy;
  autoAssignEnabled?: boolean;
}

export interface UserSummary {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  department?: string;
}

// DTO from backend for case assignments
export interface UserSummaryDto {
  id: number;
  username: string;
  email: string;
  name: string;
  fullName?: string; // For compatibility
}

export interface TeamSummaryDto {
  id: number;
  name: string;
  description?: string;
  memberCount?: number;
  lead?: UserSummaryDto;
}

export interface TeamSummary {
  id: number;
  name: string;
  memberCount: number;
  lead?: UserSummary;
}
