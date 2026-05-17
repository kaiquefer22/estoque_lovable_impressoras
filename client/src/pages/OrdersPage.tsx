import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";
import { Truck, Plus, Package, Calendar, Building2, Eye, CheckCircle, XCircle, Clock, ArrowRight, Trash2, Send, ClipboardCheck, FileText, AlertTriangle, History, Filter } from "lucide-react";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: "Pendente", variant: "secondary" },
  em_transito: { label: "Em Trânsito", variant: "default" },
  entregue: { label: "Entregue", variant: "outline" },
  cancelado: { label: "Cancelado", variant: "destructive" },
};

function formatDate(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatDateTime(ts: number | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function OrdersPageContent() {
  const { canCreate, canEdit, canDelete } = useUserPermissions();
  const [activeTab, setActiveTab] = useState("pedidos");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<number | null>(null);

  const ordersQuery = trpc.orders.list.useQuery();
  const utils = trpc.useUtils();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Truck className="h-7 w-7 text-violet-600" />
            Pedidos em Trânsito
          </h1>
          <p className="text-muted-foreground mt-1">
            Acompanhe pedidos feitos a fornecedores e previsão de entrega
          </p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button disabled={!canCreate("orders")} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4 mr-2" /> Novo Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Pedido</DialogTitle>
            </DialogHeader>
            <CreateOrderForm onSuccess={() => { setShowCreate(false); utils.orders.list.invalidate(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
          <TabsTrigger value="solicitacao">Solicitação</TabsTrigger>
          <TabsTrigger value="conferencia">Conferência</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            {["all", "pendente", "em_transito", "entregue", "cancelado"].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? "bg-violet-600 hover:bg-violet-700" : ""}
              >
                {s === "all" ? "Todos" : STATUS_MAP[s]?.label || s}
              </Button>
            ))}
          </div>

          {/* Lista de Pedidos */}
      <Card>
        <CardContent className="p-0">
          {ordersQuery.isLoading ? (
            <div className="p-6 space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !ordersQuery.data?.orders.length ? (
            <div className="p-12 text-center text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum pedido encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Pedido</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Data do Pedido</TableHead>
                  <TableHead>Previsão Entrega</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado por</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersQuery.data.orders.map((row) => {
                  const o = row.order;
                  const status = STATUS_MAP[o.status] || { label: o.status, variant: "secondary" as const };
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.orderNumber || `#${o.id}`}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {o.supplier}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(o.orderDate)}</TableCell>
                      <TableCell>
                        {o.estimatedDelivery ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDate(o.estimatedDelivery)}
                          </div>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.userName || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => setShowDetail(o.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {o.status === "pendente" && (
                            <StatusButton orderId={o.id} newStatus="em_transito" label="Enviar" icon={<ArrowRight className="h-3.5 w-3.5" />} />
                          )}
                          {o.status === "em_transito" && (
                            <StatusButton orderId={o.id} newStatus="entregue" label="Receber" icon={<CheckCircle className="h-3.5 w-3.5" />} />
                          )}
                          {(o.status === "pendente" || o.status === "em_transito") && (
                            <StatusButton orderId={o.id} newStatus="cancelado" label="Cancelar" icon={<XCircle className="h-3.5 w-3.5" />} variant="destructive" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="solicitacao" className="space-y-4">
          <PurchaseRequestForm />
        </TabsContent>

        <TabsContent value="conferencia" className="space-y-4">
          <OrderInspectionForm />
        </TabsContent>
      </Tabs>

      {/* Dialog de Detalhes */}
      <Dialog open={showDetail !== null} onOpenChange={() => setShowDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido</DialogTitle>
          </DialogHeader>
          {showDetail && <OrderDetail orderId={showDetail} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusButton({ orderId, newStatus, label, icon, variant }: {
  orderId: number;
  newStatus: "pendente" | "em_transito" | "entregue" | "cancelado";
  label: string;
  icon: React.ReactNode;
  variant?: "default" | "destructive";
}) {
  const utils = trpc.useUtils();
  const mutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success(newStatus === "entregue" ? "Pedido recebido e estoque atualizado!" : `Status atualizado para ${STATUS_MAP[newStatus]?.label}`);
      utils.orders.list.invalidate();
      utils.dashboard.stats.invalidate();
      utils.supplies.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Button
      variant={variant === "destructive" ? "ghost" : "outline"}
      size="sm"
      onClick={() => mutation.mutate({ id: orderId, status: newStatus })}
      disabled={mutation.isPending}
      className={variant === "destructive" ? "text-destructive hover:text-destructive" : ""}
    >
      {icon}
      <span className="ml-1 hidden sm:inline">{label}</span>
    </Button>
  );
}

function OrderDetail({ orderId }: { orderId: number }) {
  const orderQuery = trpc.orders.getById.useQuery({ id: orderId });

  if (orderQuery.isLoading) {
    return <div className="space-y-3"><Skeleton className="h-8 w-48" /><Skeleton className="h-32 w-full" /></div>;
  }

  if (!orderQuery.data) {
    return <p className="text-muted-foreground">Pedido não encontrado</p>;
  }

  const { order, userName, items } = orderQuery.data;
  const status = STATUS_MAP[order.status] || { label: order.status, variant: "secondary" as const };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Nº Pedido</p>
          <p className="font-medium">{order.orderNumber || `#${order.id}`}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Fornecedor</p>
          <p className="font-medium">{order.supplier}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Data do Pedido</p>
          <p className="font-medium">{formatDate(order.orderDate)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Previsão de Entrega</p>
          <p className="font-medium">{formatDate(order.estimatedDelivery)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Criado por</p>
          <p className="font-medium">{userName || "—"}</p>
        </div>
        {order.actualDelivery && (
          <div>
            <p className="text-sm text-muted-foreground">Data de Entrega Real</p>
            <p className="font-medium">{formatDateTime(order.actualDelivery)}</p>
          </div>
        )}
        {order.notes && (
          <div className="col-span-2">
            <p className="text-sm text-muted-foreground">Observações</p>
            <p className="font-medium">{order.notes}</p>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Package className="h-4 w-4" /> Itens do Pedido
        </h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead>Impressora</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Previsão Retorno</TableHead>
              <TableHead>Recebido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((row) => (
              <TableRow key={row.item.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {row.supplyColorHex && (
                      <div className="h-3 w-3 rounded-full border" style={{ backgroundColor: row.supplyColorHex }} />
                    )}
                    <span className="font-medium">{row.supplyName}</span>
                    {row.supplyCode && <span className="text-xs text-muted-foreground">({row.supplyCode})</span>}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{row.printerName}</TableCell>
                <TableCell className="font-medium">{row.item.quantity}</TableCell>
                <TableCell className="text-sm">{formatDate(row.item.expectedReturnDate)}</TableCell>
                <TableCell>
                  {row.item.received ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Sim</Badge>
                  ) : (
                    <Badge variant="secondary">Não</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function CreateOrderForm({ onSuccess }: { onSuccess: () => void }) {
  const [supplier, setSupplier] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split("T")[0]);
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedPrinter, setSelectedPrinter] = useState<string>("all");
  const [items, setItems] = useState<{ supplyId: number; quantity: number; expectedReturnDate: string; supplyName: string }[]>([]);

  const printersQuery = trpc.printers.list.useQuery();
  const { data: supplies } = trpc.supplies.list.useQuery();
  const createMutation = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("Pedido criado com sucesso!");
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const addItem = (supplyId: number, supplyName: string) => {
    if (items.find(i => i.supplyId === supplyId)) {
      toast.info("Insumo já adicionado");
      return;
    }
    setItems([...items, { supplyId, quantity: 1, expectedReturnDate: "", supplyName }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemQty = (index: number, qty: number) => {
    const updated = [...items];
    updated[index].quantity = qty;
    setItems(updated);
  };

  const updateItemDate = (index: number, date: string) => {
    const updated = [...items];
    updated[index].expectedReturnDate = date;
    setItems(updated);
  };

  const handleSubmit = () => {
    if (!supplier.trim()) { toast.error("Informe o fornecedor"); return; }
    if (items.length === 0) { toast.error("Adicione pelo menos um item"); return; }

    createMutation.mutate({
      supplier,
      orderNumber: orderNumber || undefined,
      orderDate: new Date(orderDate + "T12:00:00").getTime(),
      estimatedDelivery: estimatedDelivery ? new Date(estimatedDelivery + "T12:00:00").getTime() : undefined,
      notes: notes || undefined,
      items: items.map(i => ({
        supplyId: i.supplyId,
        quantity: i.quantity,
        expectedReturnDate: i.expectedReturnDate ? new Date(i.expectedReturnDate + "T12:00:00").getTime() : undefined,
      })),
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fornecedor *</Label>
          <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Nome do fornecedor" />
        </div>
        <div className="space-y-2">
          <Label>Nº do Pedido</Label>
          <Input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} placeholder="Ex: PED-001" />
        </div>
        <div className="space-y-2">
          <Label>Data do Pedido</Label>
          <Input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Estimativa de Entrega</Label>
          <Input type="date" value={estimatedDelivery} onChange={e => setEstimatedDelivery(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Observações</Label>
        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Informações adicionais..." />
      </div>

      {/* Adicionar itens */}
      <div className="border rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-sm">Itens do Pedido</h4>
        <div className="flex gap-2">
          <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por impressora" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {printersQuery.data?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-40 overflow-y-auto border rounded-md">
          {supplies?.map((s: any) => (
            <button
              key={s.id}
              onClick={() => addItem(s.id, s.name)}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-violet-50 border-b last:border-b-0 text-left transition-colors"
              disabled={items.some(i => i.supplyId === s.id)}
            >
              {s.colorHex && (
                <div 
                  className="h-3 w-3 rounded-full border flex-shrink-0" 
                  style={{
                    backgroundColor: s.colorHex,
                    borderColor: s.colorHex === '#FFFFFF' || s.colorHex === '#ffffff' ? '#999999' : 'currentColor',
                    boxShadow: s.colorHex === '#FFFFFF' || s.colorHex === '#ffffff' ? 'inset 0 0 0 1px #999999' : undefined
                  }}
                />
              )}
              <span className="flex-1">{s.name}</span>
              {s.code && <span className="text-xs text-muted-foreground">{s.code}</span>}
              {items.some(i => i.supplyId === s.id) && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
            </button>
          ))}
        </div>

        {items.length > 0 && (
          <div className="space-y-2 mt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Itens adicionados ({items.length})</p>
            {items.map((item, idx) => (
              <div key={item.supplyId} className="flex items-center gap-2 bg-violet-50 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm font-medium">{item.supplyName}</span>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={e => updateItemQty(idx, parseInt(e.target.value) || 1)}
                  className="w-20 h-8 text-center"
                />
                <Input
                  type="date"
                  value={item.expectedReturnDate}
                  onChange={e => updateItemDate(idx, e.target.value)}
                  className="w-40 h-8 text-xs"
                  title="Previsão de retorno"
                />
                <Button variant="ghost" size="sm" onClick={() => removeItem(idx)} className="h-8 w-8 p-0 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={createMutation.isPending || !supplier.trim() || items.length === 0}
        className="w-full bg-violet-600 hover:bg-violet-700"
      >
        {createMutation.isPending ? (
          <Clock className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Truck className="h-4 w-4 mr-2" />
        )}
        Criar Pedido ({items.length} {items.length === 1 ? "item" : "itens"})
      </Button>
    </div>
  );
}


function PurchaseRequestForm() {
  const { data: supplies } = trpc.supplies.list.useQuery();
  const { data: notificationEmails } = trpc.emails.list.useQuery();
  const sendMutation = trpc.reports.sendPurchaseRequest.useMutation();
  
  const [selectedItems, setSelectedItems] = useState<{ supplyId: number; supplyName: string; quantity: number; supplyCode?: string; supplyColor?: string; printerId?: number; printerName?: string }[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const handleAddItem = (supply: any) => {
    if (!selectedItems.find(i => i.supplyId === supply.id)) {
      setSelectedItems([...selectedItems, {
        supplyId: supply.id,
        supplyName: supply.name,
        quantity: 1,
        supplyCode: supply.code,
        supplyColor: supply.color,
        printerId: supply.printerId,
        printerName: supply.printerName,
      }]);
    }
  };

  const handleUpdateQuantity = (supplyId: number, quantity: number) => {
    setSelectedItems(selectedItems.map(i => 
      i.supplyId === supplyId ? { ...i, quantity } : i
    ));
  };

  const handleRemoveItem = (supplyId: number) => {
    setSelectedItems(selectedItems.filter(i => i.supplyId !== supplyId));
  };

  const handleSend = async () => {
    if (!selectedItems.length || !selectedEmails.length) {
      toast.error("Selecione insumos e e-mails de destino");
      return;
    }

    try {
      await sendMutation.mutateAsync({
        items: selectedItems,
        recipientEmails: selectedEmails,
        notes: notes || undefined,
      });
      toast.success("Solicitação enviada com sucesso!");
      setSelectedItems([]);
      setSelectedEmails([]);
      setNotes("");
    } catch (error) {
      toast.error("Erro ao enviar solicitação");
    }
  };

  const itemsByPrinter = useMemo(() => {
    const grouped: Record<string, typeof selectedItems> = {};
    selectedItems.forEach(item => {
      const key = item.printerName || "Sem Impressora";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  }, [selectedItems]);

  const SUPPLY_COLORS: Record<string, string> = {
    "Black": "#000000",
    "Cyan": "#00BCD4",
    "Magenta": "#E91E63",
    "Yellow": "#FFC107",
    "Red": "#F44336",
    "Green": "#4CAF50",
    "Blue": "#2196F3",
    "Orange": "#FF9800",
    "Purple": "#9C27B0",
    "Gray": "#9E9E9E",
    "Light Black": "#424242",
    "Light Cyan": "#80DEEA",
  };

  const getSupplyColor = (colorName?: string) => {
    if (!colorName) return "#E5E7EB";
    return SUPPLY_COLORS[colorName] || "#E5E7EB";
  };

  const getTextColor = (bgColor: string) => {
    if (bgColor === "#000000" || bgColor === "#424242") return "#FFFFFF";
    return "#000000";
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Insumos Disponíveis</Label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-80 overflow-y-auto border rounded-lg p-3">
          {supplies?.map(s => (
            <button
              key={s.id}
              onClick={() => handleAddItem(s)}
              disabled={selectedItems.some(i => i.supplyId === s.id)}
              className="text-left p-3 rounded border hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
              style={selectedItems.some(i => i.supplyId === s.id) ? { opacity: 0.5 } : {}}
            >
              <div className="font-medium truncate">{s.name}</div>
              {s.code && <div className="text-xs text-muted-foreground">{s.code}</div>}
              {s.printerName && <div className="text-xs text-violet-600 mt-1">{s.printerName}</div>}
            </button>
          ))}
        </div>
      </div>

      {selectedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Insumos Selecionados ({selectedItems.length})</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedItems([])}
              className="text-destructive hover:text-destructive"
            >
              Limpar Tudo
            </Button>
          </div>
          
          {Object.entries(itemsByPrinter).map(([printerName, items]) => (
            <div key={printerName} className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground">{printerName}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map(item => {
                  const bgColor = getSupplyColor(item.supplyColor);
                  const textColor = getTextColor(bgColor);
                  return (
                    <div
                      key={item.supplyId}
                      className="relative rounded-lg p-3 border-2 border-opacity-30 overflow-hidden group"
                      style={{
                        backgroundColor: bgColor,
                        color: textColor,
                        borderColor: bgColor,
                      }}
                    >
                      <div className="space-y-2">
                        <div>
                          <div className="font-semibold text-sm line-clamp-2">{item.supplyName}</div>
                          {item.supplyCode && <div className="text-xs opacity-75">{item.supplyCode}</div>}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => handleUpdateQuantity(item.supplyId, parseInt(e.target.value) || 1)}
                            className="w-12 h-7 text-center text-sm"
                            style={{
                              backgroundColor: "rgba(255,255,255,0.9)",
                              color: "#000000",
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveItem(item.supplyId)}
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: textColor }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <Label className="text-sm font-medium">E-mails de Destino</Label>
        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
          {notificationEmails?.map((email: any) => (
            <label key={email.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={selectedEmails.includes(email.email)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedEmails([...selectedEmails, email.email]);
                  } else {
                    setSelectedEmails(selectedEmails.filter(e => e !== email.email));
                  }
                }}
                className="rounded"
              />
              <span className="text-sm">{email.email}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-sm font-medium">Notas (opcional)</Label>
        <Textarea
          id="notes"
          placeholder="Adicione observações sobre a solicitação..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="min-h-20"
        />
      </div>

      <Button
        onClick={handleSend}
        disabled={sendMutation.isPending || !selectedItems.length || !selectedEmails.length}
        className="w-full bg-violet-600 hover:bg-violet-700"
      >
        {sendMutation.isPending ? (
          <Clock className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Send className="h-4 w-4 mr-2" />
        )}
        Enviar Solicitação ({selectedItems.length} {selectedItems.length === 1 ? "item" : "itens"})
      </Button>
    </div>
  );
}


function OrderInspectionForm() {
  const { canCreate, canEdit } = useUserPermissions();
  const [selectedOrderForInspection, setSelectedOrderForInspection] = useState<number | null>(null);
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [notes, setNotes] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [historyOrderId, setHistoryOrderId] = useState<number | null>(null);

  const canConfirm = canCreate("conferencia" as any);
  const canEntry = canEdit("orders");

  const { data: orders } = trpc.orders.list.useQuery();
  const { data: selectedOrderItems } = trpc.orders.getItemsForInspection.useQuery(
    { orderId: selectedOrderForInspection || 0 },
    { enabled: !!selectedOrderForInspection }
  );
  const { data: allConfirmations } = trpc.orders.listAllConfirmations.useQuery({});
  const { data: orderConfirmations } = trpc.orders.getConfirmations.useQuery(
    { orderId: historyOrderId || 0 },
    { enabled: !!historyOrderId }
  );

  const confirmOnlyMutation = trpc.orders.confirmOnly.useMutation();
  const confirmAndReceiveMutation = trpc.orders.confirmAndReceive.useMutation();
  const utils = trpc.useUtils();

  const handleToggleItem = (itemId: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const handleConfirmOnly = async () => {
    if (!selectedOrderForInspection || checkedItems.size === 0) {
      toast.error("Selecione um pedido e marque itens para conferir");
      return;
    }
    try {
      await confirmOnlyMutation.mutateAsync({
        orderId: selectedOrderForInspection,
        itemIds: Array.from(checkedItems),
        notes: notes || undefined,
      });
      toast.success("Conferência registrada com sucesso!");
      setCheckedItems(new Set());
      setNotes("");
      utils.orders.listAllConfirmations.invalidate();
    } catch (error: any) {
      toast.error(error?.message || "Erro ao registrar conferência");
    }
  };

  const handleConfirmAndReceive = async () => {
    if (!selectedOrderForInspection || checkedItems.size === 0) {
      toast.error("Selecione um pedido e marque itens para conferir e dar entrada");
      return;
    }
    try {
      const result = await confirmAndReceiveMutation.mutateAsync({
        orderId: selectedOrderForInspection,
        itemIds: Array.from(checkedItems),
        notes: notes || undefined,
      });
      toast.success(result.allReceived
        ? "Conferência + Entrada registrada! Todos os itens do pedido foram recebidos."
        : "Conferência + Entrada registrada com sucesso!"
      );
      setCheckedItems(new Set());
      setNotes("");
      setSelectedOrderForInspection(null);
      utils.orders.list.invalidate();
      utils.orders.listAllConfirmations.invalidate();
    } catch (error: any) {
      toast.error(error?.message || "Erro ao registrar conferência e entrada");
    }
  };

  const pendingOrders = orders?.orders.filter(o => o.order.status !== "entregue") || [];
  const isPending = confirmOnlyMutation.isPending || confirmAndReceiveMutation.isPending;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-violet-600" />
            Conferência de Pedidos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!canConfirm && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <p className="text-sm text-yellow-800">Você não tem permissão para realizar conferências. Solicite ao administrador.</p>
            </div>
          )}

          {/* Seleção de Pedido */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Selecione um Pedido</Label>
            <Select value={selectedOrderForInspection?.toString() || ""} onValueChange={(v) => {
              setSelectedOrderForInspection(v ? parseInt(v) : null);
              setCheckedItems(new Set());
              setNotes("");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um pedido para conferir..." />
              </SelectTrigger>
              <SelectContent>
                {pendingOrders.map(o => (
                  <SelectItem key={o.order.id} value={o.order.id.toString()}>
                    #{o.order.orderNumber || o.order.id} - {o.order.supplier} ({STATUS_MAP[o.order.status]?.label})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Checklist de Itens */}
          {selectedOrderForInspection && selectedOrderItems && selectedOrderItems.length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Itens do Pedido ({selectedOrderItems.length})</Label>
              <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                {selectedOrderItems.map((item: any) => (
                  <label key={item.item.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedItems.has(item.item.id)}
                      onChange={() => handleToggleItem(item.item.id)}
                      className="rounded"
                      disabled={!canConfirm}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{item.supply.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.printer.name} • {item.item.quantity} un • Previsto: {formatDate(item.item.expectedReturnDate)}
                      </div>
                    </div>
                    <div className="text-sm font-medium text-violet-600">{item.item.quantity} un</div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Observações */}
          {checkedItems.size > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Observações (opcional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre a conferência..."
                rows={2}
              />
            </div>
          )}

          {/* Resumo */}
          {checkedItems.size > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
              <p className="text-sm font-medium text-violet-900">
                {checkedItems.size} item(ns) selecionado(s) para conferência
              </p>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Botão: Somente Conferir */}
            <Button
              onClick={handleConfirmOnly}
              disabled={isPending || !selectedOrderForInspection || checkedItems.size === 0 || !canConfirm}
              variant="outline"
              className="flex-1 border-violet-300 text-violet-700 hover:bg-violet-50"
            >
              {confirmOnlyMutation.isPending ? (
                <Clock className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ClipboardCheck className="h-4 w-4 mr-2" />
              )}
              Somente Conferir
            </Button>

            {/* Botão: Conferir + Dar Entrada */}
            <Button
              onClick={handleConfirmAndReceive}
              disabled={isPending || !selectedOrderForInspection || checkedItems.size === 0 || !canConfirm || !canEntry}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {confirmAndReceiveMutation.isPending ? (
                <Clock className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Conferir + Dar Entrada
            </Button>
          </div>

          {!canEntry && canConfirm && (
            <p className="text-xs text-muted-foreground text-center">
              Você pode conferir, mas não tem permissão para dar entrada. Solicite ao administrador.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Conferências */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-violet-600" />
            Histórico de Conferências
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <ConfirmationFilters />

          {allConfirmations && allConfirmations.confirmations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Obs.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allConfirmations.confirmations.map((c: any) => (
                  <TableRow key={c.confirmation.id}>
                    <TableCell className="text-xs">
                      {formatDateTime(c.confirmation.confirmedAt)}
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      #{c.orderNumber || c.confirmation.orderId} - {c.supplier || "—"}
                    </TableCell>
                    <TableCell className="text-xs">{c.userName || "—"}</TableCell>
                    <TableCell>
                      {c.confirmation.withEntry ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Conferiu + Entrada</Badge>
                      ) : (
                        <Badge variant="outline" className="text-violet-700 border-violet-300 text-xs">Só Conferiu</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {c.confirmation.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma conferência registrada ainda</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Envio de Relatório */}
      {allConfirmations && allConfirmations.confirmations.length > 0 && (
        <SendConfirmationReportCard confirmations={allConfirmations.confirmations} />
      )}
    </div>
  );
}

function SendConfirmationReportCard({ confirmations }: { confirmations: any[] }) {
  const { data: emails } = trpc.emails.list.useQuery();
  const sendReportMutation = trpc.orders.sendConfirmationReport.useMutation();
  const [selectedEmails, setSelectedEmails] = useState<Set<number>>(new Set());
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const handleSendReport = async () => {
    if (!selectedOrderId || selectedEmails.size === 0) {
      toast.error("Selecione um pedido e pelo menos um e-mail");
      return;
    }

    try {
      const emailAddresses = emails
        ?.filter((_: any, idx: number) => selectedEmails.has(idx))
        .map((e: any) => e.email) || [];

      await sendReportMutation.mutateAsync({
        orderId: selectedOrderId,
        emails: emailAddresses,
      });

      toast.success(`Relatório enviado para ${emailAddresses.length} e-mail(s)!`);
      setSelectedEmails(new Set());
      setSelectedOrderId(null);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao enviar relatório");
    }
  };

  const uniqueOrders = Array.from(
    new Map(
      confirmations.map(c => [c.confirmation.orderId, c])
    ).values()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-violet-600" />
          Enviar Relatório de Conferência
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Selecione um Pedido</Label>
          <Select value={selectedOrderId?.toString() || ""} onValueChange={(v) => {
            setSelectedOrderId(v ? parseInt(v) : null);
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um pedido..." />
            </SelectTrigger>
            <SelectContent>
              {uniqueOrders.map(c => (
                <SelectItem key={c.confirmation.orderId} value={c.confirmation.orderId.toString()}>
                  #{c.orderNumber || c.confirmation.orderId} - {c.supplier || "—"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {emails && emails.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Selecione E-mails de Destino</Label>
            <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              {emails.map((email: any, idx: number) => (
                <label key={idx} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEmails.has(idx)}
                    onChange={(e) => {
                      const newSelected = new Set(selectedEmails);
                      if (e.target.checked) {
                        newSelected.add(idx);
                      } else {
                        newSelected.delete(idx);
                      }
                      setSelectedEmails(newSelected);
                    }}
                    className="rounded"
                  />
                  <span className="text-sm">{email.email}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {(!emails || emails.length === 0) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">Nenhum e-mail cadastrado. Configure e-mails na aba Config. E-mails.</p>
          </div>
        )}

        <Button
          onClick={handleSendReport}
          disabled={sendReportMutation.isPending || !selectedOrderId || selectedEmails.size === 0 || !emails || emails.length === 0}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {sendReportMutation.isPending ? (
            <Clock className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Enviar Relatório ({selectedEmails.size} e-mail{selectedEmails.size !== 1 ? "s" : ""})
        </Button>
      </CardContent>
    </Card>
  );
}


function ConfirmationFilters() {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const { data: allUsers } = trpc.users.list.useQuery();
  const utils = trpc.useUtils();

  const handleFilter = () => {
    utils.orders.listAllConfirmations.invalidate({
      startDate: startDate?.getTime(),
      endDate: endDate?.getTime(),
      userId: selectedUserId,
    });
  };

  const handleClearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedUserId(undefined);
    utils.orders.listAllConfirmations.invalidate({});
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="space-y-1">
        <Label className="text-xs font-medium">Data Inicial</Label>
        <input
          type="date"
          value={startDate?.toISOString().split('T')[0] || ''}
          onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Data Final</Label>
        <input
          type="date"
          value={endDate?.toISOString().split('T')[0] || ''}
          onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-medium">Usuario</Label>
        <Select value={selectedUserId?.toString() || "all"} onValueChange={(v) => {
          setSelectedUserId(v === "all" ? undefined : (v ? parseInt(v) : undefined));
        }}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {allUsers?.map((user: any) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2 col-span-full sm:col-span-3">
        <Button onClick={handleFilter} size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700">
          <Filter className="h-4 w-4 mr-2" />
          Filtrar
        </Button>
        <Button onClick={handleClearFilters} size="sm" variant="outline" className="flex-1">
          Limpar
        </Button>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <PermissionGuard module="orders" action="view">
      <OrdersPageContent />
    </PermissionGuard>
  );
}
