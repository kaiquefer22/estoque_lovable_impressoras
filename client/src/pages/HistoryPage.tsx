import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { History, ArrowDownToLine, ArrowUpFromLine, ChevronLeft, ChevronRight, Edit2, Trash2, Clock } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";
import { MovementAuditLog } from "@/components/MovementAuditLog";


function formatDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function HistoryPageContent() {
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const { permissions } = useUserPermissions();

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<any>(null);
  const [editForm, setEditForm] = useState({ quantity: 0, type: "entrada", notes: "", movementDate: "", movementTime: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [deletionReason, setDeletionReason] = useState("");

  const { data, isLoading } = trpc.movements.list.useQuery({
    limit: pageSize,
    offset: page * pageSize,
  });

  const utils = trpc.useUtils();
  const updateMutation = trpc.movements.update.useMutation({
    onSuccess: () => {
      utils.movements.list.invalidate();
      setEditModalOpen(false);
      setEditError(null);
      console.log("Movimentação atualizada com sucesso");
    },
    onError: (error) => {
      const errorMsg = error.message || "Erro ao atualizar movimentacao";
      setEditError(errorMsg);
      console.error("Erro:", errorMsg);
    },
  });

  const deleteMutation = trpc.movements.delete.useMutation({
    onSuccess: () => {
      utils.movements.list.invalidate();
      setDeleteModalOpen(false);
      console.log("Movimentação deletada com sucesso");
    },
    onError: (error) => {
      console.error("Erro:", error.message);
    },
  });

  const canEdit = permissions['historico']?.['edit'] ?? false;
  const canDelete = permissions['historico']?.['delete'] ?? false;

  const handleEditClick = (movement: any) => {
    setSelectedMovement(movement);
    const date = new Date(movement.movement.movementDate);
    const dateStr = date.toISOString().slice(0, 10);
    const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    setEditForm({
      quantity: movement.movement.quantity,
      type: movement.movement.type,
      notes: movement.movement.notes || "",
      movementDate: dateStr,
      movementTime: timeStr,
    });
    setEditModalOpen(true);
  };

  const handleDeleteClick = (movement: any) => {
    setSelectedMovement(movement);
    setDeleteModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedMovement) return;
    const [year, month, day] = editForm.movementDate.split("-").map(Number);
    const [hours, minutes] = editForm.movementTime.split(":").map(Number);
    const movementDate = new Date(year, month - 1, day, hours, minutes, 0).getTime();
    await updateMutation.mutateAsync({
      id: selectedMovement.movement.id,
      quantity: editForm.quantity,
      type: editForm.type as "entrada" | "saida",
      notes: editForm.notes,
      movementDate,
    });
  };

  const handleConfirmDelete = async () => {
    if (!selectedMovement) return;
    await deleteMutation.mutateAsync({
      id: selectedMovement.movement.id,
      deletionReason: deletionReason || undefined,
    });
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <History className="h-6 w-6 text-primary" />
          Histórico de Movimentações
        </h1>
        <p className="text-muted-foreground mt-1">Registro completo de todas as entradas e saídas com data e hora</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>Todas as Movimentações ({data?.total ?? 0})</span>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : data?.movements && data.movements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Impressora</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead className="text-center">Quantidade</TableHead>
                  <TableHead className="text-center">Anterior</TableHead>
                  <TableHead className="text-center">Novo</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Observações</TableHead>
                  {(canEdit || canDelete) && <TableHead className="text-center">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.movements.map((m: any, idx: number) => (
                  <TableRow key={m.movement.id}>
                    <TableCell className="text-muted-foreground text-xs">{page * pageSize + idx + 1}</TableCell>
                    <TableCell className="text-sm whitespace-nowrap font-mono">{formatDate(m.movement.movementDate)}</TableCell>
                    <TableCell>
                      <Badge variant={m.movement.type === "entrada" ? "default" : "destructive"} className={m.movement.type === "entrada" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                        <span className="flex items-center gap-1">
                          {m.movement.type === "entrada" ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                          {m.movement.type === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{m.supplyName}</TableCell>
                    <TableCell className="text-muted-foreground">{m.supplyCode || "-"}</TableCell>
                    <TableCell>{m.printerName}</TableCell>
                    <TableCell>
                      {m.supplyColor ? (
                        <div className="flex items-center gap-1.5">
                          {m.supplyColorHex && <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: m.supplyColorHex }} />}
                          <span className="text-sm">{m.supplyColor}</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${m.movement.type === "entrada" ? "text-emerald-600" : "text-red-600"}`}>
                        {m.movement.type === "entrada" ? "+" : "-"}{m.movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{m.movement.previousStock}</TableCell>
                    <TableCell className="text-center font-medium">{m.movement.newStock}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.userName || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{m.movement.notes || "-"}</TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(m)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(m)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedMovement(m);
                              setAuditLogOpen(true);
                            }}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Ver histórico de auditoria"
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma movimentação registrada ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />Anterior
          </Button>
          <span className="text-sm text-muted-foreground px-4">Página {page + 1} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            Próxima<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Movimentação</DialogTitle>
          </DialogHeader>
          {selectedMovement && (
            <div className="space-y-4">
              {editError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  {editError}
                </div>
              )}
              <div>
                <Label>Insumo</Label>
                <Input disabled value={selectedMovement.supplyName} />
              </div>
              <div>
                <Label>Tipo de Movimento</Label>
                <Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={editForm.movementDate}
                    onChange={(e) => setEditForm({ ...editForm, movementDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Hora</Label>
                  <Input
                    type="time"
                    value={editForm.movementTime}
                    onChange={(e) => setEditForm({ ...editForm, movementTime: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Adicione observações sobre esta movimentação..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Deleção</DialogTitle>
          </DialogHeader>
          {selectedMovement && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Tem certeza que deseja deletar esta movimentação?
              </p>
              <div className="bg-muted p-3 rounded-lg space-y-2">
                <div className="text-sm">
                  <span className="font-semibold">Insumo:</span> {selectedMovement.supplyName}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Tipo:</span> {selectedMovement.movement.type === "entrada" ? "Entrada" : "Saída"}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Quantidade:</span> {selectedMovement.movement.quantity}
                </div>
                <div className="text-sm">
                  <span className="font-semibold">Data:</span> {formatDate(selectedMovement.movement.movementDate)}
                </div>
              </div>
              <p className="text-sm text-red-600 font-semibold">
                ⚠️ Esta ação não pode ser desfeita. O estoque será revertido automaticamente.
              </p>
              <div>
                <Label>Motivo da Deleção (opcional)</Label>
                <Textarea
                  value={deletionReason}
                  onChange={(e) => setDeletionReason(e.target.value)}
                  placeholder="Informe o motivo da deleção desta movimentação..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deletando..." : "Deletar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log Modal */}
      {selectedMovement && (
        <MovementAuditLog
          movementId={selectedMovement.movement.id}
          open={auditLogOpen}
          onOpenChange={setAuditLogOpen}
        />
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <PermissionGuard module="supplies" action="view">
      <HistoryPageContent />
    </PermissionGuard>
  );
}
