'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, Plus, Trash2, TrendingDown, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';

interface DispatchItem {
  supplyId: number;
  supplyName: string;
  quantity: number;
  availableStock: number;
}

interface ConsumptionItem {
  supplyId: number;
  supplyName: string;
  quantity: number;
  availableStock: number;
}

export function DispatchPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isConsumptionDialogOpen, setIsConsumptionDialogOpen] = useState(false);
  const [dispatchItems, setDispatchItems] = useState<DispatchItem[]>([]);
  const [consumptionItems, setConsumptionItems] = useState<ConsumptionItem[]>([]);
  const [selectedSupplyId, setSelectedSupplyId] = useState<number | null>(null);
  const [selectedConsumptionSupplyId, setSelectedConsumptionSupplyId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [consumptionQuantity, setConsumptionQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [consumptionNotes, setConsumptionNotes] = useState('');
  
  // Estados para filtros de data
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Buscar permissões do usuário
  const { data: auth } = trpc.auth.me.useQuery();
  const { data: userPermissions } = trpc.permissions.getUserPermissions.useQuery(
    { userId: auth?.id ?? 0 },
    { enabled: !!auth?.id }
  );
  
  // Extrair permissões específicas para o módulo de Despacho CHIC
  const chicDispatchPerms = userPermissions?.permissions?.filter((p: any) => p.moduleName === 'despacho_chic') ?? [];
  const canView = chicDispatchPerms.some((p: any) => p.actionName === 'view' && p.granted) ?? false;
  const canCreate = chicDispatchPerms.some((p: any) => p.actionName === 'create' && p.granted) ?? false;
  const canEdit = chicDispatchPerms.some((p: any) => p.actionName === 'edit' && p.granted) ?? false;
  const canExport = chicDispatchPerms.some((p: any) => p.actionName === 'export' && p.granted) ?? false;

  // Buscar insumos da EPSON P5000
  const { data: epsonSupplies, isLoading: isLoadingSupplies } = trpc.dispatches.epsonSupplies.useQuery();

  // Buscar insumos da CHIC
  const { data: chicSupplies, isLoading: isLoadingChicSupplies, refetch: refetchChicSupplies } = trpc.dispatches.chicSupplies.useQuery();

  // Buscar resumo de estoque da CHIC
  const { data: chicStockSummary, isLoading: isLoadingStock } = trpc.dispatches.chicStockSummary.useQuery();
  
  // Buscar histórico de movimentações com filtro de data
  const { data: movementHistory, isLoading: isLoadingHistory, refetch: refetchHistory } = trpc.dispatches.getMovementHistoryByDate.useQuery({
    startDate,
    endDate,
  });
  
  // Buscar lista de despachos
  const { data: dispatches, isLoading: isLoadingDispatches, refetch: refetchDispatches } = trpc.dispatches.list.useQuery({
    limit: 100,
  });

  // Mutação para criar despacho
  const createDispatchMutation = trpc.dispatches.create.useMutation({
    onSuccess: () => {
      toast.success('Despacho criado com sucesso!');
      setIsDialogOpen(false);
      setQuantity('1');
      setNotes('');
      setSelectedSupplyId(null);
      setDispatchItems([]);
      refetchDispatches();
      refetchHistory();
    },
    onError: (error) => {
      toast.error(`Erro ao criar despacho: ${error.message}`);
    },
  });

  // Mutação para confirmar despacho
  const confirmDispatchMutation = trpc.dispatches.confirm.useMutation({
    onSuccess: () => {
      toast.success('Despacho confirmado!');
      refetchDispatches();
    },
    onError: (error) => {
      toast.error(`Erro ao confirmar despacho: ${error.message}`);
    },
  });

  // Mutação para registrar consumo
  const registerConsumptionMutation = trpc.dispatches.registerConsumption.useMutation({
    onSuccess: () => {
      toast.success('Consumo registrado com sucesso!');
      setIsConsumptionDialogOpen(false);
      setConsumptionQuantity('1');
      setConsumptionNotes('');
      setSelectedConsumptionSupplyId(null);
      setConsumptionItems([]);
      refetchChicSupplies();
      refetchHistory();
    },
    onError: (error) => {
      toast.error(`Erro ao registrar consumo: ${error.message}`);
    },
  });

  const getColorStyle = (colorHex: string | null | undefined) => {
    if (!colorHex) return { backgroundColor: '#f5f5f5', color: '#000' };
    
    // Calcular luminância para determinar cor do texto
    const hex = colorHex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return {
      backgroundColor: colorHex,
      color: luminance > 0.5 ? '#000' : '#fff',
    };
  };

  const handleAddItem = () => {
    if (!selectedSupplyId || !quantity) {
      toast.error('Selecione um insumo e quantidade');
      return;
    }

    const supply = epsonSupplies?.find((s: any) => s.id === selectedSupplyId);
    if (!supply) return;

    const existingItem = dispatchItems.find((item) => item.supplyId === selectedSupplyId);
    if (existingItem) {
      setDispatchItems(
        dispatchItems.map((item) =>
          item.supplyId === selectedSupplyId
            ? { ...item, quantity: item.quantity + parseInt(quantity) }
            : item
        )
      );
    } else {
      setDispatchItems([
        ...dispatchItems,
        {
          supplyId: selectedSupplyId,
          supplyName: supply.name,
          quantity: parseInt(quantity),
          availableStock: supply.currentStock,
        },
      ]);
    }

    setQuantity('1');
    setSelectedSupplyId(null);
  };

  const handleRemoveItem = (supplyId: number) => {
    setDispatchItems(dispatchItems.filter((item) => item.supplyId !== supplyId));
  };

  const handleCreateDispatches = async () => {
    if (dispatchItems.length === 0) {
      toast.error('Adicione pelo menos um insumo');
      return;
    }

    try {
      // Criar um despacho para cada item
      for (const item of dispatchItems) {
        await createDispatchMutation.mutateAsync({
          supplyId: item.supplyId,
          quantity: item.quantity,
          notes,
        });
      }
    } catch (error) {
      console.error('Erro ao criar despachos:', error);
    }
  };

  const handleAddConsumptionItem = () => {
    if (!selectedConsumptionSupplyId || !consumptionQuantity) {
      toast.error('Selecione um insumo e quantidade');
      return;
    }

    const supply = chicSupplies?.find((s: any) => s.id === selectedConsumptionSupplyId);
    if (!supply) return;

    const existingItem = consumptionItems.find((item) => item.supplyId === selectedConsumptionSupplyId);
    if (existingItem) {
      setConsumptionItems(
        consumptionItems.map((item) =>
          item.supplyId === selectedConsumptionSupplyId
            ? { ...item, quantity: item.quantity + parseInt(consumptionQuantity) }
            : item
        )
      );
    } else {
      setConsumptionItems([
        ...consumptionItems,
        {
          supplyId: selectedConsumptionSupplyId,
          supplyName: supply.name,
          quantity: parseInt(consumptionQuantity),
          availableStock: supply.chicStock,
        },
      ]);
    }

    setConsumptionQuantity('1');
    setSelectedConsumptionSupplyId(null);
  };

  const handleRemoveConsumptionItem = (supplyId: number) => {
    setConsumptionItems(consumptionItems.filter((item) => item.supplyId !== supplyId));
  };

  const handleRegisterConsumption = async () => {
    if (consumptionItems.length === 0) {
      toast.error('Adicione pelo menos um insumo');
      return;
    }

    try {
      // Registrar um consumo para cada item
      for (const item of consumptionItems) {
        await registerConsumptionMutation.mutateAsync({
          supplyId: item.supplyId,
          quantity: item.quantity,
          notes: consumptionNotes,
        });
      }
    } catch (error) {
      console.error('Erro ao registrar consumo:', error);
    }
  };

  const handleExportPDF = async () => {
    if (!movementHistory || movementHistory.length === 0) {
      toast.error('Nenhuma movimentação para exportar');
      return;
    }

    try {
      // Importar jsPDF dinamicamente
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 15;
      const maxWidth = doc.internal.pageSize.width - 2 * margin;

      // Cabeçalho
      doc.setFontSize(16);
      doc.text('Relatório de Movimentações', margin, yPosition);
      yPosition += 10;

      // Filtros aplicados
      doc.setFontSize(10);
      if (startDate || endDate) {
        const dateRange = `Período: ${startDate ? startDate.toLocaleDateString('pt-BR') : 'Início'} a ${endDate ? endDate.toLocaleDateString('pt-BR') : 'Fim'}`;
        doc.text(dateRange, margin, yPosition);
        yPosition += 8;
      }

      // Conteúdo por insumo
      movementHistory.forEach((supply: any, supplyIndex: number) => {
        // Verificar se precisa de nova página
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        // Nome do insumo com cor de fundo
        doc.setFillColor(
          parseInt(supply.colorHex?.substring(1, 3) || 'f5', 16),
          parseInt(supply.colorHex?.substring(3, 5) || 'f5', 16),
          parseInt(supply.colorHex?.substring(5, 7) || 'f5', 16)
        );
        doc.rect(margin, yPosition - 5, maxWidth, 8, 'F');
        
        // Determinar cor do texto
        const hex = supply.colorHex?.substring(1) || 'f5f5f5';
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        doc.setTextColor(luminance > 0.5 ? 0 : 255, luminance > 0.5 ? 0 : 255, luminance > 0.5 ? 0 : 255);
        
        doc.setFontSize(12);
        doc.setFont('', 'bold');
        doc.text(supply.name, margin + 3, yPosition + 1);
        yPosition += 10;

        // Movimentações
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('', 'normal');

        if (supply.movements && supply.movements.length > 0) {
          supply.movements.forEach((movement: any) => {
            if (yPosition > pageHeight - 20) {
              doc.addPage();
              yPosition = 20;
            }

            const type = movement.type === 'despacho' ? 'Despacho' : 'Consumo';
            const sign = movement.type === 'despacho' ? '+' : '-';
            const date = new Date(movement.date).toLocaleDateString('pt-BR');
            
            doc.text(`${type}: ${sign}${movement.quantity} | ${date}`, margin + 5, yPosition);
            yPosition += 5;

            if (movement.notes) {
              doc.setFont('', 'italic');
              const wrappedText = doc.splitTextToSize(`Notas: ${movement.notes}`, maxWidth - 10);
              doc.text(wrappedText, margin + 5, yPosition);
              yPosition += wrappedText.length * 4;
              doc.setFont('', 'normal');
            }
          });
        } else {
          doc.text('Sem movimentações', margin + 5, yPosition);
          yPosition += 5;
        }

        yPosition += 5;
      });

      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, pageHeight - 10);

      doc.save('relatorio-movimentacoes.pdf');
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  // Se nao tem permissao para visualizar, mostrar mensagem de acesso negado
  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <h2 className="text-xl font-semibold text-foreground">Acesso Negado</h2>
              <p className="text-muted-foreground">Voce nao tem permissao para acessar o modulo de Despacho para CHIC.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Estoque da CHIC */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <picture>
              <source srcSet="/manus-storage/chic-final_54aca405.webp" type="image/webp" />
              <img src="/manus-storage/chic-final_5a4d3d47.png" alt="CHIC" className="h-12 w-auto" />
            </picture>
            <h2 className="text-xl font-semibold text-foreground">Estoque da CHIC - EPSON P5000</h2>
          </div>
          <div className="flex gap-2">
            {canCreate && (
              <>
                <Button onClick={() => setIsDialogOpen(true)} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Despacho
                </Button>
                <Button onClick={() => setIsConsumptionDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <TrendingDown className="w-4 h-4 mr-2" />
                  Registrar Consumo
                </Button>
              </>
            )}
          </div>
        </div>

        {isLoadingStock ? (
          <p className="text-muted-foreground">Carregando estoque...</p>
        ) : chicStockSummary && chicStockSummary.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chicStockSummary.map((supply: any) => (
              <Card key={supply.id} className="overflow-hidden border-0 shadow-md">
                <CardHeader className="pb-3 relative" style={getColorStyle(supply.colorHex)}>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{supply.name}</CardTitle>
                    {supply.imageUrl && (
                      <img
                        src={supply.imageUrl}
                        alt={supply.name}
                        className="w-12 h-12 object-contain rounded"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque Studiolaser</p>
                      <p className="text-2xl font-bold text-foreground">{supply.currentStock}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Estoque CHIC</p>
                      <p className="text-2xl font-bold text-green-600">{supply.chicStock}</p>
                    </div>
                    {supply.minStock && (
                      <span className="text-xs text-muted-foreground">Mín: {supply.minStock}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">Nenhum insumo encontrado</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Relatório de Movimentações com Filtros */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Relatório de Movimentações</h2>
          <div className="flex gap-2">
            {canExport && (
              <Button onClick={handleExportPDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            )}
          </div>
        </div>

        {/* Filtros de Data */}
        <Card className="mb-4 border-0 shadow-md">
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-48">
                <Label htmlFor="start-date">Data Inicial</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>
              <div className="flex-1 min-w-48">
                <Label htmlFor="end-date">Data Final</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>
              <Button
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }}
                variant="outline"
              >
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Movimentações */}
        {isLoadingHistory ? (
          <p className="text-muted-foreground">Carregando histórico...</p>
        ) : movementHistory && movementHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {movementHistory.map((supply: any) => (
              <Card key={supply.id} className="overflow-hidden border-0 shadow-md">
                <CardHeader className="pb-3" style={getColorStyle(supply.colorHex)}>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{supply.name}</CardTitle>
                    {supply.imageUrl && (
                      <img
                        src={supply.imageUrl}
                        alt={supply.name}
                        className="w-12 h-12 object-contain rounded"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {supply.movements && supply.movements.length > 0 ? (
                      supply.movements.map((movement: any) => (
                        <div key={movement.id} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                          <div className="flex-shrink-0 mt-1">
                            {movement.type === 'despacho' ? (
                              <TrendingUp className="w-4 h-4 text-blue-500" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium capitalize text-foreground">
                                {movement.type === 'despacho' ? 'Despacho' : 'Consumo'}
                              </p>
                              <p className="text-sm font-bold">
                                {movement.type === 'despacho' ? '+' : '-'}{movement.quantity}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {new Date(movement.date).toLocaleDateString('pt-BR')}
                            </p>
                            {movement.status && (
                              <p className="text-xs text-muted-foreground capitalize">
                                Status: {movement.status}
                              </p>
                            )}
                            {movement.notes && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {movement.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Sem movimentações</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-md">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground py-8">Nenhuma movimentação registrada</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Despacho */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Novo Despacho para CHIC</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Seleção de Insumo */}
            <div className="space-y-2">
              <Label htmlFor="supply">Insumo da EPSON P5000</Label>
              <div className="flex gap-2">
                <Select value={selectedSupplyId?.toString() || ''} onValueChange={(v) => setSelectedSupplyId(parseInt(v))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um insumo" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingSupplies ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : epsonSupplies && epsonSupplies.length > 0 ? (
                      epsonSupplies.map((supply: any) => (
                        <SelectItem key={supply.id} value={supply.id.toString()}>
                          {supply.name} (Disponível: {supply.currentStock})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="empty" disabled>Nenhum insumo encontrado</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="Quantidade"
                  className="w-24"
                />
                <Button onClick={handleAddItem} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Lista de Itens */}
            {dispatchItems.length > 0 && (
              <div className="space-y-2">
                <Label>Itens do Despacho</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {dispatchItems.map((item) => (
                    <div key={item.supplyId} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium text-sm">{item.supplyName}</p>
                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveItem(item.supplyId)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações sobre este despacho..."
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateDispatches}
              disabled={createDispatchMutation.isPending || dispatchItems.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {createDispatchMutation.isPending ? 'Criando...' : 'Criar Despacho'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Consumo */}
      <Dialog open={isConsumptionDialogOpen} onOpenChange={setIsConsumptionDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Registrar Consumo/Saída de Insumos - CHIC</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Seleção de Insumo */}
            <div className="space-y-2">
              <Label htmlFor="consumption-supply">Insumo da CHIC</Label>
              <div className="flex gap-2">
                <Select value={selectedConsumptionSupplyId?.toString() || ''} onValueChange={(v) => setSelectedConsumptionSupplyId(parseInt(v))}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um insumo" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingChicSupplies ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : chicSupplies && chicSupplies.length > 0 ? (
                      chicSupplies.map((supply: any) => (
                        <SelectItem key={supply.id} value={supply.id.toString()}>
                          {supply.name} (CHIC: {supply.chicStock})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="empty" disabled>Nenhum insumo encontrado</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  value={consumptionQuantity}
                  onChange={(e) => setConsumptionQuantity(e.target.value)}
                  placeholder="Quantidade"
                  className="w-24"
                />
                <Button onClick={handleAddConsumptionItem} className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Lista de Itens */}
            {consumptionItems.length > 0 && (
              <div className="space-y-2">
                <Label>Itens do Consumo</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {consumptionItems.map((item) => (
                    <div key={item.supplyId} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div>
                        <p className="font-medium text-sm">{item.supplyName}</p>
                        <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveConsumptionItem(item.supplyId)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="consumption-notes">Observações (opcional)</Label>
              <Textarea
                id="consumption-notes"
                value={consumptionNotes}
                onChange={(e) => setConsumptionNotes(e.target.value)}
                placeholder="Adicione observações sobre este consumo..."
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConsumptionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleRegisterConsumption}
              disabled={registerConsumptionMutation.isPending || consumptionItems.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {registerConsumptionMutation.isPending ? 'Registrando...' : 'Registrar Consumo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
