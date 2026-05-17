import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowUpFromLine, Package, CheckCircle, Plus, Trash2, AlertTriangle, User, Download, CalendarIcon } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";

type ExitItem = {
  supplyId: string;
  quantity: string;
};

function ExitPageContent() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const { data: printers } = trpc.printers.list.useQuery();
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const { data: allSupplies } = trpc.supplies.list.useQuery();
  // Filter supplies by selected printer
  const supplies = selectedPrinter
    ? allSupplies?.filter((s: any) => String(s.printerId) === selectedPrinter)
    : allSupplies;

  const createBatch = trpc.movements.createBatch.useMutation({
    onSuccess: (result) => {
      toast.success(`Saída(s) registrada(s) com sucesso!`);
      utils.supplies.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.dashboard.stockByPrinter.invalidate();
      setItems([{ supplyId: "", quantity: "1" }]);
      setNotes("");
    },
    onError: (e) => toast.error(e.message),
  });

  const [items, setItems] = useState<ExitItem[]>([{ supplyId: "", quantity: "1" }]);
  const [notes, setNotes] = useState("");
  // Date field: defaults to today in local timezone (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);
  const [movementDate, setMovementDate] = useState(todayStr);
  // Time field: defaults to current time (HH:mm)
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const [movementTime, setMovementTime] = useState(timeStr);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { supplyId: "", quantity: "1" }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index: number, field: keyof ExitItem, value: string) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }, []);

  const selectAllSupplies = useCallback(() => {
    if (!supplies) return;
    const newItems = supplies
      .filter((s: any) => s.currentStock > 0)
      .map((s: any) => ({
        supplyId: String(s.id),
        quantity: "1",
      }));
    if (newItems.length === 0) {
      toast.error("Nenhum insumo com estoque disponível");
      return;
    }
    setItems(newItems);
  }, [supplies]);

  const validItems = items.filter(item => item.supplyId && Number(item.quantity) >= 1);
  const { data: templateData } = trpc.template.downloadMovementTemplate.useQuery();

  const downloadTemplate = () => {
    if (!templateData) return;
    try {
      const csv = [
        ['supply_id', 'quantity', 'supplyName'],
        ...templateData.map((row: any) => [row.supply_id, row.quantity, row.supplyName])
      ].map(row => row.join(';')).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'modelo_saida.csv');
      link.click();
      toast.success('Modelo baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar modelo');
    }
  };

  function getSupplyInfo(supplyId: string) {
    return supplies?.find((s: any) => s.id === Number(supplyId));
  }

  const hasInsufficientStock = validItems.some(item => {
    const supply = getSupplyInfo(item.supplyId);
    return supply && Number(item.quantity) > supply.currentStock;
  });

  function handleSubmit() {
    if (validItems.length === 0) {
      toast.error("Adicione pelo menos um insumo com quantidade válida");
      return;
    }
    if (hasInsufficientStock) {
      toast.error("Um ou mais itens possuem estoque insuficiente");
      return;
    }
    // Convert selected date and time to timestamp
    const [year, month, day] = movementDate.split("-").map(Number);
    const [hours, minutes] = movementTime.split(":").map(Number);
    const dateTimestamp = new Date(year, month - 1, day, hours, minutes, 0).getTime();
    createBatch.mutate({
      movements: validItems.map(item => ({
        supplyId: Number(item.supplyId),
        quantity: Number(item.quantity),
        type: "saida",
        notes: notes || undefined,
      })),
      movementDate: dateTimestamp,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ArrowUpFromLine className="h-6 w-6 text-red-600" />
          Saída de Estoque
        </h1>
        <p className="text-muted-foreground mt-1">Registre a saída de um ou mais insumos do estoque</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Registrar Saída</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>Impressora</Label>
              <Select value={selectedPrinter} onValueChange={(v) => { setSelectedPrinter(v); setItems([{ supplyId: "", quantity: "1" }]); }}>
                <SelectTrigger><SelectValue placeholder="Selecione a impressora" /></SelectTrigger>
                <SelectContent>{printers?.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name} - {p.model}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {selectedPrinter && (
              <>
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Insumos</Label>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={downloadTemplate}>
                      <Download className="h-3.5 w-3.5 mr-1" />Baixar Modelo
                    </Button>
                    <Button variant="outline" size="sm" onClick={selectAllSupplies} disabled={!supplies?.length}>
                      Selecionar Todos
                    </Button>
                    <Button variant="outline" size="sm" onClick={addItem}>
                      <Plus className="h-3.5 w-3.5 mr-1" />Adicionar Item
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => {
                    const supply = getSupplyInfo(item.supplyId);
                    const isInsufficient = supply && Number(item.quantity) > supply.currentStock;
                    return (
                      <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border bg-card ${isInsufficient ? "border-destructive/50 bg-destructive/5" : ""}`}>
                        <div className="flex-1">
                          <Select value={item.supplyId} onValueChange={(v) => updateItem(index, "supplyId", v)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o insumo" />
                            </SelectTrigger>
                            <SelectContent>
                              {supplies?.map((s: any) => (
                                <SelectItem key={s.id} value={String(s.id)}>
                                  <div className="flex items-center gap-2">
                                    {s.colorHex && <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: s.colorHex }} />}
                                    {s.code ? `${s.code} - ` : ""}{s.name} (Est: {s.currentStock})
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInsufficient && (
                            <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                              <AlertTriangle className="h-3 w-3" /> Insuficiente (disponível: {supply.currentStock})
                            </p>
                          )}
                        </div>
                        <div className="w-24">
                          <Input
                            type="number"
                            min="1"
                            max={supply?.currentStock}
                            placeholder="Qtd"
                            value={item.quantity}
                            onChange={e => updateItem(index, "quantity", e.target.value)}
                          />
                        </div>
                        {supply && supply.imageUrl && (
                          <img src={supply.imageUrl} alt={supply.name} className="h-10 w-10 object-contain rounded bg-gray-50 p-0.5 hidden sm:block" />
                        )}
                        {items.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeItem(index)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  Data da Movimentação
                </Label>
                <Input
                  type="date"
                  value={movementDate}
                  onChange={e => setMovementDate(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  Hora da Movimentação
                </Label>
                <Input
                  type="time"
                  value={movementTime}
                  onChange={e => setMovementTime(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea placeholder="Motivo da saída, destino, etc." value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
              </div>
            </div>

            <Button className="w-full" size="lg" variant="destructive" onClick={handleSubmit} disabled={validItems.length === 0 || hasInsufficientStock || createBatch.isPending}>
              {createBatch.isPending ? "Registrando..." : (
                <><CheckCircle className="h-4 w-4 mr-2" />Confirmar Saída ({validItems.length} {validItems.length === 1 ? "item" : "itens"})</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo da Saída</CardTitle>
          </CardHeader>
          <CardContent>
            {validItems.length > 0 ? (
              <div className="space-y-3">
                {validItems.map((item, index) => {
                  const supply = getSupplyInfo(item.supplyId);
                  if (!supply) return null;
                  const newStock = supply.currentStock - Number(item.quantity);
                  const isInsufficient = newStock < 0;
                  const isLow = !isInsufficient && newStock <= supply.minStock;
                  return (
                    <div key={index} className={`p-3 rounded-lg border ${isInsufficient ? "bg-destructive/10 border-destructive/30" : isLow ? "bg-amber-50 border-amber-200" : "bg-secondary/50"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {supply.colorHex && <div className="h-4 w-4 rounded-full border" style={{ backgroundColor: supply.colorHex }} />}
                        <span className="font-medium text-sm">{supply.name}</span>
                        {supply.code && <span className="text-xs text-muted-foreground">({supply.code})</span>}
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Atual: {supply.currentStock}</span>
                        <span className="text-red-600 font-medium">-{item.quantity}</span>
                        <span className={`font-bold ${isInsufficient ? "text-destructive" : isLow ? "text-amber-600" : ""}`}>→ {newStock}</span>
                      </div>
                      {isLow && !isInsufficient && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Abaixo do mínimo
                        </p>
                      )}
                    </div>
                  );
                })}
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Total de itens:</span>
                    <Badge variant="destructive">{validItems.length}</Badge>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Total unidades:</span>
                    <span className="font-medium text-red-600">-{validItems.reduce((sum, i) => sum + Number(i.quantity), 0)}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground text-center pt-2 space-y-1">
                  <div>Data e Hora: {new Date(movementDate + "T" + movementTime + ":00").toLocaleString("pt-BR")}</div>
                  {user && (
                    <div className="flex items-center justify-center gap-1 text-xs text-red-600 font-medium">
                      <User className="h-3 w-3" /> {user.name || "Usuário"}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Selecione insumos para ver o resumo</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ExitPage() {
  return (
    <PermissionGuard module="supplies" action="view">
      <ExitPageContent />
    </PermissionGuard>
  );
}
