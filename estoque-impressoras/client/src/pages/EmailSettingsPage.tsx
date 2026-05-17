import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Trash2, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";

function EmailSettingsPageContent() {
  const { data: emails, isLoading } = trpc.emails.list.useQuery();
  const [newEmail, setNewEmail] = useState("");
  const [emailType, setEmailType] = useState<"solicitacao" | "conferencia" | "ambos">("ambos");
  const [isAdding, setIsAdding] = useState(false);

  const utils = trpc.useUtils();
  const addEmailMutation = trpc.emails.create.useMutation({
    onSuccess: () => {
      toast.success("E-mail adicionado com sucesso");
      setNewEmail("");
      setIsAdding(false);
      utils.emails.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao adicionar e-mail");
    },
  });

  const deleteEmailMutation = trpc.emails.delete.useMutation({
    onSuccess: () => {
      toast.success("E-mail removido com sucesso");
      utils.emails.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao remover e-mail");
    },
  });

  const handleAddEmail = () => {
    if (!newEmail.trim()) {
      toast.error("Digite um e-mail válido");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error("E-mail inválido");
      return;
    }

    // Check for duplicate email
    const emailLower = newEmail.toLowerCase().trim();
    const isDuplicate = emails?.some((e: any) => e.email.toLowerCase() === emailLower);
    if (isDuplicate) {
      toast.error("Este e-mail já foi cadastrado");
      return;
    }

    addEmailMutation.mutate({ email: newEmail, type: emailType });
  };

  const handleDeleteEmail = (id: string) => {
    if (confirm("Tem certeza que deseja remover este e-mail?")) {
      deleteEmailMutation.mutate({ id: parseInt(id) });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Configuração de E-mails</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Gerencie os e-mails que receberão notificações de solicitações e conferências de pedidos
        </p>
      </div>

      {/* Add Email Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Novo E-mail
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="fornecedor@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddEmail()}
                  disabled={addEmailMutation.isPending}
                />
                <Button
                  onClick={handleAddEmail}
                  disabled={addEmailMutation.isPending || !newEmail.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {addEmailMutation.isPending ? "Adicionando..." : "Adicionar"}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo de Notificação</Label>
              <select
                id="type"
                value={emailType}
                onChange={(e) => setEmailType(e.target.value as any)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
              >
                <option value="solicitacao">Apenas Solicitações</option>
                <option value="conferencia">Apenas Conferências</option>
                <option value="ambos">Solicitações e Conferências</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Digite um e-mail válido, selecione o tipo de notificação e clique em "Adicionar"
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            E-mails Cadastrados ({emails?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : emails && emails.length > 0 ? (
            <div className="space-y-2">
              {emails.map((emailRecord: any) => (
                <div
                  key={emailRecord.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Mail className="w-5 h-5 text-purple-600" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{emailRecord.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Adicionado em {new Date(emailRecord.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEmail(emailRecord.id)}
                    disabled={deleteEmailMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">Nenhum e-mail cadastrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione e-mails acima para receber notificações
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium">Informações Importantes</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-blue-800">
                <li>Estes e-mails receberão notificações de solicitações de pedidos</li>
                <li>Também receberão relatórios de conferência de pedidos</li>
                <li>Você pode adicionar múltiplos e-mails para diferentes fornecedores</li>
                <li>Remova e-mails que não devem mais receber notificações</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmailSettingsPage() {
  return (
    <PermissionGuard module="permissions" action="view">
      <EmailSettingsPageContent />
    </PermissionGuard>
  );
}
