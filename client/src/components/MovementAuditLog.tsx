import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";

interface MovementAuditLogProps {
  movementId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function MovementAuditLog({ movementId, open, onOpenChange }: MovementAuditLogProps) {
  const { data: auditLogs, isLoading } = trpc.movements.getAuditLog.useQuery(
    { movementId },
    { enabled: open }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Auditoria - Movimentação #{movementId}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : auditLogs && auditLogs.length > 0 ? (
          <div className="space-y-4">
            {auditLogs.map((log: any) => {
              const details = log.details ? JSON.parse(log.details) : null;
              return (
                <div key={log.id} className="border rounded-lg p-4 bg-muted/50">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge className={log.action === "update" ? "bg-blue-600" : "bg-red-600"}>
                        {log.action === "update" ? "Editada" : "Deletada"}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        Por: <span className="font-semibold">{log.userName}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.timestamp)}
                      </p>
                    </div>
                  </div>

                  {details && (
                    <div className="space-y-3 mt-3">
                      {details.type === "movement_update" && (
                        <>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="font-semibold text-muted-foreground">Antes</p>
                              <div className="bg-background p-2 rounded mt-1 space-y-1">
                                <p>
                                  <span className="text-muted-foreground">Quantidade:</span>{" "}
                                  <span className="font-mono">{details.previous.quantity}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Tipo:</span>{" "}
                                  <span className="font-mono">{details.previous.type}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Estoque Anterior:</span>{" "}
                                  <span className="font-mono">{details.previous.previousStock}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Estoque Novo:</span>{" "}
                                  <span className="font-mono">{details.previous.newStock}</span>
                                </p>
                              </div>
                            </div>

                            <div>
                              <p className="font-semibold text-muted-foreground">Depois</p>
                              <div className="bg-background p-2 rounded mt-1 space-y-1">
                                <p>
                                  <span className="text-muted-foreground">Quantidade:</span>{" "}
                                  <span className="font-mono">{details.new.quantity}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Tipo:</span>{" "}
                                  <span className="font-mono">{details.new.type}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Estoque Anterior:</span>{" "}
                                  <span className="font-mono">{details.new.previousStock}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Estoque Novo:</span>{" "}
                                  <span className="font-mono">{details.new.newStock}</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {details.previous.notes !== details.new.notes && (
                            <div className="text-sm">
                              <p className="font-semibold text-muted-foreground">Observações</p>
                              <div className="grid grid-cols-2 gap-4 mt-1">
                                <div className="bg-background p-2 rounded">
                                  <p className="text-xs text-muted-foreground">Antes:</p>
                                  <p className="text-sm">{details.previous.notes || "-"}</p>
                                </div>
                                <div className="bg-background p-2 rounded">
                                  <p className="text-xs text-muted-foreground">Depois:</p>
                                  <p className="text-sm">{details.new.notes || "-"}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {details.type === "movement_delete" && (
                        <div className="text-sm">
                          <p className="font-semibold text-muted-foreground mb-2">Dados Deletados</p>
                          <div className="bg-background p-3 rounded space-y-1">
                            <p>
                              <span className="text-muted-foreground">Insumo ID:</span>{" "}
                              <span className="font-mono">{details.deleted.supplyId}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Quantidade:</span>{" "}
                              <span className="font-mono">{details.deleted.quantity}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Tipo:</span>{" "}
                              <span className="font-mono">{details.deleted.type}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Estoque Anterior:</span>{" "}
                              <span className="font-mono">{details.deleted.previousStock}</span>
                            </p>
                            <p>
                              <span className="text-muted-foreground">Estoque Novo:</span>{" "}
                              <span className="font-mono">{details.deleted.newStock}</span>
                            </p>
                            {details.deleted.notes && (
                              <p>
                                <span className="text-muted-foreground">Observações:</span>{" "}
                                <span>{details.deleted.notes}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum registro de auditoria para esta movimentação</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
