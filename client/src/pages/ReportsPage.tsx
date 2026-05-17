import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart, Download, ArrowDownToLine, ArrowUpFromLine, FileText, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getColorStyles } from "@/../../shared/colorMap";
import { getSupplyColor as getColorFromPalette } from "@/../../shared/colorPalette";
import { LineChart, Line } from "recharts";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ReportCharts } from "@/components/ReportCharts";

function formatDate(ts: number) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// Truncate supply names to last 10 characters for chart legends
function truncateSupplyName(name: string, maxChars: number = 10): string {
  if (name.length <= maxChars) return name;
  return "..." + name.slice(-maxChars);
}



function ReportsPageContent() {
  const { canView } = useUserPermissions();
  const { data: printers } = trpc.printers.list.useQuery();
  const [companyId, setCompanyId] = useState<string>("all");
  const [printerId, setPrinterId] = useState<string>("all");
  const [movType, setMovType] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exportingExcel, setExportingExcel] = useState(false);
  const [comparisonMonthsBack, setComparisonMonthsBack] = useState<number>(12);
  const [timeToConsumePeriodDays, setTimeToConsumePeriodDays] = useState<number>(90);
  const [top10PeriodDays, setTop10PeriodDays] = useState<number>(90);
  const [showCharts, setShowCharts] = useState(false);
  const [chartPrinterFilter, setChartPrinterFilter] = useState<string>("all");
  const [chartSupplyTypeFilter, setChartSupplyTypeFilter] = useState<string>("all");
  const [chartStartDate, setChartStartDate] = useState<string>("");
  const [chartEndDate, setChartEndDate] = useState<string>("");
  const excelMutation = trpc.reports.generateExcel.useMutation();
  const currentYear = new Date().getFullYear();
  const { data: yearlyComparison } = trpc.reports.getYearlyComparison.useQuery({ year: currentYear });
  const { data: yearlyComparisonByType } = trpc.reports.getYearlyComparisonByTypeAndPrinter.useQuery({ year: currentYear });
  // Calculate start and end dates for time-to-consume period
  const timeToConsumeEndDate = Date.now();
  const timeToConsumeStartDate = timeToConsumeEndDate - (timeToConsumePeriodDays * 24 * 60 * 60 * 1000);
  
  const { data: timeToConsume1Unit, isLoading: isLoadingTimeToConsume } = trpc.reports.getTimeToConsume1Unit.useQuery({ startDate: timeToConsumeStartDate, endDate: timeToConsumeEndDate });
  
  // Stock prediction
  const [predictionDaysAhead, setPredictionDaysAhead] = useState<number>(30);
  const { data: predictions, isLoading: isLoadingPredictions } = trpc.reports.predictAllCritical.useQuery({ daysAhead: predictionDaysAhead });

  // Group time-to-consume data by printer
  const timeToConsumeByPrinter = useMemo(() => {
    if (!timeToConsume1Unit) return {};
    const grouped: Record<string, any[]> = {};
    timeToConsume1Unit.forEach((item: any) => {
      if (!grouped[item.printerName]) grouped[item.printerName] = [];
      grouped[item.printerName].push(item);
    });
    return grouped;
  }, [timeToConsume1Unit]);

  // Function to determine urgency level based on days to consume
  function getUrgencyLevel(daysToConsume: number | null): { level: 'critical' | 'warning' | 'safe'; label: string; color: string; bgColor: string; icon: typeof AlertCircle } {
    if (daysToConsume === null) return { level: 'safe', label: 'Sem dados', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: Clock };
    if (daysToConsume <= 7) return { level: 'critical', label: 'Crítico', color: 'text-red-600', bgColor: 'bg-red-100', icon: AlertCircle };
    if (daysToConsume <= 30) return { level: 'warning', label: 'Atenção', color: 'text-yellow-600', bgColor: 'bg-yellow-100', icon: AlertCircle };
    return { level: 'safe', label: 'Normal', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle };
  }

  const filters = useMemo(() => ({
    companyId: companyId !== "all" ? Number(companyId) : undefined,
    printerId: printerId !== "all" ? Number(printerId) : undefined,
    type: movType !== "all" ? movType : undefined,
    startDate: startDate ? new Date(startDate).getTime() : undefined,
    endDate: endDate ? new Date(endDate + "T23:59:59").getTime() : undefined,
    limit: 500,
    offset: 0,
  }), [companyId, printerId, movType, startDate, endDate]);

  const { data, isLoading } = trpc.movements.list.useQuery(filters);

  const clearFilters = () => {
    setCompanyId("all");
    setPrinterId("all");
    setMovType("all");
    setStartDate("");
    setEndDate("");
    toast.success("Filtros limpos com sucesso");
  };

  const hasActiveFilters = companyId !== "all" || printerId !== "all" || movType !== "all" || startDate || endDate;

  // Prepare yearly comparison chart data by type and printer
  const chartDataPaperP5000 = useMemo(() => {
    if (!yearlyComparisonByType?.paperP5000) return [];
    return yearlyComparisonByType.paperP5000.map((item: any) => ({
      month: item.month,
      [String(currentYear)]: item.currentYear,
      [String(currentYear - 1)]: item.previousYear,
    }));
  }, [yearlyComparisonByType, currentYear]);

  const chartDataPaperPlotter = useMemo(() => {
    if (!yearlyComparisonByType?.paperPlotter) return [];
    return yearlyComparisonByType.paperPlotter.map((item: any) => ({
      month: item.month,
      [String(currentYear)]: item.currentYear,
      [String(currentYear - 1)]: item.previousYear,
    }));
  }, [yearlyComparisonByType, currentYear]);

  const chartDataCartridgesP5000 = useMemo(() => {
    if (!yearlyComparisonByType?.cartridgesP5000) return [];
    return yearlyComparisonByType.cartridgesP5000.map((item: any) => ({
      month: item.month,
      [String(currentYear)]: item.currentYear,
      [String(currentYear - 1)]: item.previousYear,
    }));
  }, [yearlyComparisonByType, currentYear]);

  const chartDataCartridgesPlotter = useMemo(() => {
    if (!yearlyComparisonByType?.cartridgesPlotter) return [];
    return yearlyComparisonByType.cartridgesPlotter.map((item: any) => ({
      month: item.month,
      [String(currentYear)]: item.currentYear,
      [String(currentYear - 1)]: item.previousYear,
    }));
  }, [yearlyComparisonByType, currentYear]);

  // Legacy yearly comparison chart data
  const chartDataYearlyComparison = useMemo(() => {
    if (!yearlyComparison || yearlyComparison.length === 0) return [];
    return yearlyComparison.map((item: any) => ({
      month: item.month,
      [String(currentYear)]: item.currentYear,
      [String(currentYear - 1)]: item.previousYear,
    }));
  }, [yearlyComparison, currentYear]);

  // Summary stats
  const summary = useMemo(() => {
    if (!data?.movements) return { entradas: 0, saidas: 0, totalEntrada: 0, totalSaida: 0 };
    let entradas = 0, saidas = 0, totalEntrada = 0, totalSaida = 0;
    data.movements.forEach((m: any) => {
      if (m.movement.type === "entrada") { entradas++; totalEntrada += m.movement.quantity; }
      else { saidas++; totalSaida += m.movement.quantity; }
    });
    return { entradas, saidas, totalEntrada, totalSaida };
  }, [data]);

  // Prepare chart data
  const chartDataByType = useMemo(() => {
    if (!data?.movements) return [];
    const entrada = data.movements.filter((m: any) => m.movement.type === "entrada").length;
    const saida = data.movements.filter((m: any) => m.movement.type === "saida").length;
    return [
      { name: "Entrada", value: entrada, fill: "#10b981" },
      { name: "Saída", value: saida, fill: "#ef4444" },
    ];
  }, [data]);

  const chartDataByPrinter = useMemo(() => {
    if (!data?.movements) return [];
    const printerMap: Record<string, number> = {};
    data.movements.forEach((m: any) => {
      printerMap[m.printerName] = (printerMap[m.printerName] || 0) + m.movement.quantity;
    });
    // Cores únicas para cada impressora
    const printerColors: Record<string, string> = {
      "Epson L3150": "#4A90E2",
      "Epson P5000": "#7B68EE",
      "Epson PLOTTER": "#50C878",
    };
    return Object.entries(printerMap).map(([name, value]) => ({
      name,
      value,
      fill: printerColors[name] || "#8884d8",
    }));
  }, [data]);

  const chartDataBySupply = useMemo(() => {
    if (!data?.movements) return [];
    const supplyMap: Record<string, number> = {};
    data.movements.forEach((m: any) => {
      supplyMap[m.supplyName] = (supplyMap[m.supplyName] || 0) + m.movement.quantity;
    });
    return Object.entries(supplyMap)
      .map(([name, value]) => ({ name, value, fill: getColorFromPalette(name) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data]);

  const chartDataBySupplyP5000 = useMemo(() => {
    if (!data?.movements) return [];
    const supplyMap: Record<string, { value: number; daysToConsume: number | null }> = {};
    const now = Date.now();
    const startDate = now - (top10PeriodDays * 24 * 60 * 60 * 1000);
    
    data.movements
      .filter((m: any) => m.printerName.includes("P5000") && m.movement.movementDate >= startDate)
      .forEach((m: any) => {
        if (!supplyMap[m.supplyName]) supplyMap[m.supplyName] = { value: 0, daysToConsume: null };
        supplyMap[m.supplyName].value += m.movement.quantity;
      });
    
    // Get days to consume from timeToConsume1Unit
    if (timeToConsume1Unit) {
      timeToConsume1Unit.forEach((item: any) => {
        if (item.printerName.includes("P5000") && supplyMap[item.supplyName]) {
          supplyMap[item.supplyName].daysToConsume = item.daysToConsume1Unit;
        }
      });
    }
    
    return Object.entries(supplyMap)
      .map(([name, { value, daysToConsume }]) => ({
        name,
        value,
        daysToConsume,
        fill: daysToConsume !== null && daysToConsume <= 7 ? '#ef4444' : getColorFromPalette(name),
        isCritical: daysToConsume !== null && daysToConsume <= 7
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data, top10PeriodDays, timeToConsume1Unit]);

  const chartDataBySupplyPlotter = useMemo(() => {
    if (!data?.movements) return [];
    const supplyMap: Record<string, { value: number; daysToConsume: number | null }> = {};
    const now = Date.now();
    const startDate = now - (top10PeriodDays * 24 * 60 * 60 * 1000);
    
    data.movements
      .filter((m: any) => m.printerName.includes("PLOTTER") && m.movement.movementDate >= startDate)
      .forEach((m: any) => {
        if (!supplyMap[m.supplyName]) supplyMap[m.supplyName] = { value: 0, daysToConsume: null };
        supplyMap[m.supplyName].value += m.movement.quantity;
      });
    
    // Get days to consume from timeToConsume1Unit
    if (timeToConsume1Unit) {
      timeToConsume1Unit.forEach((item: any) => {
        if (item.printerName.includes("PLOTTER") && supplyMap[item.supplyName]) {
          supplyMap[item.supplyName].daysToConsume = item.daysToConsume1Unit;
        }
      });
    }
    
    return Object.entries(supplyMap)
      .map(([name, { value, daysToConsume }]) => ({
        name,
        value,
        daysToConsume,
        fill: daysToConsume !== null && daysToConsume <= 7 ? '#ef4444' : getColorFromPalette(name),
        isCritical: daysToConsume !== null && daysToConsume <= 7
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [data, top10PeriodDays, timeToConsume1Unit]);

  const paperConsumption = useMemo(() => {
    if (!data?.movements) return [];
    const paperMap: Record<string, { p5000: number; plotter: number; fill: string }> = {};
    data.movements
      .filter((m: any) => m.supplyType === "papel" && m.movement.type === "saida")
      .forEach((m: any) => {
        if (!paperMap[m.supplyName]) paperMap[m.supplyName] = { p5000: 0, plotter: 0, fill: getColorFromPalette(m.supplyName) };
        if (m.printerName.includes("P5000")) paperMap[m.supplyName].p5000 += m.movement.quantity;
        else if (m.printerName.includes("PLOTTER")) paperMap[m.supplyName].plotter += m.movement.quantity;
      });
    return Object.entries(paperMap).map(([name, { p5000, plotter, fill }]) => ({ name: truncateSupplyName(name), originalName: name, p5000, plotter, fill }));
  }, [data]);


  function exportCSV() {
    if (!data?.movements?.length) { toast.error("Nenhum dado para exportar"); return; }
    const headers = ["Data/Hora", "Tipo", "Insumo", "Código", "Impressora", "Cor", "Quantidade", "Estoque Anterior", "Estoque Novo", "Usuário", "Observações"];
    const rows = data.movements.map((m: any) => [
      formatDate(m.movement.movementDate),
      m.movement.type === "entrada" ? "Entrada" : "Saída",
      m.supplyName, m.supplyCode || "", m.printerName, m.supplyColor || "",
      m.movement.quantity, m.movement.previousStock, m.movement.newStock, m.userName || "", m.movement.notes || "",
    ]);
    const csvContent = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-estoque-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso");
  }

  async function exportExcel() {
    if (!data?.movements?.length) { toast.error("Nenhum dado para exportar"); return; }
    setExportingExcel(true);
    try {
      const response = await excelMutation.mutateAsync({
        movements: data.movements,
        summary,
        yearlyComparison,
        timeToConsume1Unit: timeToConsume1Unit || [],
      });
      if ((response as any).url) {
        const link = document.createElement("a");
        link.href = (response as any).url;
        link.download = `relatorio-estoque-${new Date().toISOString().slice(0, 10)}.xlsx`;
        link.click();
        toast.success("Excel gerado com sucesso");
      }
    } catch (error) {
      toast.error("Erro ao gerar Excel");
    } finally {
      setExportingExcel(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBarChart className="h-6 w-6 text-primary" />
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">Gere relatórios de movimentação com gráficos e exportação</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setShowCharts(!showCharts)} variant={showCharts ? "default" : "outline"} disabled={!data?.movements?.length}>
            <FileBarChart className="h-4 w-4 mr-2" />{showCharts ? "Ocultar Gráficos" : "Mostrar Gráficos"}
          </Button>
          <Button onClick={exportCSV} disabled={!data?.movements?.length || !canView("reports")}>
            <Download className="h-4 w-4 mr-2" />Exportar CSV
          </Button>
          <Button onClick={exportExcel} disabled={!data?.movements?.length || exportingExcel || !canView("reports")} variant="outline" className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200">
            <FileBarChart className="h-4 w-4 mr-2" />{exportingExcel ? "Gerando..." : "Exportar Excel"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-violet-600" />
            Filtros Avançados
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Customize seu relatório selecionando impressora, tipo de movimento e período</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="font-semibold">Empresa</Label>
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="border-violet-200"><SelectValue placeholder="Selecione uma empresa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Empresas</SelectItem>
                  <SelectItem value="1">Studiolaser</SelectItem>
                  <SelectItem value="2">CHIC</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Impressora</Label>
              <Select value={printerId} onValueChange={setPrinterId}>
                <SelectTrigger className="border-violet-200"><SelectValue placeholder="Selecione uma impressora" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Impressoras</SelectItem>
                  {printers?.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({p.model})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Tipo de Movimento</Label>
              <Select value={movType} onValueChange={setMovType}>
                <SelectTrigger className="border-violet-200"><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Movimentos</SelectItem>
                  <SelectItem value="entrada">Apenas Entradas</SelectItem>
                  <SelectItem value="saida">Apenas Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Data de Início</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border-violet-200" placeholder="Selecione a data inicial" />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Data de Término</Label>
              <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border-violet-200" placeholder="Selecione a data final" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="bg-violet-100 text-violet-700 p-3 rounded-md text-sm">
              <p className="font-semibold mb-1">Dica:</p>
              <p>Use o filtro de empresa para visualizar estoque separado por Studiolaser e CHIC. Os filtros são aplicados automaticamente aos gráficos e às exportações.</p>
            </div>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline" className="ml-4 border-violet-300 text-violet-600 hover:bg-violet-50">
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center"><ArrowDownToLine className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-2xl font-bold">{summary.entradas}</p><p className="text-xs text-muted-foreground">Entradas</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center"><ArrowUpFromLine className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-2xl font-bold">{summary.saidas}</p><p className="text-xs text-muted-foreground">Saídas</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center"><ArrowDownToLine className="h-5 w-5 text-emerald-600" /></div>
              <div><p className="text-2xl font-bold">{summary.totalEntrada}</p><p className="text-xs text-muted-foreground">Total Entradas (un)</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center"><ArrowUpFromLine className="h-5 w-5 text-red-600" /></div>
              <div><p className="text-2xl font-bold">{summary.totalSaida}</p><p className="text-xs text-muted-foreground">Total Saídas (un)</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time to Consume 1 Unit Section */}
      {Object.keys(timeToConsumeByPrinter).length > 0 && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-transparent">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Tempo para Consumir 1 Unidade de Papel
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Estimativa de dias para consumir 1 caixa/rolo de papel por impressora</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Período de Análise</Label>
                <Select value={String(timeToConsumePeriodDays)} onValueChange={(val) => setTimeToConsumePeriodDays(Number(val))}>
                  <SelectTrigger className="w-32 border-blue-200 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="60">Últimos 60 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="180">Últimos 180 dias</SelectItem>
                    <SelectItem value="365">Últimos 365 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(timeToConsumeByPrinter).map(([printerName, items]: [string, any]) => {
                const avgDays = items.reduce((sum: number, item: any) => sum + (item.daysToConsume1Unit || 0), 0) / items.length;
                const urgency = getUrgencyLevel(avgDays);
                const UrgencyIcon = urgency.icon;
                
                return (
                  <Card key={printerName} className={`border-2 ${urgency.bgColor}`}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-sm">{printerName}</p>
                            <p className="text-xs text-muted-foreground mt-1">{items.length} tipo(s) de papel</p>
                          </div>
                          <div className={`p-2 rounded-lg ${urgency.bgColor}`}>
                            <UrgencyIcon className={`h-5 w-5 ${urgency.color}`} />
                          </div>
                        </div>
                        <div className="border-t pt-3">
                          <p className="text-2xl font-bold text-center">{Math.round(avgDays)}</p>
                          <p className="text-xs text-center text-muted-foreground mt-1">dias em média</p>
                        </div>
                        <div className={`px-3 py-2 rounded-md text-center text-sm font-semibold ${urgency.color}`}>
                          {urgency.label}
                        </div>
                        <div className="space-y-1 text-xs">
                          {items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center py-1 border-t">
                              <span className="text-muted-foreground truncate">{truncateSupplyName(item.supplyName)}</span>
                              <span className="font-semibold">{item.daysToConsume1Unit || '-'} dias</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      {data?.movements && data.movements.length > 0 && (
        <div className="flex flex-col gap-6 w-full">
          <Card>
            <CardHeader><CardTitle className="text-lg">Distribuição por Tipo</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={chartDataByType} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100} fill="#8884d8" dataKey="value">
                    {chartDataByType.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Consumo por Impressora</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartDataByPrinter}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={4}>
                    {chartDataByPrinter.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Top 10 Insumos Mais Movimentados</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartDataBySupply} layout="vertical" margin={{ top: 5, right: 10, left: 200, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: "Quantidade", position: "insideBottomRight", offset: -5 }} />
                  <YAxis dataKey="name" type="category" width={190} tick={{ fontSize: 12 }} label={{ value: "Insumo", angle: -90, position: "insideLeft" }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={4}>
                    {chartDataBySupply.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Top 10 Insumos - P5000</CardTitle>
                <Select value={String(top10PeriodDays)} onValueChange={(val) => setTop10PeriodDays(Number(val))}>
                  <SelectTrigger className="w-40 border-blue-200 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="60">Últimos 60 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="180">Últimos 180 dias</SelectItem>
                    <SelectItem value="365">Últimos 365 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={chartDataBySupplyP5000} layout="vertical" margin={{ top: 5, right: 10, left: 250, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: "Quantidade", position: "insideBottomRight", offset: -5 }} />
                  <YAxis dataKey="name" type="category" width={240} tick={{ fontSize: 11 }} label={{ value: "Insumo", angle: -90, position: "insideLeft" }} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-xs">
                          <p className="font-semibold">{data.name}</p>
                          <p>Quantidade: {data.value}</p>
                          {data.daysToConsume !== null && <p>Dias para consumir: {Math.round(data.daysToConsume)}</p>}
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartDataBySupplyP5000.map((entry: any, index: number) => (
                      <Cell key={`cell-p5000-${index}`} fill={entry.fill} stroke={entry.isCritical ? '#991b1b' : 'none'} strokeWidth={entry.isCritical ? 2 : 0} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Top 10 Insumos - PLOTTER</CardTitle>
                <Select value={String(top10PeriodDays)} onValueChange={(val) => setTop10PeriodDays(Number(val))}>
                  <SelectTrigger className="w-40 border-blue-200 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="60">Últimos 60 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="180">Últimos 180 dias</SelectItem>
                    <SelectItem value="365">Últimos 365 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={chartDataBySupplyPlotter} layout="vertical" margin={{ top: 5, right: 10, left: 250, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" label={{ value: "Quantidade", position: "insideBottomRight", offset: -5 }} />
                  <YAxis dataKey="name" type="category" width={240} tick={{ fontSize: 11 }} label={{ value: "Insumo", angle: -90, position: "insideLeft" }} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload?.[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2 border border-gray-300 rounded shadow-md text-xs">
                          <p className="font-semibold">{data.name}</p>
                          <p>Quantidade: {data.value}</p>
                          {data.daysToConsume !== null && <p>Dias para consumir: {Math.round(data.daysToConsume)}</p>}
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {chartDataBySupplyPlotter.map((entry: any, index: number) => (
                      <Cell key={`cell-plotter-${index}`} fill={entry.fill} stroke={entry.isCritical ? '#991b1b' : 'none'} strokeWidth={entry.isCritical ? 2 : 0} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Média de Consumo Diário - Movido para antes do Comparativo */}
      <Card>
        <CardHeader>
          <CardTitle>Média de Consumo Diário por Impressora</CardTitle>
        </CardHeader>
        <CardContent>
          <DailyAverageChart />
        </CardContent>
      </Card>

      {/* Period Selector for Comparison Charts */}
      {data?.movements && data.movements.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-lg">Período para Comparativo</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label>Mostrar últimos:</Label>
                  <Select value={comparisonMonthsBack.toString()} onValueChange={(v) => setComparisonMonthsBack(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 meses</SelectItem>
                      <SelectItem value="6">6 meses</SelectItem>
                      <SelectItem value="12">12 meses (1 ano)</SelectItem>
                      <SelectItem value="24">24 meses (2 anos)</SelectItem>
                      <SelectItem value="36">36 meses (3 anos)</SelectItem>
                      <SelectItem value="48">48 meses (4 anos)</SelectItem>
                      <SelectItem value="60">60 meses (5 anos)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {chartDataPaperP5000.length > 0 && (chartSupplyTypeFilter === "all" || chartSupplyTypeFilter === "papel") && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Comparativo - Papel P5000 (caixas)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartDataPaperP5000}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: "Quantidade (caixas)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={String(currentYear)} fill="#3b82f6" name={`${currentYear} (Atual)`} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={String(currentYear - 1)} fill="#9ca3af" name={`${currentYear - 1} (Anterior)`} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {chartDataPaperPlotter.length > 0 && (chartSupplyTypeFilter === "all" || chartSupplyTypeFilter === "papel") && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Comparativo - Papel PLOTTER (rolos)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartDataPaperPlotter}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: "Quantidade (rolos)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={String(currentYear)} fill="#10b981" name={`${currentYear} (Atual)`} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={String(currentYear - 1)} fill="#d1d5db" name={`${currentYear - 1} (Anterior)`} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {chartDataCartridgesP5000.length > 0 && (chartSupplyTypeFilter === "all" || chartSupplyTypeFilter === "cartucho") && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Comparativo - Cartuchos P5000</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartDataCartridgesP5000}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: "Quantidade (un)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={String(currentYear)} fill="#f59e0b" name={`${currentYear} (Atual)`} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={String(currentYear - 1)} fill="#e5e7eb" name={`${currentYear - 1} (Anterior)`} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {chartDataCartridgesPlotter.length > 0 && (chartSupplyTypeFilter === "all" || chartSupplyTypeFilter === "cartucho") && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Comparativo - Cartuchos PLOTTER</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartDataCartridgesPlotter}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis label={{ value: "Quantidade (un)", angle: -90, position: "insideLeft" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey={String(currentYear)} fill="#ec4899" name={`${currentYear} (Atual)`} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={String(currentYear - 1)} fill="#f3f4f6" name={`${currentYear - 1} (Anterior)`} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Stock Prediction */}
      {canView('reports') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Previsão de Estoque Crítico</CardTitle>
              <div className="flex gap-2 items-center">
                <Label htmlFor="prediction-days">Próximos dias:</Label>
                <Select value={String(predictionDaysAhead)} onValueChange={(v) => setPredictionDaysAhead(Number(v))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 dias</SelectItem>
                    <SelectItem value="14">14 dias</SelectItem>
                    <SelectItem value="30">30 dias</SelectItem>
                    <SelectItem value="60">60 dias</SelectItem>
                    <SelectItem value="90">90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingPredictions ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : predictions && predictions.length > 0 ? (
              <div className="space-y-3">
                {predictions.slice(0, 5).map((pred: any) => {
                  const urgency = pred.daysUntilCritical <= 7 ? 'critical' : pred.daysUntilCritical <= 30 ? 'warning' : 'safe';
                  const colors = {
                    critical: 'bg-red-50 border-red-200',
                    warning: 'bg-yellow-50 border-yellow-200',
                    safe: 'bg-green-50 border-green-200',
                  };
                  return (
                    <div key={pred.supplyId} className={`p-3 border rounded-lg ${colors[urgency]}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">Insumo ID: {pred.supplyId}</p>
                          <p className="text-sm text-gray-600">Consumo diário: {pred.predictedDailyConsumption.toFixed(2)} un</p>
                          <p className="text-sm text-gray-600">Estoque atual: {pred.currentStock} un (mín: {pred.minStock})</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{pred.daysUntilCritical} dias</p>
                          <p className="text-xs text-gray-600">até crítico</p>
                          <p className="text-xs text-gray-500">{new Date(pred.estimatedCriticalDate).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">Nenhuma previsão disponível</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interactive Charts */}
      {showCharts && data?.movements && data.movements.length > 0 && (
        <div className="space-y-6">
          <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-transparent">
            <CardHeader>
              <CardTitle className="text-sm">Filtros dos Gráficos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="chart-printer">Impressora</Label>
                  <Select value={chartPrinterFilter} onValueChange={setChartPrinterFilter}>
                    <SelectTrigger id="chart-printer">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {printers?.map(p => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="chart-supply">Tipo de Insumo</Label>
                  <Select value={chartSupplyTypeFilter} onValueChange={setChartSupplyTypeFilter}>
                    <SelectTrigger id="chart-supply">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="papel">Papéis</SelectItem>
                      <SelectItem value="cartucho">Cartuchos</SelectItem>
                      <SelectItem value="tanque_manutencao">Tanques</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="chart-start">Data Início</Label>
                  <Input
                    id="chart-start"
                    type="date"
                    value={chartStartDate}
                    onChange={(e) => setChartStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="chart-end">Data Fim</Label>
                  <Input
                    id="chart-end"
                    type="date"
                    value={chartEndDate}
                    onChange={(e) => setChartEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <ReportCharts 
            movements={data.movements} 
            isLoading={isLoading}
            printerFilter={chartPrinterFilter}
            supplyTypeFilter={chartSupplyTypeFilter === "all" ? undefined : chartSupplyTypeFilter}
            startDate={chartStartDate ? new Date(chartStartDate).getTime() : undefined}
            endDate={chartEndDate ? new Date(chartEndDate + "T23:59:59").getTime() : undefined}
          />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Movimentações ({data?.total ?? 0})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
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
                  <TableHead className="text-center">Anterior</TableHead>
                  <TableHead className="text-center">Novo</TableHead>
                  <TableHead>Usuário</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.movements.map((m: any) => (
                  <TableRow key={m.movement.id}>
                    <TableCell className="text-sm whitespace-nowrap">{formatDate(m.movement.movementDate)}</TableCell>
                    <TableCell>
                      <Badge variant={m.movement.type === "entrada" ? "default" : "destructive"} className={m.movement.type === "entrada" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""}>
                        {m.movement.type === "entrada" ? "Entrada" : "Saída"}
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
                    <TableCell className="text-center font-medium">{m.movement.type === "entrada" ? "+" : "-"}{m.movement.quantity}</TableCell>
                    <TableCell className="text-center text-muted-foreground">{m.movement.previousStock}</TableCell>
                    <TableCell className="text-center font-medium">{m.movement.newStock}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.userName || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileBarChart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma movimentação para o período selecionado</p>
            </div>
          )}
        </CardContent>
      </Card>


    </div>
  );
}


export default function ReportsPage() {
  return (
    <PermissionGuard module="reports" action="view">
      <ReportsPageContent />
    </PermissionGuard>
  );
}


function DailyAverageChart() {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [supplyTypeFilter, setSupplyTypeFilter] = useState<string>("all");
  
  const startTime = startDate ? new Date(startDate).getTime() : undefined;
  const endTime = endDate ? new Date(endDate + "T23:59:59").getTime() : undefined;
  
  const { data: averageData, isLoading } = trpc.reports.getDailyAverageConsumption.useQuery(
    { startDate: startTime, endDate: endTime, supplyType: supplyTypeFilter !== "all" ? (supplyTypeFilter as "papel" | "cartucho" | "tanque") : undefined },
    { enabled: true }
  );
  
  if (isLoading) return <Skeleton className="h-80" />;
  if (!averageData?.length) return <p className="text-muted-foreground">Sem dados disponíveis</p>;
  
  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap items-end">
        <div>
          <Label>Data Início</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label>Data Fim</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div>
          <Label>Tipo de Insumo</Label>
          <Select value={supplyTypeFilter} onValueChange={setSupplyTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="papel">Papéis</SelectItem>
              <SelectItem value="cartucho">Cartuchos</SelectItem>
              <SelectItem value="tanque">Tanques</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={averageData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis label={{ value: "Consumo Diário Médio", angle: -90, position: "insideLeft" }} />
          <Tooltip formatter={(value) => (value as number)?.toFixed(2)} />
          <Bar dataKey="dailyAverage" fill="#8884d8" name="Consumo Diário Médio" />
        </BarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-4">
        {averageData.map((item: any) => (
          <Card key={item.name}>
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-muted-foreground">{item.name}</div>
              <div className="text-2xl font-bold mt-2">{item.dailyAverage.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-1">Consumo diário médio</div>
              <div className="text-xs text-muted-foreground">Total: {item.total} un | {item.daysInPeriod} dias</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
