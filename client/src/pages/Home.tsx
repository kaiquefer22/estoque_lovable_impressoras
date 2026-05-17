import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Printer, Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, TrendingUp, Truck, Clock, Zap, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({ title, value, icon: Icon, description, variant = "default" }: {
  title: string;
  value: string | number;
  icon: any;
  description?: string;
  variant?: "default" | "warning" | "success";
}) {
  const iconColors = {
    default: "text-primary bg-primary/10",
    warning: "text-amber-600 bg-amber-50",
    success: "text-emerald-600 bg-emerald-50",
  };
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${iconColors[variant]}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  );
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function Home() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: stockByPrinter, isLoading: printerLoading } = trpc.dashboard.stockByPrinter.useQuery();
  const { data: supplies } = trpc.supplies.list.useQuery();
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const { data: kpis } = trpc.reports.getKPIs.useQuery({ startDate: ninetyDaysAgo.getTime(), endDate: now.getTime() });
  const { data: timeToConsume } = trpc.reports.getTimeToConsume1Unit.useQuery({ startDate: ninetyDaysAgo.getTime(), endDate: now.getTime() });
  const { data: predictions } = trpc.reports.predictAllCritical.useQuery({ daysAhead: 30 });
  const lowStock = supplies?.filter((s: any) => (s.supply?.currentStock ?? 0) <= (s.supply?.minStock ?? 0));
  const criticalPredictions = predictions?.filter((p: any) => p.daysUntilCritical <= 7) ?? [];

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Visão geral do estoque de insumos</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Visão geral do estoque de insumos</p>
      </div>

      {/* KPI Executive Cards */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-gradient-to-r from-violet-50 to-purple-50 p-4 rounded-lg border border-violet-200">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-violet-600" />
                Taxa de Reposição
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.replenishmentRate?.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground mt-1">Eficiência de reposição</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Dias Médios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timeToConsume && timeToConsume.length > 0 ? (timeToConsume.reduce((sum: number, item: any) => sum + (item.daysToConsume1Unit || 0), 0) / timeToConsume.length).toFixed(1) : "—"} dias</div>
              <p className="text-xs text-muted-foreground mt-1">Para consumir 1 unidade</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" />
                Eficiência
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpis.replenishmentRate ? (100 - kpis.lowStockPercentage).toFixed(1) : "—"}%</div>
              <p className="text-xs text-muted-foreground mt-1">Itens em estoque normal</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Impressoras"
          value={stats?.totalPrinters ?? 0}
          icon={Printer}
          description="Modelos cadastrados"
        />
        <StatCard
          title="Insumos"
          value={stats?.totalSupplies ?? 0}
          icon={Package}
          description="Itens no catálogo"
        />
        <StatCard
          title="Movimentações"
          value={stats?.totalMovements ?? 0}
          icon={TrendingUp}
          description="Total registrado"
          variant="success"
        />
        <StatCard
          title="Estoque Baixo"
          value={stats?.lowStockCount ?? 0}
          icon={AlertTriangle}
          description="Itens para repor"
          variant="warning"
        />
        <StatCard
          title="Pedidos"
          value={stats?.pendingOrders ?? 0}
          icon={Truck}
          description="Aguardando entrega"
        />
      </div>

      {/* Stock by Printer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Estoque por Impressora</CardTitle>
          </CardHeader>
          <CardContent>
            {printerLoading ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : stockByPrinter && stockByPrinter.length > 0 ? (
              <div className="space-y-3">
                {stockByPrinter.map((p: any) => (
                  <div key={p.printerId} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Printer className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{p.printerName}</p>
                        <p className="text-xs text-muted-foreground">{p.printerModel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{p.totalStock} un</p>
                        <p className="text-xs text-muted-foreground">{p.totalSupplies} insumos</p>
                      </div>
                      {Number(p.lowStockItems) > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {p.lowStockItems} baixo
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma impressora cadastrada</p>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alertas de Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock && lowStock.length > 0 ? (
              <div className="space-y-2">
                {lowStock.slice(0, 8).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 border border-amber-200/50">
                    <div className="flex items-center gap-3">
                      {item.color && (
                        <div className="h-4 w-4 rounded-full border border-border/50" style={{ backgroundColor: item.color }} />
                      )}
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.printerName} - {item.code || "S/C"}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                      {item.currentStock} / {item.minStock}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <Package className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm text-muted-foreground">Todos os insumos estão com estoque adequado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Critical Predictions */}
      {criticalPredictions && criticalPredictions.length > 0 && (
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Previsao de Estoque Critico (Proximos 30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {criticalPredictions.slice(0, 5).map((pred: any) => (
                <div key={pred.supplyId} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                  <div>
                    <p className="font-medium text-sm">Insumo ID: {pred.supplyId}</p>
                    <p className="text-xs text-muted-foreground">Consumo: {pred.predictedDailyConsumption.toFixed(2)} un/dia</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-red-600">{pred.daysUntilCritical} dias</p>
                    <p className="text-xs text-gray-500">{new Date(pred.estimatedCriticalDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Movimentações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentMovements && stats.recentMovements.length > 0 ? (
            <div className="space-y-2">
              {stats.recentMovements.map((m: any) => (
                <div key={m.movement.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                      m.movement.type === "entrada" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    }`}>
                      {m.movement.type === "entrada" ? <ArrowDownToLine className="h-4 w-4" /> : <ArrowUpFromLine className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{m.supplyName}</p>
                        {m.supplyColorHex && (
                          <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: m.supplyColorHex }} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {m.printerName} - {formatDate(m.movement.movementDate)}
                        {m.userName && <span className="ml-1">por <span className="font-medium">{m.userName}</span></span>}
                      </p>
                    </div>
                  </div>
                  <Badge variant={m.movement.type === "entrada" ? "default" : "destructive"} className={
                    m.movement.type === "entrada"
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : ""
                  }>
                    {m.movement.type === "entrada" ? "+" : "-"}{m.movement.quantity}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma movimentação registrada</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
