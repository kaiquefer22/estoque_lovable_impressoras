import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

export type PermissionModule = 'printers' | 'supplies' | 'orders' | 'reports' | 'users' | 'permissions' | 'audit';
export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface PermissionAssignment {
  moduleName: PermissionModule;
  actionName: PermissionAction;
  granted: boolean;
}

interface PermissionAssignerProps {
  value?: PermissionAssignment[];
  onChange?: (permissions: PermissionAssignment[]) => void;
  disabled?: boolean;
}

const MODULES: Array<{ id: PermissionModule; label: string }> = [
  { id: 'printers', label: 'Impressoras' },
  { id: 'supplies', label: 'Insumos' },
  { id: 'orders', label: 'Pedidos' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'users', label: 'Usuários' },
  { id: 'permissions', label: 'Permissões' },
  { id: 'audit', label: 'Auditoria' },
];

const ACTIONS: Array<{ id: PermissionAction; label: string }> = [
  { id: 'view', label: 'Visualizar' },
  { id: 'create', label: 'Criar' },
  { id: 'edit', label: 'Editar' },
  { id: 'delete', label: 'Deletar' },
];

export default function PermissionAssigner({
  value = [],
  onChange,
  disabled = false,
}: PermissionAssignerProps) {
  const [permissions, setPermissions] = useState<PermissionAssignment[]>(value);

  useEffect(() => {
    setPermissions(value);
  }, [value]);

  const handlePermissionChange = (
    moduleName: PermissionModule,
    actionName: PermissionAction,
    granted: boolean
  ) => {
    const newPermissions = [...permissions];
    const existingIndex = newPermissions.findIndex(
      (p) => p.moduleName === moduleName && p.actionName === actionName
    );

    if (existingIndex >= 0) {
      newPermissions[existingIndex].granted = granted;
    } else {
      newPermissions.push({ moduleName, actionName, granted });
    }

    setPermissions(newPermissions);
    onChange?.(newPermissions);
  };

  const isPermissionGranted = (
    moduleName: PermissionModule,
    actionName: PermissionAction
  ): boolean => {
    const permission = permissions.find(
      (p) => p.moduleName === moduleName && p.actionName === actionName
    );
    return permission?.granted ?? false;
  };

  return (
    <Card className="border-violet-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lock className="h-5 w-5 text-violet-600" />
          Permissões por Módulo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {MODULES.map((module) => (
            <div key={module.id} className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-700">
                {module.label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 ml-4">
                {ACTIONS.map((action) => (
                  <div key={`${module.id}-${action.id}`} className="flex items-center space-x-2">
                    <Checkbox
                      id={`perm-${module.id}-${action.id}`}
                      checked={isPermissionGranted(module.id, action.id)}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(module.id, action.id, checked as boolean)
                      }
                      disabled={disabled}
                    />
                    <Label
                      htmlFor={`perm-${module.id}-${action.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {action.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
