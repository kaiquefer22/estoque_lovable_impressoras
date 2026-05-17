/**
 * Chart Data Generator
 * Gera dados estruturados para visualização em tabelas Excel
 * Sem dependência de Canvas - usa dados formatados em abas separadas
 */

export interface ChartData {
  labels: string[];
  data: number[];
  title: string;
}

export interface BarChartData {
  labels: string[];
  data: number[];
  title: string;
  yAxisLabel: string;
}

export interface LineChartData {
  labels: string[];
  datasets: Array<{ label: string; data: number[] }>;
  title: string;
  yAxisLabel: string;
}

/**
 * Gera dados para gráfico de pizza (consumo por insumo)
 */
export function generatePieChartData(movements: any[]): ChartData {
  const supplyConsumption: any = {};
  
  movements.forEach((m: any) => {
    const name = m.supplyName;
    supplyConsumption[name] = (supplyConsumption[name] || 0) + m.movement.quantity;
  });

  return {
    labels: Object.keys(supplyConsumption),
    data: Object.values(supplyConsumption) as number[],
    title: 'Consumo por Insumo'
  };
}

/**
 * Gera dados para gráfico de barras (movimentações por tipo)
 */
export function generateBarChartData(movements: any[]): BarChartData {
  const movementTypes: any = { 'Entrada': 0, 'Saída': 0 };
  
  movements.forEach((m: any) => {
    movementTypes[m.movement.type] = (movementTypes[m.movement.type] || 0) + m.movement.quantity;
  });

  return {
    labels: Object.keys(movementTypes),
    data: Object.values(movementTypes) as number[],
    title: 'Movimentações por Tipo',
    yAxisLabel: 'Quantidade'
  };
}

/**
 * Gera dados para gráfico de linhas (tendências mensais)
 */
export function generateLineChartData(movements: any[]): LineChartData {
  const monthlyData: any = {};
  
  movements.forEach((m: any) => {
    const date = new Date(m.movement.createdAt);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { entrada: 0, saída: 0 };
    }
    
    if (m.movement.type === 'Entrada') {
      monthlyData[monthKey].entrada += m.movement.quantity;
    } else {
      monthlyData[monthKey].saída += m.movement.quantity;
    }
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  
  return {
    labels: sortedMonths,
    datasets: [
      {
        label: 'Entrada',
        data: sortedMonths.map(m => monthlyData[m].entrada)
      },
      {
        label: 'Saída',
        data: sortedMonths.map(m => monthlyData[m].saída)
      }
    ],
    title: 'Tendências Mensais de Movimentação',
    yAxisLabel: 'Quantidade'
  };
}

/**
 * Gera dados para gráfico de consumo por impressora
 */
export function generatePrinterConsumptionData(movements: any[]): ChartData {
  const printerConsumption: any = {};
  
  movements.forEach((m: any) => {
    const printer = m.printerName || 'Sem impressora';
    printerConsumption[printer] = (printerConsumption[printer] || 0) + m.movement.quantity;
  });

  return {
    labels: Object.keys(printerConsumption),
    data: Object.values(printerConsumption) as number[],
    title: 'Consumo por Impressora'
  };
}

/**
 * Formata dados para exibição em tabela Excel
 */
export function formatChartDataForTable(chartData: ChartData): Array<{ label: string; value: number; percentage: string }> {
  const total = chartData.data.reduce((a, b) => a + b, 0);
  
  return chartData.labels.map((label, idx) => ({
    label,
    value: chartData.data[idx],
    percentage: total > 0 ? ((chartData.data[idx] / total) * 100).toFixed(1) + '%' : '0%'
  }));
}

/**
 * Formata dados de barras para tabela Excel
 */
export function formatBarChartDataForTable(chartData: BarChartData): Array<{ category: string; quantity: number; percentage: string }> {
  const total = chartData.data.reduce((a, b) => a + b, 0);
  
  return chartData.labels.map((label, idx) => ({
    category: label,
    quantity: chartData.data[idx],
    percentage: total > 0 ? ((chartData.data[idx] / total) * 100).toFixed(1) + '%' : '0%'
  }));
}

/**
 * Formata dados de linhas para tabela Excel
 */
export function formatLineChartDataForTable(chartData: LineChartData): Array<{ period: string; [key: string]: string | number }> {
  return chartData.labels.map((label, idx) => {
    const row: any = { period: label };
    chartData.datasets.forEach(dataset => {
      row[dataset.label] = dataset.data[idx];
    });
    return row;
  });
}
