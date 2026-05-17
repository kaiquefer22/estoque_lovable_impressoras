
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Search, ArrowDownToLine, ArrowUpFromLine, RotateCcw, AlertTriangle, Package,
  Droplets, FileText, Wrench, Scroll, X, History
} from "lucide-react";
import { getColorStyles, getColorHex, getTextColor } from "@/../../shared/colorMap";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const typeLabels: Record<string, string> = {
  cartucho: "Cartucho",
  papel: "Papel",
  tanque_manutencao: "Tanque Manutenção",
};

// Paleta de cores para cartuchos sem cor definida
const CARTUCHO_PALETTE = [
  "#6366F1", "#8B5CF6", "#A855F7", "#D946EF", "#EC4899",
  "#F43F5E", "#EF4444", "#F97316", "#F59E0B", "#EAB308",
  "#84CC16", "#22C55E", "#10B981", "#14B8A6", "#06B6D4",
  "#0EA5E9", "#3B82F6", "#6366F1", "#7C3AED", "#9333EA",
];

// Paleta de cores para papéis - tons que remetem a papel
const PAPER_PALETTE = [
  { bg: "#F5E6CA", text: "#5D4037" },
  { bg: "#E8D5B7", text: "#4E342E" },
  { bg: "#D7CCC8", text: "#3E2723" },
  { bg: "#FFF8E1", text: "#6D4C41" },
  { bg: "#EFEBE9", text: "#4E342E" },
  { bg: "#F0E4D4", text: "#5D4037" },
  { bg: "#E6DDC6", text: "#3E2723" },
  { bg: "#DED3C2", text: "#4E342E" },
  { bg: "#F5ECD7", text: "#5D4037" },
  { bg: "#D4C4A8", text: "#3E2723" },
  { bg: "#C8B99A", text: "#FFFFFF" },
  { bg: "#B8A88A", text: "#FFFFFF" },
  { bg: "#E0D8C8", text: "#4E342E" },
  { bg: "#F2E8D5", text: "#5D4037" },
  { bg: "#D9CCBA", text: "#3E2723" },
];

// Paleta para tanque de manutenção
const MAINTENANCE_PALETTE = [
  { bg: "#E0E0E0", text: "#424242" },
  { bg: "#BDBDBD", text: "#212121" },
  { bg: "#9E9E9E", text: "#FFFFFF" },
  { bg: "#757575", text: "#FFFFFF" },
];

// Cores personalizadas para papéis específicos
const PAPER_CUSTOM_COLORS: Record<string, { bg: string; text: string }> = {
  "Satin 200": { bg: "#A9A9A9", text: "#FFFFFF" },
  "SATIN 200": { bg: "#A9A9A9", text: "#FFFFFF" },
  "Satin 250": { bg: "#9370DB", text: "#FFFFFF" },
  "SATIN 250": { bg: "#9370DB", text: "#FFFFFF" },
  "Matte Black": { bg: "#1A1A1A", text: "#FFFFFF" },
  "MATTE BLACK": { bg: "#1A1A1A", text: "#FFFFFF" },
  "Photo Black": { bg: "#2D2D2D", text: "#FFFFFF" },
  "PHOTO BLACK": { bg: "#2D2D2D", text: "#FFFFFF" },
}

function getCardColor(supply: any, index: number): { bg: string; text: string } {
  if (supply.type === "papel") {
    // Verificar se há cor personalizada para este papel
    if (PAPER_CUSTOM_COLORS[supply.name]) {
      return PAPER_CUSTOM_COLORS[supply.name];
    }
    return PAPER_PALETTE[index % PAPER_PALETTE.length];
  }
  if (supply.type === "tanque_manutencao") {
    return MAINTENANCE_PALETTE[index % MAINTENANCE_PALETTE.length];
  }
  if (supply.color) {
    const hex = getColorHex(supply.color);
    if (hex) {
      return { bg: hex, text: getTextColor(hex) };
    }
  }
  const bg = CARTUCHO_PALETTE[index % CARTUCHO_PALETTE.length];
  return { bg, text: getTextColor(bg) };
}

function SupplyTypeIcon({ type, color }: { type: string; color: string }) {
  const iconClass = "h-5 w-5";
  const style = { color, opacity: 0.7 };
  switch (type) {
    case "cartucho":
      return <Droplets className={iconClass} style={style} />;
    case "papel":
      return <Scroll className={iconClass} style={style} />;
    case "tanque_manutencao":
      return <Wrench className={iconClass} style={style} />;
    default:
      return <FileText className={iconClass} style={style} />;
  }
}

// Modal de histórico de movimentações
function SupplyHistoryModal({ supply, open, onClose }: { supply: any; open: boolean; onClose: () => void }) {
  const { data, isLoading } = trpc.movements.list.useQuery(
    { supplyId: supply?.id, limit: 50, offset: 0 },
    { enabled: open && !!supply?.id }
  );

  if (!supply) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Histórico - {supply.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {typeLabels[supply.type] || supply.type}
            {supply.color ? ` • ${supply.color}` : ""}
            {" • Estoque atual: "}
            <span className={supply.currentStock <= supply.minStock ? "text-red-500 font-bold" : "font-bold"}>
              {supply.currentStock}
            </span>
            {` ${supply.unit} (mín: ${supply.minStock})`}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-auto mt-2">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : data?.movements && data.movements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-center">Estoque Ant.</TableHead>
                  <TableHead className="text-center">Estoque Atual</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.movements.map((m: any) => (
                  <TableRow key={m.movement.id}>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(m.movement.movementDate)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={m.movement.type === "entrada" ? "default" : "destructive"}
                        className={m.movement.type === "entrada" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}
                      >
                        <span className="flex items-center gap-1">
                          {m.movement.type === "entrada" ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                          {m.movement.type === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      <span className={m.movement.type === "entrada" ? "text-emerald-600" : "text-red-500"}>
                        {m.movement.type === "entrada" ? "+" : "-"}{m.movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{m.movement.previousStock}</TableCell>
                    <TableCell className="text-center font-medium">{m.movement.newStock}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">{m.movement.notes || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.userName || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma movimentação registrada para este insumo</p>
            </div>
          )}
        </div>

        {data?.total && data.total > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Exibindo {data.movements.length} de {data.total} movimentações
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SearchPageContent() {
  const { data: printers } = trpc.printers.list.useQuery();
  const { data: allSupplies, isLoading: suppliesLoading } = trpc.supplies.list.useQuery();
  const [printerId, setPrinterId] = useState<string>("all");
  const [movType, setMovType] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");

  // Modal state
  const [selectedSupply, setSelectedSupply] = useState<any>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const filters = useMemo(() => ({
    printerId: printerId !== "all" ? Number(printerId) : undefined,
    type: movType !== "all" ? movType : undefined,
    startDate: startDate ? new Date(startDate).getTime() : undefined,
    endDate: endDate ? new Date(endDate + "T23:59:59").getTime() : undefined,
    limit: 100,
    offset: 0,
  }), [printerId, movType, startDate, endDate]);

  const { data, isLoading } = trpc.movements.list.useQuery(filters);

  const suppliesByPrinter = useMemo(() => {
    if (!allSupplies || !printers) return [];
    const grouped: { printer: any; supplies: any[] }[] = [];
    for (const printer of printers) {
      const printerSupplies = allSupplies.filter((s: any) => s.printerId === printer.id);
      if (printerSupplies.length > 0) {
        let filtered = printerSupplies;
        if (stockFilter === "low") {
          filtered = printerSupplies.filter((s: any) => s.currentStock <= s.minStock);
        } else if (stockFilter === "ok") {
          filtered = printerSupplies.filter((s: any) => s.currentStock > s.minStock);
        }
        if (filtered.length > 0) {
          grouped.push({ printer, supplies: filtered });
        }
      }
    }
    return grouped;
  }, [allSupplies, printers, stockFilter]);

  function resetFilters() {
    setPrinterId("all"); setMovType("all"); setStartDate(""); setEndDate("");
  }

  function openHistory(supply: any) {
    setSelectedSupply(supply);
    setHistoryModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" />
          Consultas
        </h1>
        <p className="text-muted-foreground mt-1">Pesquise movimentações por impressora, tipo e período</p>
      </div>

      {/* Estoque Atual - Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Estoque Atual
          </h2>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar estoque" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="low">Estoque Baixo</SelectItem>
              <SelectItem value="ok">Estoque OK</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {suppliesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : suppliesByPrinter.length > 0 ? (
          suppliesByPrinter.map(({ printer, supplies }) => (
            <div key={printer.id} className="space-y-3">
              <h3 className="text-base font-semibold text-muted-foreground border-b pb-1">
                {printer.name}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {supplies.map((supply: any, idx: number) => {
                  const isLow = supply.currentStock <= supply.minStock;
                  const colors = getCardColor(supply, idx);
                  return (
                    <div
                      key={supply.id}
                      className="relative rounded-xl p-3 shadow-sm border transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer"
                      style={{
                        backgroundColor: colors.bg,
                        color: colors.text,
                        borderColor: isLow ? '#EF4444' : 'transparent',
                        borderWidth: isLow ? '2px' : '1px',
                      }}
                      onClick={() => openHistory(supply)}
                      title="Clique para ver histórico de movimentações"
                    >
                      {/* Alerta de estoque baixo */}
                      {isLow && (
                        <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 shadow-lg animate-pulse">
                          <AlertTriangle className="h-4 w-4 text-white" />
                        </div>
                      )}

                      {/* Cabeçalho: Nome + Ícone */}
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <p className="text-xs font-medium leading-tight line-clamp-2 flex-1" style={{ color: colors.text }}>
                          {supply.name}
                        </p>
                        <SupplyTypeIcon type={supply.type} color={colors.text} />
                      </div>

                      {/* Tipo */}
                      <p className="text-[10px] opacity-75 mb-2" style={{ color: colors.text }}>
                        {typeLabels[supply.type] || supply.type}
                        {supply.color ? ` • ${supply.color}` : ""}
                      </p>

                      {/* Estoque */}
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold leading-none" style={{ color: colors.text }}>
                            {supply.currentStock}
                          </p>
                          <p className="text-[10px] opacity-70 mt-0.5" style={{ color: colors.text }}>
                            {supply.unit} • mín: {supply.minStock}
                          </p>
                        </div>
                        {isLow && (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: colors.text === 'white' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                              color: colors.text === 'white' ? '#FCA5A5' : '#DC2626',
                            }}
                          >
                            BAIXO
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Nenhum insumo encontrado</p>
          </div>
        )}
      </div>

      {/* Separador */}
      <div className="border-t pt-2" />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            Filtros de Movimentações
            <Button variant="ghost" size="sm" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5 mr-1" />Limpar</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Impressora</Label>
              <Select value={printerId} onValueChange={setPrinterId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {printers?.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={movType} onValueChange={setMovType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="saida">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Resultados {data ? `(${data.total})` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : data?.movements && data.movements.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Insumo</TableHead>
                  <TableHead>Impressora</TableHead>
                  <TableHead>Cor</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-center">Estoque Anterior</TableHead>
                  <TableHead className="text-center">Estoque Atual</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.movements.map((m: any) => (
                  <TableRow key={m.movement.id}>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(m.movement.movementDate)}</TableCell>
                    <TableCell>
                      <Badge variant={m.movement.type === "entrada" ? "default" : "destructive"} className={m.movement.type === "entrada" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                        <span className="flex items-center gap-1">
                          {m.movement.type === "entrada" ? <ArrowDownToLine className="h-3 w-3" /> : <ArrowUpFromLine className="h-3 w-3" />}
                          {m.movement.type === "entrada" ? "Entrada" : "Saída"}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{m.supplyName}</TableCell>
                    <TableCell>{m.printerName}</TableCell>
                    <TableCell>
                      {m.supplyColor ? (
                        <div className="flex items-center gap-1.5">
                          {m.supplyColorHex && <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: m.supplyColorHex }} />}
                          <span className="text-sm px-2 py-1 rounded font-medium" style={getColorStyles(m.supplyColor) || {}}>{m.supplyColor}</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {m.movement.type === "entrada" ? "+" : "-"}{m.movement.quantity}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">{m.movement.previousStock}</TableCell>
                    <TableCell className="text-center font-medium">{m.movement.newStock}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{m.movement.notes || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.userName || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma movimentação encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Histórico */}
      <SupplyHistoryModal
        supply={selectedSupply}
        open={historyModalOpen}
        onClose={() => { setHistoryModalOpen(false); setSelectedSupply(null); }}
      />
    </div>
  );
}

export default function SearchPage() {
  return (
    <PermissionGuard module="supplies" action="view">
      <SearchPageContent />
    </PermissionGuard>
  );
}
