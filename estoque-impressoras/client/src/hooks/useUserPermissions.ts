import { useAuth } from '@/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { useMemo } from 'react';

export type PermissionModule = 'printers' | 'supplies' | 'orders' | 'reports' | 'users' | 'permissions' | 'audit' | 'conferencia' | 'historico' | 'entrada' | 'saida';
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface UserPermissionsMap {
  [module: string]: {
    [action: string]: boolean;
  };
}

// Mapear nomes de módulos para IDs (sequenciais 1-7)
const MODULE_NAME_TO_ID: Record<PermissionModule, number> = {
  printers: 1,
  supplies: 2,
  orders: 3,
  reports: 4,
  users: 5,
  permissions: 6,
  audit: 7,
  conferencia: 8,
  historico: 9,
  entrada: 10,
  saida: 11,
};

// Mapear IDs de módulos para nomes
const MODULE_ID_TO_NAME: Record<number, PermissionModule> = {
  1: 'printers',
  2: 'supplies',
  3: 'orders',
  4: 'reports',
  5: 'users',
  6: 'permissions',
  7: 'audit',
  8: 'conferencia',
  9: 'historico',
  10: 'entrada',
  11: 'saida',
};

// Mapear nomes de ações para offsets (0-3 dentro de cada módulo)
const ACTION_OFFSET_TO_NAME: Record<number, PermissionAction> = {
  0: 'view',
  1: 'create',
  2: 'edit',
  3: 'delete',
};

export function useUserPermissions() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id! },
    { enabled: !!user?.id }
  );

  const permissions = useMemo(() => {
    const map: UserPermissionsMap = {
      printers: { view: false, create: false, edit: false, delete: false },
      supplies: { view: false, create: false, edit: false, delete: false },
      orders: { view: false, create: false, edit: false, delete: false },
      reports: { view: false, create: false, edit: false, delete: false },
      users: { view: false, create: false, edit: false, delete: false },
      permissions: { view: false, create: false, edit: false, delete: false },
      audit: { view: false, create: false, edit: false, delete: false },
      conferencia: { view: false, create: false, edit: false, delete: false },
      historico: { view: false, create: false, edit: false, delete: false },
      entrada: { view: false, create: false, edit: false, delete: false },
      saida: { view: false, create: false, edit: false, delete: false },
    };

    // Se admin, conceder todas as permissões
    if (user?.role === 'admin') {
      Object.keys(map).forEach(module => {
        Object.keys(map[module]).forEach(action => {
          map[module][action] = true;
        });
      });
      return map;
    }

    // Processar permissões do backend
    if (data?.permissions) {
      data.permissions.forEach((perm: any) => {
        const moduleName = MODULE_ID_TO_NAME[perm.moduleId];
        if (!moduleName) return;

        // Cada módulo tem 4 ações: actionId = (moduleId - 1) * 4 + offset + 1
        // Offset: 0=view, 1=create, 2=edit, 3=delete
        const baseActionId = (perm.moduleId - 1) * 4 + 1;
        const actionOffset = perm.actionId - baseActionId;
        const actionName = ACTION_OFFSET_TO_NAME[actionOffset];

        if (!actionName) return;

        map[moduleName][actionName] = perm.granted;
      });
    }

    return map;
  }, [data?.permissions, user?.role]);

  const hasPermission = (module: PermissionModule, action: PermissionAction): boolean => {
    return permissions[module]?.[action] ?? false;
  };

  const canView = (module: PermissionModule): boolean => hasPermission(module, 'view');
  const canCreate = (module: PermissionModule): boolean => hasPermission(module, 'create');
  const canEdit = (module: PermissionModule): boolean => hasPermission(module, 'edit');
  const canDelete = (module: PermissionModule): boolean => hasPermission(module, 'delete');

  return {
    permissions,
    isLoading,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
  };
}
