import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, Package } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";

const typeLabels: Record<string, string> = {
  cartucho: "Cartucho",
  papel: "Papel",
  tanque_manutencao: "Tanque Manutenção",
};

function AlertsPageContent() {
  const { data: supplies, isLoading } = trpc.supplies.list.useQuery();
  const lowStock = supplies?.filter((s: any) => s && s.currentStock <= s.minStock);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          Alertas de Estoque Baixo
        </h1>
        <p className="text-muted-foreground mt-1">Insumos que estão com estoque igual ou abaixo do mínimo definido</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className={lowStock && lowStock.length > 0 ? "border-amber-200 bg-amber-50/30" : "border-emerald-200 bg-emerald-50/30"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${lowStock && lowStock.length > 0 ? "bg-amber-100" : "bg-emerald-100"}`}>
                {lowStock && lowStock.length > 0 ? (
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                ) : (
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                )}
              </div>
              <div>
                <p className="text-3xl font-bold">{lowStock?.length ?? 0}</p>
                <p className="text-sm text-muted-foreground">
                  {lowStock && lowStock.length > 0
                    ? "Insumos precisam de reposição"
                    : "Todos os insumos com estoque adequado"
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Itens com Estoque Baixo</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : lowStock && lowStock.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Impressora</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead className="text-center">Estoque Atual</TableHead>
                  <TableHead className="text-center">Estoque Mínimo</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStock.map((item: any) => {
                  const isCritical = item.currentStock === 0;
                  return (
                    <TableRow key={item.id} className={isCritical ? "bg-red-50/50" : "bg-amber-50/30"}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">{item.code || "-"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{typeLabels[item.type] || item.type}</Badge></TableCell>
                      <TableCell>{item.printerName}</TableCell>
                      <TableCell>
                        {item.color ? (
                          <div className="flex items-center gap-1.5">
                            {item.color && <div className="h-3.5 w-3.5 rounded-full border" style={{ backgroundColor: item.color }} />}
                            <span className="text-sm">{item.color}</span>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold text-lg ${isCritical ? "text-red-600" : "text-amber-600"}`}>
                          {item.currentStock}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">{item.minStock}</TableCell>
                      <TableCell className="text-center">
                        {isCritical ? (
                          <Badge variant="destructive">Esgotado</Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">Baixo</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-medium mb-1">Tudo em ordem!</h3>
              <p className="text-sm text-muted-foreground">Nenhum insumo com estoque baixo no momento</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <PermissionGuard module="supplies" action="view">
      <AlertsPageContent />
    </PermissionGuard>
  );
}
