import { ReactNode, useEffect, useRef } from 'react';
import { useUserPermissions, PermissionModule, PermissionAction } from '@/hooks/useUserPermissions';
import { useLocation } from 'wouter';
import { toast } from 'sonner';

interface PermissionGuardProps {
  module: PermissionModule;
  action?: PermissionAction;
  children: ReactNode;
  fallback?: ReactNode;
  /** Se true, redireciona para o dashboard ao invés de mostrar fallback */
  redirect?: boolean;
}

const MODULE_LABELS: Record<PermissionModule, string> = {
  printers: 'Impressoras',
  supplies: 'Insumos',
  orders: 'Pedidos',
  reports: 'Relatórios',
  users: 'Usuários',
  permissions: 'Permissões',
  audit: 'Auditoria',
  conferencia: 'Conferência',
  historico: 'Histórico',
  entrada: 'Entrada',
  saida: 'Saída',
};

export default function PermissionGuard({
  module,
  action = 'view',
  children,
  fallback,
  redirect = true,
}: PermissionGuardProps) {
  const { hasPermission, isLoading } = useUserPermissions();
  const [, setLocation] = useLocation();
  const hasRedirected = useRef(false);

  const allowed = hasPermission(module, action);

  useEffect(() => {
    if (!isLoading && !allowed && redirect && !hasRedirected.current) {
      hasRedirected.current = true;
      const label = MODULE_LABELS[module] || module;
      toast.error(`Acesso negado: você não tem permissão para acessar "${label}".`);
      setLocation('/');
    }
  }, [isLoading, allowed, redirect, module, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    if (fallback) {
      return <>{fallback}</>;
    }
    // Se redirect está ativo, retorna null enquanto redireciona
    if (redirect) {
      return null;
    }
    return null;
  }

  return <>{children}</>;
}
