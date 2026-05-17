import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Registrar plugins do Chart.js
ChartJS.register(ArcElement, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface Movement {
  supplyName: string;
  printerName?: string;
  movement: {
    type: 'entrada' | 'saida' | 'Entrada' | 'Saída';
    quantity: number;
    movementDate?: number;
    createdAt?: Date | number;
  };
}

interface ReportChartsProps {
  movements: Movement[];
  isLoading?: boolean;
  printerFilter?: string;
  startDate?: number;
  endDate?: number;
  supplyTypeFilter?: string;
}

export function ReportCharts({ movements, isLoading = false, printerFilter, startDate, endDate, supplyTypeFilter }: ReportChartsProps) {
  // Filtrar movimentações conforme os filtros
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Filtro por impressora
      if (printerFilter && printerFilter !== 'all') {
        if (!m.printerName?.includes(printerFilter)) return false;
      }
      
      // Filtro por período
      const timestamp = m.movement.movementDate || (typeof m.movement.createdAt === 'number' ? m.movement.createdAt : m.movement.createdAt?.getTime());
      if (startDate && timestamp && timestamp < startDate) return false;
      if (endDate && timestamp && timestamp > endDate) return false;
      
      // Filtro por tipo de insumo
      if (supplyTypeFilter && supplyTypeFilter !== 'all') {
        if (!m.supplyName?.toLowerCase().includes(supplyTypeFilter.toLowerCase())) return false;
      }
      
      return true;
    });
  }, [movements, printerFilter, startDate, endDate, supplyTypeFilter]);

  // Dados para gráfico de pizza - Consumo por Insumo
  const pieData = useMemo(() => {
    const supplyConsumption: Record<string, number> = {};
    filteredMovements.forEach((m) => {
      const name = m.supplyName;
      supplyConsumption[name] = (supplyConsumption[name] || 0) + m.movement.quantity;
    });

    const labels = Object.keys(supplyConsumption);
    const data = Object.values(supplyConsumption);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: [
            '#FF6366F1',
            '#FF9C27B0',
            '#FF3F51B5',
            '#FF2196F3',
            '#FF00BCD4',
            '#FF009688',
            '#FF4CAF50',
            '#FF8BC34A',
            '#FFCDDC39',
            '#FFFBC02D',
            '#FFFFA000',
            '#FFFF5722'
          ].slice(0, labels.length),
          borderColor: '#FFFFFF',
          borderWidth: 2,
        }
      ]
    };
  }, [filteredMovements]); // Dados para gráfico de barras - Movimentações por Tipo
  const barData = useMemo(() => {
    const movementTypes: Record<string, number> = { 'Entrada': 0, 'Saída': 0 };
    
    filteredMovements.forEach((m) => {
      movementTypes[m.movement.type] = (movementTypes[m.movement.type] || 0) + m.movement.quantity;
    });

    return {
      labels: Object.keys(movementTypes),
      datasets: [
        {
          label: 'Quantidade',
          data: Object.values(movementTypes),
          backgroundColor: '#FF6366F1',
          borderColor: '#FF6366F1',
          borderWidth: 1,
        }
      ]
    };
  }, [filteredMovements]);

  // Dados para gráfico de linhas - Tendências Mensais
  const lineData = useMemo(() => {
    const monthlyData: Record<string, { entrada: number; saída: number }> = {};
    
    movements.forEach((m) => {
      const timestamp = m.movement.movementDate || (typeof m.movement.createdAt === 'number' ? m.movement.createdAt : m.movement.createdAt?.getTime());
      if (!timestamp) return;
      
      const date = new Date(timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { entrada: 0, saída: 0 };
      }
      
      const type = m.movement.type.toLowerCase();
      if (type === 'entrada') {
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
          data: sortedMonths.map(m => monthlyData[m].entrada),
          borderColor: '#FF4CAF50',
          backgroundColor: '#FF4CAF5020',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#FF4CAF50',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
        },
        {
          label: 'Saída',
          data: sortedMonths.map(m => monthlyData[m].saída),
          borderColor: '#FFFF5722',
          backgroundColor: '#FFFF572220',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: '#FFFF5722',
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
        }
      ]
    };
  }, [filteredMovements]);

  // Dados para gráfico de consumo por impressora
  const printerData = useMemo(() => {
    const printerConsumption: Record<string, number> = {};
    
    movements.forEach((m) => {
      const printer = m.printerName || 'Sem impressora';
      printerConsumption[printer] = (printerConsumption[printer] || 0) + m.movement.quantity;
    });

    const labels = Object.keys(printerConsumption);
    const data = Object.values(printerConsumption);

    return {
      labels,
      datasets: [
        {
          label: 'Consumo (un)',
          data,
          backgroundColor: '#FF2196F3',
          borderColor: '#FF2196F3',
          borderWidth: 1,
        }
      ]
    };
  }, [filteredMovements]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { padding: 15, font: { size: 12 } }
      }
    }
  };

  const pieOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    }
  };

  const barOptions = {
    ...chartOptions,
    indexAxis: 'y' as const,
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantidade'
        }
      }
    }
  };

  const lineOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Quantidade'
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">Nenhum dado disponível para exibir gráficos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Gráfico de Pizza - Consumo por Insumo */}
      <Card>
        <CardHeader>
          <CardTitle>Consumo por Insumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Pie data={pieData} options={pieOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras - Movimentações por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Movimentações por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Bar data={barData} options={barOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Linhas - Tendências Mensais */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Tendências Mensais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line data={lineData} options={lineOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Barras - Consumo por Impressora */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Consumo por Impressora</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Bar data={printerData} options={barOptions} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
