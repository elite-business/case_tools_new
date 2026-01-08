# RBAC System Usage Guide

## Overview
The Role-Based Access Control (RBAC) system provides centralized permission management with backend reflection. All frontend permissions mirror the backend Spring Security `@PreAuthorize` annotations.

## Roles and Permissions

### User Roles
- **ADMIN**: Full system access
- **MANAGER**: Team and case management, alert handling
- **ANALYST**: View cases and alerts, limited actions
- **VIEWER**: Read-only access

### Permission Structure
```typescript
enum Permission {
  // Cases
  VIEW_CASES, CREATE_CASES, EDIT_CASES, DELETE_CASES, ASSIGN_CASES, CLOSE_CASES,
  
  // Alerts
  VIEW_ALERTS, ACKNOWLEDGE_ALERTS, RESOLVE_ALERTS, ASSIGN_ALERTS, EXPORT_ALERTS,
  
  // Rules
  VIEW_RULES, CREATE_RULES, EDIT_RULES, DELETE_RULES, TEST_RULES,
  
  // Users & Teams
  VIEW_USERS, CREATE_USERS, EDIT_USERS, DELETE_USERS,
  VIEW_TEAMS, CREATE_TEAMS, EDIT_TEAMS, DELETE_TEAMS, MANAGE_TEAM_MEMBERS,
  
  // System
  VIEW_SETTINGS, EDIT_SETTINGS, VIEW_ANALYTICS, EXPORT_DATA,
  VIEW_GRAFANA, MANAGE_GRAFANA
}
```

## Usage Examples

### 1. Using RoleGuard Component
```tsx
import { RoleGuard, AdminOnly, ManagerOnly } from '@/components/auth/RoleGuard';
import { Permission } from '@/lib/rbac';

// Show component only for specific roles
<AdminOnly>
  <Button>Admin Only Button</Button>
</AdminOnly>

// Show component based on permissions
<RoleGuard permissions={Permission.CREATE_CASES}>
  <Button onClick={createCase}>Create Case</Button>
</RoleGuard>

// Multiple permissions (ANY)
<RoleGuard permissions={[Permission.EDIT_CASES, Permission.CLOSE_CASES]}>
  <Button>Edit or Close</Button>
</RoleGuard>

// Multiple permissions (ALL required)
<RoleGuard 
  permissions={[Permission.VIEW_CASES, Permission.EXPORT_DATA]} 
  requireAll={true}
>
  <Button>Export Cases</Button>
</RoleGuard>
```

### 2. Using useRolePermissions Hook
```tsx
import { useRolePermissions } from '@/components/auth/RoleGuard';
import { Permission } from '@/lib/rbac';

function MyComponent() {
  const { hasPermission, isAdmin, isManager } = useRolePermissions();

  const permissions = {
    canCreate: hasPermission(Permission.CREATE_CASES),
    canEdit: hasPermission(Permission.EDIT_CASES),
    canDelete: hasPermission(Permission.DELETE_CASES),
  };

  return (
    <div>
      {permissions.canCreate && <Button>Create</Button>}
      {permissions.canEdit && <Button>Edit</Button>}
      {permissions.canDelete && <Button>Delete</Button>}
      {isAdmin() && <Button>Admin Action</Button>}
    </div>
  );
}
```

### 3. Table Actions with Permissions
```tsx
const columns = [
  {
    title: 'Actions',
    render: (_, record) => {
      const { hasPermission } = useRolePermissions();
      const actions = [];

      // Always show view
      actions.push({
        label: 'View',
        onClick: () => viewRecord(record),
      });

      // Conditionally add actions
      if (hasPermission(Permission.EDIT_CASES)) {
        actions.push({
          label: 'Edit',
          onClick: () => editRecord(record),
        });
      }

      if (hasPermission(Permission.DELETE_CASES)) {
        actions.push({
          label: 'Delete',
          onClick: () => deleteRecord(record),
        });
      }

      return <ActionDropdown items={actions} />;
    },
  },
];
```

### 4. Permission-Aware API Calls
```tsx
import { usePermissionAwareAPI } from '@/lib/permission-aware-api';

function CasesPage() {
  const api = usePermissionAwareAPI();

  // API calls automatically check permissions
  const createCase = async (data) => {
    try {
      // Will throw error if user lacks CREATE_CASES permission
      await api.cases.create(data);
      message.success('Case created');
    } catch (error) {
      // Error message already shown by permission-aware API
    }
  };

  const assignCase = async (caseId, userId) => {
    try {
      // Will throw error if user lacks ASSIGN_CASES permission
      await api.cases.assign(caseId, userId);
      message.success('Case assigned');
    } catch (error) {
      // Error handled automatically
    }
  };
}
```

### 5. Page-Level Access Control
```tsx
export default function AdminUsersPage() {
  const { hasPermission } = useRolePermissions();
  const router = useRouter();

  // Check permission and redirect if needed
  const permissions = {
    view: hasPermission(Permission.VIEW_USERS),
    create: hasPermission(Permission.CREATE_USERS),
    edit: hasPermission(Permission.EDIT_USERS),
    delete: hasPermission(Permission.DELETE_USERS),
  };

  if (!permissions.view) {
    router.push('/unauthorized');
    return null;
  }

  return (
    <PageContainer>
      <RoleGuard permissions={Permission.CREATE_USERS}>
        <Button type="primary">Create User</Button>
      </RoleGuard>
      {/* Page content */}
    </PageContainer>
  );
}
```

### 6. Navigation Based on Permissions
```tsx
import { canAccessRoute } from '@/lib/rbac';

function buildMenuItems(userRole: string) {
  const items = [
    {
      label: 'Dashboard',
      visible: canAccessRoute(userRole, '/dashboard'),
    },
    {
      label: 'Cases',
      children: [
        {
          label: 'My Cases',
          visible: true, // All users
        },
        {
          label: 'All Cases',
          visible: canAccessRoute(userRole, '/cases'),
        },
      ],
    },
    {
      label: 'Admin',
      visible: canAccessRoute(userRole, '/admin/users'),
      children: [
        {
          label: 'Users',
          visible: canAccessRoute(userRole, '/admin/users'),
        },
        {
          label: 'Teams',
          visible: canAccessRoute(userRole, '/admin/teams'),
        },
      ],
    },
  ];

  return items.filter(item => item.visible);
}
```

### 7. Bulk Actions with Permissions
```tsx
function CaseTable() {
  const { hasPermission } = useRolePermissions();
  const [selectedRows, setSelectedRows] = useState([]);

  const bulkActions = [];

  if (hasPermission(Permission.ASSIGN_CASES)) {
    bulkActions.push({
      label: 'Bulk Assign',
      onClick: () => bulkAssign(selectedRows),
    });
  }

  if (hasPermission(Permission.CLOSE_CASES)) {
    bulkActions.push({
      label: 'Bulk Close',
      onClick: () => bulkClose(selectedRows),
    });
  }

  return (
    <div>
      {selectedRows.length > 0 && (
        <Space>
          {bulkActions.map(action => (
            <Button key={action.label} onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </Space>
      )}
      <Table rowSelection={{ selectedRowKeys: selectedRows }} />
    </div>
  );
}
```

## Backend-Frontend Permission Mapping

| Backend @PreAuthorize | Frontend Permission | Description |
|----------------------|-------------------|-------------|
| hasRole('ADMIN') | UserRole.ADMIN | Admin only access |
| hasAnyRole('ADMIN', 'MANAGER') | isManagerOrHigher() | Manager or admin |
| hasRole('ADMIN') | Permission.CREATE_USERS | User creation |
| hasAnyRole('ADMIN', 'MANAGER') | Permission.ASSIGN_CASES | Case assignment |
| hasAnyRole('ADMIN', 'MANAGER', 'ANALYST', 'VIEWER') | Permission.VIEW_CASES | View cases |

## Best Practices

1. **Always use Permission enum** instead of hardcoding role checks
2. **Use RoleGuard component** for UI element visibility
3. **Use useRolePermissions hook** for programmatic checks
4. **Use permission-aware API** for automatic permission validation
5. **Mirror backend permissions exactly** to avoid confusion
6. **Fail gracefully** when permissions are denied
7. **Test with different roles** to ensure proper access control

## Testing Different Roles

To test the RBAC system with different roles:

1. Create test users with each role in the database
2. Login as each user type
3. Verify that:
   - Navigation shows only allowed items
   - Buttons/actions are visible based on permissions
   - API calls fail appropriately for unauthorized actions
   - Redirects work for protected pages

## Migration Guide

If migrating from old role checks to new RBAC system:

```typescript
// OLD
const isAdmin = userRole === 'ADMIN';
if (isAdmin) { ... }

// NEW
const { hasPermission } = useRolePermissions();
if (hasPermission(Permission.ADMIN_ACTION)) { ... }

// OLD
{isAdmin && <Button>Admin Button</Button>}

// NEW
<RoleGuard permissions={Permission.ADMIN_ACTION}>
  <Button>Admin Button</Button>
</RoleGuard>
```