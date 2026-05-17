import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart, Filter, Download } from "lucide-react";
import { toast } from "sonner";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function getActionBadge(action: string) {
  const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    create: { label: "Criar", variant: "default" },
    update: { label: "Editar", variant: "secondary" },
    delete: { label: "Deletar", variant: "destructive" },
    view: { label: "Visualizar", variant: "outline" },
    export: { label: "Exportar", variant: "secondary" },
  };
  const v = variants[action] || { label: action, variant: "outline" as const };
  return <Badge variant={v.variant}>{v.label}</Badge>;
}

function AuditPageContent() {
  const { data: users } = trpc.users.list.useQuery();
  const [userId, setUserId] = useState<string>("all");
  const [module, setModule] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const [isExporting, setIsExporting] = useState(false);

  const filters = useMemo(() => ({
    userId: userId !== "all" ? Number(userId) : undefined,
    module: module !== "all" ? module : undefined,
    action: action !== "all" ? action : undefined,
    startDate: startDate ? new Date(startDate).getTime() : undefined,
    endDate: endDate ? new Date(endDate + "T23:59:59").getTime() : undefined,
    limit: pageSize,
    offset: page * pageSize,
  }), [userId, module, action, startDate, endDate, page]);

  const { data: logs, isLoading } = trpc.audit.list.useQuery(filters);
  const { data: totalCount } = trpc.audit.count.useQuery({
    userId: filters.userId,
    module: filters.module,
    action: filters.action,
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  const clearFilters = () => {
    setUserId("all");
    setModule("all");
    setAction("all");
    setStartDate("");
    setEndDate("");
    setPage(0);
    toast.success("Filtros limpos");
  };

  const exportToCSV = async () => {
    try {
      setIsExporting(true);
      // Fetch all logs without pagination for export
      const allLogs = logs || [];

      if (!allLogs || allLogs.length === 0) {
        toast.error("Nenhum registro para exportar");
        return;
      }

      const csv = [
        ["Data/Hora", "Usuário", "Ação", "Módulo", "Entidade", "Detalhes"].join(","),
        ...allLogs.map((log: any) => [
          formatDate(log.timestamp),
          log.userName,
          log.action,
          log.module,
          log.entityName || `ID: ${log.entityId}`,
          log.details ? JSON.parse(log.details).summary : "",
        ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `auditoria_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      toast.success("Auditoria exportada com sucesso");
    } catch (error) {
      toast.error("Erro ao exportar auditoria");
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = userId !== "all" || module !== "all" || action !== "all" || startDate || endDate;
  const totalPages = Math.ceil((totalCount || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            Auditoria
          </h1>
          <p className="text-muted-foreground mt-1">Histórico de ações realizadas no sistema</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5 text-violet-600" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Usuário</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="border-violet-200">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Usuários</SelectItem>
                  {users?.map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name || u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Módulo</Label>
              <Select value={module} onValueChange={setModule}>
                <SelectTrigger className="border-violet-200">
                  <SelectValue placeholder="Selecione um módulo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Módulos</SelectItem>
                  <SelectItem value="printers">Impressoras</SelectItem>
                  <SelectItem value="supplies">Insumos</SelectItem>
                  <SelectItem value="movements">Movimentações</SelectItem>
                  <SelectItem value="orders">Pedidos</SelectItem>
                  <SelectItem value="users">Usuários</SelectItem>
                  <SelectItem value="permissions">Permissões</SelectItem>
                  <SelectItem value="conferencia">Conferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Tipo de Ação</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="border-violet-200">
                  <SelectValue placeholder="Selecione uma ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  <SelectItem value="create">Criar</SelectItem>
                  <SelectItem value="update">Editar</SelectItem>
                  <SelectItem value="delete">Deletar</SelectItem>
                  <SelectItem value="view">Visualizar</SelectItem>
                  <SelectItem value="export">Exportar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Data de Início</Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border-violet-200"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Data de Término</Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border-violet-200"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline" size="sm">
                Limpar Filtros
              </Button>
            )}
            <Button onClick={exportToCSV} disabled={isExporting} size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              {isExporting ? "Exportando..." : "Exportar CSV"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Histórico de Ações {totalCount && `(${totalCount} registros)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">{formatDate(log.timestamp)}</TableCell>
                        <TableCell className="font-medium">{log.userName}</TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell className="text-sm capitalize">{log.module}</TableCell>
                        <TableCell className="text-sm">{log.entityName || `ID: ${log.entityId}`}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-xs">
                          {log.details ? JSON.parse(log.details).summary : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    variant="outline"
                    size="sm"
                  >
                    Anterior
                  </Button>
                  <Button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    variant="outline"
                    size="sm"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum registro de auditoria encontrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AuditPage() {
  return (
    <PermissionGuard module="audit" action="view">
      <AuditPageContent />
    </PermissionGuard>
  );
}
