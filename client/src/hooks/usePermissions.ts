import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

interface Permission {
  moduleId: number;
  moduleName: string;
  actionId: number;
  actionName: string;
  granted: boolean;
}

export function usePermissions() {
  const auth = useAuth();
  const user = auth?.user;
  const { data, isLoading } = trpc.permissions.getUserPermissions.useQuery(
    { userId: user?.id! },
    { enabled: !!user?.id }
  );

  // Criar um mapa de permissões para acesso rápido
  const permissionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    if (data?.permissions) {
      data.permissions.forEach((perm: Permission) => {
        const key = `${perm.moduleId}:${perm.actionId}`;
        map.set(key, perm.granted);
      });
    }
    return map;
  }, [data?.permissions]);

  const hasPermission = (moduleId: number, actionId: number): boolean => {
    // Admin tem todas as permissões
    if (user?.role === "admin") return true;
    
    const key = `${moduleId}:${actionId}`;
    return permissionMap.get(key) || false;
  };

  const canView = (moduleId: number): boolean => hasPermission(moduleId, 1); // Visualizar = 1
  const canCreate = (moduleId: number): boolean => hasPermission(moduleId, 2); // Cadastrar = 2
  const canEdit = (moduleId: number): boolean => hasPermission(moduleId, 3); // Editar = 3
  const canDelete = (moduleId: number): boolean => hasPermission(moduleId, 4); // Deletar = 4
  const canGenerateReport = (moduleId: number): boolean => hasPermission(moduleId, 5); // Gerar Relatório = 5

  return {
    isLoading,
    hasPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canGenerateReport,
    permissions: data?.permissions || [],
  };
}

// Constantes de módulos para facilitar o uso
export const MODULES = {
  PRINTERS: 1,
  SUPPLIES: 2,
  ENTRY: 3,
  EXIT: 4,
  ORDERS: 5,
  SEARCH: 6,
  REPORTS: 7,
  HISTORY: 8,
  USERS: 9,
  EMAILS: 10,
};

export const ACTIONS = {
  VIEW: 1,
  CREATE: 2,
  EDIT: 3,
  DELETE: 4,
  GENERATE_REPORT: 5,
};
