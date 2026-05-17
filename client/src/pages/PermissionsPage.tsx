import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Lock, Edit2, Loader2, Copy, CheckCircle2 } from "lucide-react";

interface Permission {
  moduleId: number;
  moduleName: string;
  actionId: number;
  actionName: string;
  granted: boolean;
}

// Display names for module names from backend
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  printers: "Impressoras",
  supplies: "Insumos",
  orders: "Pedidos",
  reports: "Relatórios",
  users: "Usuários",
  permissions: "Permissões",
  audit: "Auditoria",
  conferencia: "Conferência",
  despacho_chic: "Despacho para CHIC",
};

// Display names for action names from backend
const ACTION_DISPLAY_NAMES: Record<string, string> = {
  view: "Visualizar",
  create: "Cadastrar",
  edit: "Editar",
  delete: "Deletar",
};

function getModuleDisplayName(name: string): string {
  return MODULE_DISPLAY_NAMES[name] || name;
}

function getActionDisplayName(name: string): string {
  return ACTION_DISPLAY_NAMES[name] || name;
}

function PermissionsPageContent() {
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [bulkPermissions, setBulkPermissions] = useState<Permission[]>([]);
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const getUserPermissionsQuery = trpc.permissions.getUserPermissions.useQuery(
    { userId: selectedUser! },
    { enabled: selectedUser !== null }
  );

  const updatePermissionMutation = trpc.permissions.updateUserPermission.useMutation({
    onSuccess: () => {
      toast.success("Permissão atualizada com sucesso");
      getUserPermissionsQuery.refetch();
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar permissão: ${error.message}`);
    },
  });

  // Group permissions by module (dynamically from backend data)
  const groupedPermissions = useMemo(() => {
    const groups: Record<number, { moduleName: string; actions: Permission[] }> = {};
    for (const perm of permissions) {
      if (!groups[perm.moduleId]) {
        groups[perm.moduleId] = { moduleName: perm.moduleName, actions: [] };
      }
      groups[perm.moduleId].actions.push(perm);
    }
    return groups;
  }, [permissions]);

  // For bulk modal, use the first user's permissions as template (or selected user)
  const [bulkTemplate, setBulkTemplate] = useState<Permission[]>([]);

  // Load template permissions for bulk modal from the first available user
  const firstUserId = users?.[0]?.id;
  const templateQuery = trpc.permissions.getUserPermissions.useQuery(
    { userId: firstUserId! },
    { enabled: bulkModalOpen && firstUserId !== undefined }
  );

  useEffect(() => {
    if (templateQuery.data?.permissions) {
      setBulkTemplate(templateQuery.data.permissions.map(p => ({ ...p, granted: false })));
    }
  }, [templateQuery.data]);

  const groupedBulkTemplate = useMemo(() => {
    const groups: Record<number, { moduleName: string; actions: Permission[] }> = {};
    for (const perm of bulkTemplate) {
      if (!groups[perm.moduleId]) {
        groups[perm.moduleId] = { moduleName: perm.moduleName, actions: [] };
      }
      groups[perm.moduleId].actions.push(perm);
    }
    return groups;
  }, [bulkTemplate]);

  const handleBulkPermissionsApply = async () => {
    if (selectedUsers.size === 0) {
      toast.error("Selecione pelo menos um usuário");
      return;
    }
    if (bulkPermissions.length === 0) {
      toast.error("Selecione pelo menos uma permissão");
      return;
    }

    setIsBulkSaving(true);
    try {
      let successCount = 0;
      for (const userId of Array.from(selectedUsers)) {
        for (const perm of bulkPermissions) {
          await updatePermissionMutation.mutateAsync({
            userId,
            moduleId: perm.moduleId,
            actionId: perm.actionId,
            granted: perm.granted,
          });
          successCount++;
        }
      }
      toast.success(`${successCount} permissões atribuídas com sucesso`);
      setBulkModalOpen(false);
      setSelectedUsers(new Set());
      setBulkPermissions([]);
    } catch (error) {
      toast.error("Erro ao atribuir permissões em massa");
    } finally {
      setIsBulkSaving(false);
    }
  };

  const toggleUserSelection = (userId: number) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleBulkPermission = (moduleId: number, actionId: number) => {
    setBulkPermissions((prev) => {
      const exists = prev.find((p) => p.moduleId === moduleId && p.actionId === actionId);
      if (exists) {
        return prev.filter((p) => !(p.moduleId === moduleId && p.actionId === actionId));
      }
      const template = bulkTemplate.find((p) => p.moduleId === moduleId && p.actionId === actionId);
      return [
        ...prev,
        {
          moduleId,
          moduleName: template?.moduleName || "",
          actionId,
          actionName: template?.actionName || "",
          granted: true,
        },
      ];
    });
  };

  const handleEditUser = async (userId: number) => {
    setSelectedUser(userId);
    setIsModalOpen(true);
  };

  const handlePermissionChange = async (
    moduleId: number,
    actionId: number,
    granted: boolean
  ) => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      await updatePermissionMutation.mutateAsync({
        userId: selectedUser,
        moduleId,
        actionId,
        granted,
      });

      setPermissions((prev) =>
        prev.map((p) =>
          p.moduleId === moduleId && p.actionId === actionId
            ? { ...p, granted }
            : p
        )
      );
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (getUserPermissionsQuery.data) {
      setPermissions(getUserPermissionsQuery.data.permissions || []);
    }
  }, [getUserPermissionsQuery.data]);

  const selectedUserData = users?.find((u) => u.id === selectedUser);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Lock className="w-6 h-6 text-violet-600" />
          <h1 className="text-3xl font-bold">Controle de Permissões</h1>
        </div>
        <Button
          onClick={() => setBulkModalOpen(true)}
          className="gap-2 bg-violet-600 hover:bg-violet-700"
        >
          <Copy className="w-4 h-4" />
          Atribuir em Massa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-violet-100 text-violet-800 rounded text-sm">
                          {user.role === "admin" ? "Administrador" : "Usuário"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user.id)}
                          className="gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Permissions Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Permissões de {selectedUserData?.name || "Usuário"}
            </DialogTitle>
          </DialogHeader>

          {getUserPermissionsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedPermissions).map(([moduleIdStr, group]) => {
                const moduleId = parseInt(moduleIdStr);
                return (
                  <div key={moduleId} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-4 text-violet-700">
                      {getModuleDisplayName(group.moduleName)}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {group.actions.map((perm) => (
                        <div
                          key={`${perm.moduleId}-${perm.actionId}`}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={`perm-${perm.moduleId}-${perm.actionId}`}
                            checked={perm.granted}
                            disabled={isSaving}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(
                                perm.moduleId,
                                perm.actionId,
                                checked as boolean
                              )
                            }
                          />
                          <label
                            htmlFor={`perm-${perm.moduleId}-${perm.actionId}`}
                            className="text-sm cursor-pointer"
                          >
                            {getActionDisplayName(perm.actionName)}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
            >
              Fechar
            </Button>
            {isSaving && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </div>
            )}
            {!isSaving && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                Salvo automaticamente
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Permissions Modal */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-violet-600" />
              Atribuir Permissões em Massa
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Seleção de Usuários */}
            <div>
              <h3 className="font-semibold mb-3 text-violet-700">
                Usuários Selecionados ({selectedUsers.size})
              </h3>
              <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
                {users && users.length > 0 ? (
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedUsers.has(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                        <label className="text-sm cursor-pointer flex-1">
                          {user.name} ({user.email})
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Nenhum usuário disponível</p>
                )}
              </div>
            </div>

            {/* Seleção de Permissões */}
            <div>
              <h3 className="font-semibold mb-3 text-violet-700">
                Permissões a Atribuir ({bulkPermissions.length})
              </h3>
              {templateQuery.isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedBulkTemplate).map(([moduleIdStr, group]) => {
                    const moduleId = parseInt(moduleIdStr);
                    return (
                      <div key={moduleId} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3">
                          {getModuleDisplayName(group.moduleName)}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {group.actions.map((perm) => {
                            const isSelected = bulkPermissions.some(
                              (p) => p.moduleId === perm.moduleId && p.actionId === perm.actionId
                            );

                            return (
                              <div
                                key={`bulk-${perm.moduleId}-${perm.actionId}`}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`bulk-perm-${perm.moduleId}-${perm.actionId}`}
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    toggleBulkPermission(perm.moduleId, perm.actionId)
                                  }
                                />
                                <label
                                  htmlFor={`bulk-perm-${perm.moduleId}-${perm.actionId}`}
                                  className="text-sm cursor-pointer"
                                >
                                  {getActionDisplayName(perm.actionName)}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setBulkModalOpen(false);
                setSelectedUsers(new Set());
                setBulkPermissions([]);
              }}
              disabled={isBulkSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkPermissionsApply}
              disabled={isBulkSaving || selectedUsers.size === 0 || bulkPermissions.length === 0}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              {isBulkSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Atribuindo...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Atribuir Permissões
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


export default function PermissionsPage() {
  return (
    <PermissionGuard module="permissions" action="view">
      <PermissionsPageContent />
    </PermissionGuard>
  );
}
