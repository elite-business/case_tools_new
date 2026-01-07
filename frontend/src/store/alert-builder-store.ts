import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { DatabaseSchema, DatabaseTable, DatabaseColumn, QuerySuggestion, GrafanaContactPoint, GrafanaFolder, AlertCondition, ValidateQueryResponse } from '@/lib/types';

interface AlertBuilderState {
  // Schema/Table/Column Data
  schemas: DatabaseSchema[];
  selectedSchema: string | null;
  tables: DatabaseTable[];
  selectedTable: string | null;
  columns: DatabaseColumn[];
  selectedColumns: string[];

  // Query Building
  queryMode: 'visual' | 'sql' | 'template';
  sqlQuery: string;
  visualConditions: AlertCondition[];
  aggregationFunction: string | null;
  groupByFields: string[];
  orderByFields: string[];
  limitRows: number | null;

  // Query Validation & Testing
  queryValidation: ValidateQueryResponse | null;
  isValidatingQuery: boolean;
  testResults: any[];
  isTestingQuery: boolean;
  testError: string | null;

  // Suggestions & Templates
  suggestions: QuerySuggestion[];
  selectedTemplate: string | null;

  // Grafana Integration
  contactPoints: GrafanaContactPoint[];
  folders: GrafanaFolder[];
  selectedContactPoints: string[];
  selectedFolder: string | null;

  // Alert Configuration
  alertName: string;
  alertDescription: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  category: string;
  evaluationInterval: string;
  evaluationFor: string;
  thresholdOperator: 'above' | 'below' | 'outside' | 'within' | 'nodata';
  thresholdValue: number | null;
  thresholdUpperValue: number | null; // For range operators
  noDataTimeframe: string;
  alertMessage: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;

  // UI State
  currentStep: number;
  isLoading: boolean;
  errors: Record<string, string>;

  // Actions
  setSchemas: (schemas: DatabaseSchema[]) => void;
  setSelectedSchema: (schema: string | null) => void;
  setTables: (tables: DatabaseTable[]) => void;
  setSelectedTable: (table: string | null) => void;
  setColumns: (columns: DatabaseColumn[]) => void;
  setSelectedColumns: (columns: string[]) => void;
  setQueryMode: (mode: 'visual' | 'sql' | 'template') => void;
  setSqlQuery: (query: string) => void;
  setVisualConditions: (conditions: AlertCondition[]) => void;
  addVisualCondition: () => void;
  removeVisualCondition: (index: number) => void;
  updateVisualCondition: (index: number, condition: Partial<AlertCondition>) => void;
  setAggregationFunction: (func: string | null) => void;
  setGroupByFields: (fields: string[]) => void;
  setOrderByFields: (fields: string[]) => void;
  setLimitRows: (limit: number | null) => void;
  setQueryValidation: (validation: ValidateQueryResponse | null) => void;
  setIsValidatingQuery: (isValidating: boolean) => void;
  setTestResults: (results: any[]) => void;
  setIsTestingQuery: (isTesting: boolean) => void;
  setTestError: (error: string | null) => void;
  setSuggestions: (suggestions: QuerySuggestion[]) => void;
  setSelectedTemplate: (templateId: string | null) => void;
  setContactPoints: (contactPoints: GrafanaContactPoint[]) => void;
  setFolders: (folders: GrafanaFolder[]) => void;
  setSelectedContactPoints: (contactPoints: string[]) => void;
  setSelectedFolder: (folder: string | null) => void;
  setAlertName: (name: string) => void;
  setAlertDescription: (description: string) => void;
  setSeverity: (severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => void;
  setCategory: (category: string) => void;
  setEvaluationInterval: (interval: string) => void;
  setEvaluationFor: (duration: string) => void;
  setThresholdOperator: (operator: 'above' | 'below' | 'outside' | 'within' | 'nodata') => void;
  setThresholdValue: (value: number | null) => void;
  setThresholdUpperValue: (value: number | null) => void;
  setNoDataTimeframe: (timeframe: string) => void;
  setAlertMessage: (message: string) => void;
  setLabels: (labels: Record<string, string>) => void;
  setAnnotations: (annotations: Record<string, string>) => void;
  setCurrentStep: (step: number) => void;
  setIsLoading: (isLoading: boolean) => void;
  setErrors: (errors: Record<string, string>) => void;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
  reset: () => void;
  generateSqlFromVisual: () => string;
  getCurrentQuery: () => string;
  validateCurrentQuery: () => boolean;
}

const initialState = {
  schemas: [],
  selectedSchema: null,
  tables: [],
  selectedTable: null,
  columns: [],
  selectedColumns: [],
  queryMode: 'visual' as const,
  sqlQuery: '',
  visualConditions: [{ field: '', operator: '=', value: '', logic: 'AND' }] as AlertCondition[],
  aggregationFunction: null,
  groupByFields: [],
  orderByFields: [],
  limitRows: null,
  queryValidation: null,
  isValidatingQuery: false,
  testResults: [],
  isTestingQuery: false,
  testError: null,
  suggestions: [],
  selectedTemplate: null,
  contactPoints: [],
  folders: [],
  selectedContactPoints: [],
  selectedFolder: null,
  alertName: '',
  alertDescription: '',
  severity: 'MEDIUM' as const,
  category: '',
  evaluationInterval: '1m',
  evaluationFor: '5m',
  thresholdOperator: 'above' as const,
  thresholdValue: null,
  thresholdUpperValue: null,
  noDataTimeframe: '5m',
  alertMessage: '',
  labels: {},
  annotations: {},
  currentStep: 0,
  isLoading: false,
  errors: {},
};

export const useAlertBuilderStore = create<AlertBuilderState>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setSchemas: (schemas) => set({ schemas }),
    setSelectedSchema: (schema) => {
      set({ 
        selectedSchema: schema, 
        selectedTable: null, 
        tables: [], 
        columns: [], 
        selectedColumns: [],
        visualConditions: [{ field: '', operator: '=', value: '', logic: 'AND' }],
        suggestions: []
      });
    },
    setTables: (tables) => set({ tables }),
    setSelectedTable: (table) => {
      set({ 
        selectedTable: table, 
        columns: [], 
        selectedColumns: [],
        visualConditions: [{ field: '', operator: '=', value: '', logic: 'AND' }]
      });
    },
    setColumns: (columns) => set({ columns }),
    setSelectedColumns: (columns) => set({ selectedColumns: columns }),
    setQueryMode: (mode) => set({ queryMode: mode }),
    setSqlQuery: (query) => set({ sqlQuery: query }),
    setVisualConditions: (conditions) => set({ visualConditions: conditions }),
    
    addVisualCondition: () => {
      const { visualConditions } = get();
      set({
        visualConditions: [...visualConditions, { field: '', operator: '=', value: '', logic: 'AND' }]
      });
    },

    removeVisualCondition: (index) => {
      const { visualConditions } = get();
      if (visualConditions.length > 1) {
        set({
          visualConditions: visualConditions.filter((_, i) => i !== index)
        });
      }
    },

    updateVisualCondition: (index, condition) => {
      const { visualConditions } = get();
      const updatedConditions = [...visualConditions];
      updatedConditions[index] = { ...updatedConditions[index], ...condition };
      set({ visualConditions: updatedConditions });
    },

    setAggregationFunction: (func) => set({ aggregationFunction: func }),
    setGroupByFields: (fields) => set({ groupByFields: fields }),
    setOrderByFields: (fields) => set({ orderByFields: fields }),
    setLimitRows: (limit) => set({ limitRows: limit }),
    setQueryValidation: (validation) => set({ queryValidation: validation }),
    setIsValidatingQuery: (isValidating) => set({ isValidatingQuery: isValidating }),
    setTestResults: (results) => set({ testResults: results }),
    setIsTestingQuery: (isTesting) => set({ isTestingQuery: isTesting }),
    setTestError: (error) => set({ testError: error }),
    setSuggestions: (suggestions) => set({ suggestions }),
    setSelectedTemplate: (templateId) => set({ selectedTemplate: templateId }),
    setContactPoints: (contactPoints) => set({ contactPoints }),
    setFolders: (folders) => set({ folders }),
    setSelectedContactPoints: (contactPoints) => set({ selectedContactPoints: contactPoints }),
    setSelectedFolder: (folder) => set({ selectedFolder: folder }),
    setAlertName: (name) => set({ alertName: name }),
    setAlertDescription: (description) => set({ alertDescription: description }),
    setSeverity: (severity) => set({ severity }),
    setCategory: (category) => set({ category }),
    setEvaluationInterval: (interval) => set({ evaluationInterval: interval }),
    setEvaluationFor: (duration) => set({ evaluationFor: duration }),
    setThresholdOperator: (operator) => set({ thresholdOperator: operator }),
    setThresholdValue: (value) => set({ thresholdValue: value }),
    setThresholdUpperValue: (value) => set({ thresholdUpperValue: value }),
    setNoDataTimeframe: (timeframe) => set({ noDataTimeframe: timeframe }),
    setAlertMessage: (message) => set({ alertMessage: message }),
    setLabels: (labels) => set({ labels }),
    setAnnotations: (annotations) => set({ annotations }),
    setCurrentStep: (step) => set({ currentStep: step }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setErrors: (errors) => set({ errors }),
    
    setError: (field, error) => {
      const { errors } = get();
      set({ errors: { ...errors, [field]: error } });
    },

    clearError: (field) => {
      const { errors } = get();
      const newErrors = { ...errors };
      delete newErrors[field];
      set({ errors: newErrors });
    },

    clearAllErrors: () => set({ errors: {} }),

    reset: () => set(initialState),

    generateSqlFromVisual: () => {
      const { 
        selectedSchema, 
        selectedTable, 
        selectedColumns, 
        visualConditions, 
        aggregationFunction,
        groupByFields,
        orderByFields,
        limitRows
      } = get();

      if (!selectedSchema || !selectedTable) {
        return '';
      }

      const columns = selectedColumns.length > 0 
        ? selectedColumns.join(', ')
        : '*';

      let query = `SELECT `;
      
      if (aggregationFunction) {
        query += `${aggregationFunction}(${columns})`;
        if (groupByFields.length > 0) {
          query += `, ${groupByFields.join(', ')}`;
        }
      } else {
        query += columns;
      }

      query += ` FROM ${selectedSchema}.${selectedTable}`;

      const whereConditions = visualConditions
        .filter(c => c.field && c.operator && c.value !== '')
        .map((c, i) => {
          const condition = `${c.field} ${c.operator} '${c.value}'`;
          return i === 0 ? condition : `${c.logic} ${condition}`;
        })
        .join(' ');

      if (whereConditions) {
        query += ` WHERE ${whereConditions}`;
      }

      if (groupByFields.length > 0) {
        query += ` GROUP BY ${groupByFields.join(', ')}`;
      }

      if (orderByFields.length > 0) {
        query += ` ORDER BY ${orderByFields.join(', ')}`;
      }

      if (limitRows) {
        query += ` LIMIT ${limitRows}`;
      }

      return query;
    },

    getCurrentQuery: () => {
      const { queryMode, sqlQuery, generateSqlFromVisual } = get();
      return queryMode === 'sql' ? sqlQuery : generateSqlFromVisual();
    },

    validateCurrentQuery: () => {
      const { alertName, getCurrentQuery, selectedContactPoints } = get();
      const query = getCurrentQuery();
      
      return Boolean(
        alertName.trim() &&
        query.trim() &&
        selectedContactPoints.length > 0
      );
    },
  }))
);