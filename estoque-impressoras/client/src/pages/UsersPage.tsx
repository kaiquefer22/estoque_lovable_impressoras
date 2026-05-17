import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import PermissionAssigner, { PermissionAssignment } from "@/components/PermissionAssigner";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Users, Shield, User, Mail, Calendar, Clock, Plus, AlertCircle } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";
import { ImageUpload } from "@/components/ImageUpload";

function UsersPageContent() {
  const { user: currentUser } = useAuth();
  const usersQuery = trpc.users.list.useQuery();
  const pendingUsersQuery = trpc.users.getPendingUsers.useQuery();
  const [editUser, setEditUser] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const approveUserMutation = trpc.users.approveUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário aprovado!");
      usersQuery.refetch();
      pendingUsersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectUserMutation = trpc.users.rejectUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário rejeitado!");
      pendingUsersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteUserMutation = trpc.users.deleteUserAdmin.useMutation({
    onSuccess: () => {
      toast.success("Usuário deletado!");
      usersQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <Users className="h-7 w-7 text-violet-600" />
          Usuários
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os usuários do sistema e seus perfis
        </p>
      </div>

      {/* Botão para Criar Novo Usuário */}
      {currentUser?.role === "admin" && (
        <div className="flex justify-end">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-violet-600 hover:bg-violet-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      )}

      {/* Usuários Pendentes de Aprovação */}
      {currentUser?.role === "admin" && pendingUsersQuery.data && pendingUsersQuery.data.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-lg text-yellow-900">Usuários Pendentes de Aprovação ({pendingUsersQuery.data.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingUsersQuery.data.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-white rounded border border-yellow-200">
                  <div>
                    <p className="font-medium">{u.name || "Sem nome"}</p>
                    <p className="text-sm text-gray-600">{u.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600"
                      onClick={() => approveUserMutation.mutate({ id: u.id })}
                      disabled={approveUserMutation.isPending}
                    >
                      Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => rejectUserMutation.mutate({ id: u.id })}
                      disabled={rejectUserMutation.isPending}
                    >
                      Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Ativos ({usersQuery.data?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : usersQuery.data && usersQuery.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Cadastro</TableHead>
                  {currentUser?.role === "admin" && <TableHead>Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data.map((u: any) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {u.avatarUrl && <AvatarImage src={u.avatarUrl} />}
                          <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-bold">
                            {u.name?.charAt(0).toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        {u.name || "Sem nome"}
                      </div>
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                        {u.role === "admin" ? "Administrador" : "Usuário"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    {currentUser?.role === "admin" && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditUser(u.id)}
                          >
                            Editar
                          </Button>
                          {currentUser.id !== u.id && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm(`Tem certeza que deseja deletar ${u.name}?`)) {
                                  deleteUserMutation.mutate({ id: u.id });
                                }
                              }}
                              disabled={deleteUserMutation.isPending}
                            >
                              Deletar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">Nenhum usuário encontrado</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de edição admin */}
      <Dialog open={editUser !== null} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {editUser && <AdminUserEditor userId={editUser} onClose={() => setEditUser(null)} />}
        </DialogContent>
      </Dialog>

      {/* Dialog para criar novo usuário */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Usuário</DialogTitle>
          </DialogHeader>
          <CreateUserForm onSuccess={() => {
            setShowCreateDialog(false);
            usersQuery.refetch();
            pendingUsersQuery.refetch();
          }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileEditor({ userId }: { userId: number }) {
  const userQuery = trpc.users.getById.useQuery({ id: userId });
  const utils = trpc.useUtils();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const updateMutation = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      utils.users.list.invalidate();
      utils.users.getById.invalidate({ id: userId });
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (userQuery.data) {
      setName(userQuery.data.name || "");
      setEmail(userQuery.data.email || "");
      setAvatarUrl(userQuery.data.avatarUrl || null);
    }
  }, [userQuery.data?.id]);

  const handleSave = () => {
    updateMutation.mutate({ id: userId, name, email, avatarUrl: avatarUrl || undefined });
  };

  if (userQuery.isLoading) {
    return <div className="space-y-3"><Skeleton className="h-24 w-24 rounded-full mx-auto" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6">
      {/* Avatar com ImageUpload */}
      <div className="flex flex-col items-center gap-2">
        <ImageUpload
          currentImageUrl={avatarUrl}
          onImageUploaded={(url) => setAvatarUrl(url)}
          onImageRemoved={() => setAvatarUrl(null)}
          folder="avatars"
          size="md"
          shape="circle"
          label="Foto"
        />
      </div>

      {/* Campos */}
      <div className="flex-1 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> E-mail</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-violet-600 hover:bg-violet-700"
        >
          {updateMutation.isPending ? "Salvando..." : "Salvar Perfil"}
        </Button>
      </div>
    </div>
  );
}

function AdminUserEditor({ userId, onClose }: { userId: number; onClose: () => void }) {
  const userQuery = trpc.users.getById.useQuery({ id: userId });
  const utils = trpc.useUtils();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [permissions, setPermissions] = useState<PermissionAssignment[]>([]);
  const [passwordStrength, setPasswordStrength] = useState<any>(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const updateUserMutation = trpc.users.updateUserAdmin.useMutation({
    onSuccess: () => {
      toast.success("Usuário atualizado com sucesso!");
      utils.users.list.invalidate();
      utils.users.getById.invalidate({ id: userId });
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  useEffect(() => {
    if (userQuery.data) {
      setRole(userQuery.data.role);
      setAvatarUrl(userQuery.data.avatarUrl || null);
    }
  }, [userQuery.data?.id]);

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    const strength = {
      isValid: pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%^&*]/.test(pwd),
      feedback: [] as string[]
    };
    if (pwd.length < 8) strength.feedback.push("Mínimo 8 caracteres");
    if (!/[A-Z]/.test(pwd)) strength.feedback.push("Letra maiúscula");
    if (!/[a-z]/.test(pwd)) strength.feedback.push("Letra minúscula");
    if (!/[0-9]/.test(pwd)) strength.feedback.push("Número");
    if (!/[!@#$%^&*]/.test(pwd)) strength.feedback.push("Caractere especial");
    setPasswordStrength(strength);
  };

  const handleUpdate = () => {
    if (password && password !== confirmPassword) {
      toast.error("Senhas não conferem");
      return;
    }
    if (password && !passwordStrength?.isValid) {
      toast.error("Senha não atende aos requisitos de segurança");
      return;
    }

    updateUserMutation.mutate({
      id: userId,
      password: password || undefined,
      role,
      avatarUrl: avatarUrl || undefined,
      permissions: permissions.length > 0 ? permissions : undefined,
    });
  };

  if (userQuery.isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }

  const u = userQuery.data;
  if (!u) return <p>Usuário não encontrado</p>;

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      {/* Avatar com ImageUpload */}
      <div className="flex items-center gap-4">
        <ImageUpload
          currentImageUrl={avatarUrl}
          onImageUploaded={(url) => setAvatarUrl(url)}
          onImageRemoved={() => setAvatarUrl(null)}
          folder="avatars"
          size="sm"
          shape="circle"
          label="Foto"
        />
        <div>
          <p className="font-semibold">{u.name || "Sem nome"}</p>
          <p className="text-sm text-muted-foreground">{u.email || "Sem e-mail"}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Nível de Acesso</Label>
        <Select value={role} onValueChange={(val) => setRole(val as "user" | "admin")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Usuário</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {role === "user" && (
        <PermissionAssigner
          value={permissions}
          onChange={setPermissions}
          disabled={updateUserMutation.isPending}
        />
      )}

      <div className="border-t pt-4">
        <Button
          variant="outline"
          onClick={() => setShowPasswordFields(!showPasswordFields)}
          className="w-full"
        >
          {showPasswordFields ? "Cancelar alteração de senha" : "Alterar senha"}
        </Button>
      </div>

      {showPasswordFields && (
        <div className="space-y-3 p-3 bg-amber-50 rounded border border-amber-200">
          <div className="space-y-2">
            <Label>Nova Senha</Label>
            <Input
              type="password"
              placeholder="Deixe em branco para não alterar"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
            />
            {password && (
              <div className="text-xs space-y-1">
                {passwordStrength?.feedback.map((msg: string) => (
                  <p key={msg} className="text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {msg}
                  </p>
                ))}
                {passwordStrength?.isValid && (
                  <p className="text-green-600">✓ Senha forte</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Confirmar Nova Senha</Label>
            <Input
              type="password"
              placeholder="Confirme a nova senha"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Cadastro</p>
          <p>{new Date(u.createdAt).toLocaleDateString("pt-BR")}</p>
        </div>
        <div>
          <p className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Último Acesso</p>
          <p>{new Date(u.lastSignedIn).toLocaleDateString("pt-BR")}</p>
        </div>
      </div>

      <Button
        onClick={handleUpdate}
        disabled={updateUserMutation.isPending}
        className="w-full bg-violet-600 hover:bg-violet-700"
      >
        {updateUserMutation.isPending ? "Salvando..." : "Salvar Alterações"}
      </Button>
    </div>
  );
}


function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"user" | "admin">("user");
  const [passwordStrength, setPasswordStrength] = useState<any>(null);
  const [permissions, setPermissions] = useState<PermissionAssignment[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const createUserMutation = trpc.users.createUserAdmin.useMutation({
    onSuccess: () => {
      toast.success("Usuário criado com sucesso!");
      utils.users.list.invalidate();
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    const strength = {
      isValid: pwd.length >= 8 && /[A-Z]/.test(pwd) && /[a-z]/.test(pwd) && /[0-9]/.test(pwd) && /[!@#$%^&*]/.test(pwd),
      feedback: [] as string[]
    };
    if (pwd.length < 8) strength.feedback.push("Mínimo 8 caracteres");
    if (!/[A-Z]/.test(pwd)) strength.feedback.push("Letra maiúscula");
    if (!/[a-z]/.test(pwd)) strength.feedback.push("Letra minúscula");
    if (!/[0-9]/.test(pwd)) strength.feedback.push("Número");
    if (!/[!@#$%^&*]/.test(pwd)) strength.feedback.push("Caractere especial");
    setPasswordStrength(strength);
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (!email.trim()) {
      toast.error("E-mail é obrigatório");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Senhas não conferem");
      return;
    }
    if (!passwordStrength?.isValid) {
      toast.error("Senha não atende aos requisitos de segurança");
      return;
    }

    createUserMutation.mutate({
      name,
      email,
      password,
      role,
      avatarUrl: avatarUrl || undefined,
      permissions,
    });
  };

  return (
    <div className="space-y-4">
      {/* Avatar Upload */}
      <div className="flex justify-center">
        <ImageUpload
          currentImageUrl={avatarUrl}
          onImageUploaded={(url) => setAvatarUrl(url)}
          onImageRemoved={() => setAvatarUrl(null)}
          folder="avatars"
          size="md"
          shape="circle"
          label="Foto"
        />
      </div>

      <div className="space-y-2">
        <Label>Nome</Label>
        <Input
          placeholder="Nome completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>E-mail</Label>
        <Input
          type="email"
          placeholder="usuario@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Senha</Label>
        <Input
          type="password"
          placeholder="Senha segura"
          value={password}
          onChange={(e) => handlePasswordChange(e.target.value)}
        />
        {password && (
          <div className="text-xs space-y-1">
            {passwordStrength?.feedback.map((msg: string) => (
              <p key={msg} className="text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {msg}
              </p>
            ))}
            {passwordStrength?.isValid && (
              <p className="text-green-600">✓ Senha forte</p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Confirmar Senha</Label>
        <Input
          type="password"
          placeholder="Confirme a senha"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Nível de Acesso</Label>
        <Select value={role} onValueChange={(val) => setRole(val as "user" | "admin")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Usuário</SelectItem>
            <SelectItem value="admin">Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {role === "user" && (
        <PermissionAssigner
          value={permissions}
          onChange={setPermissions}
          disabled={createUserMutation.isPending}
        />
      )}

      <Button
        onClick={handleCreate}
        disabled={createUserMutation.isPending}
        className="w-full bg-violet-600 hover:bg-violet-700"
      >
        {createUserMutation.isPending ? "Criando..." : "Criar Usuário"}
      </Button>
    </div>
  );
}

export default UsersPageContent;
