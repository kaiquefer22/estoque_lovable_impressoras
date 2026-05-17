import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

export default function ScheduledReportsPage() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'weekly',
    dayOfWeek: 0,
    dayOfMonth: 1,
    time: '09:00',
    recipientEmails: [''],
    includeGraphs: true,
  });

  const { data: reports = [], refetch } = trpc.scheduledReports.list.useQuery();
  const createMutation = trpc.scheduledReports.create.useMutation();
  const deleteMutation = trpc.scheduledReports.delete.useMutation();

  const handleAddEmail = () => {
    setFormData({
      ...formData,
      recipientEmails: [...formData.recipientEmails, ''],
    });
  };

  const handleEmailChange = (index: number, value: string) => {
    const emails = [...formData.recipientEmails];
    emails[index] = value;
    setFormData({ ...formData, recipientEmails: emails });
  };

  const handleRemoveEmail = (index: number) => {
    const emails = formData.recipientEmails.filter((_, i) => i !== index);
    setFormData({ ...formData, recipientEmails: emails });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        ...formData,
        frequency: formData.frequency as 'weekly' | 'monthly' | 'custom',
        recipientEmails: formData.recipientEmails.filter(e => e.trim()),
      });
      toast.success('Agendamento criado com sucesso!');
      setFormData({
        name: '',
        description: '',
        frequency: 'weekly',
        dayOfWeek: 0,
        dayOfMonth: 1,
        time: '09:00',
        recipientEmails: [''],
        includeGraphs: true,
      });
      refetch();
    } catch (err) {
      toast.error('Erro ao criar agendamento');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success('Agendamento deletado');
      refetch();
    } catch (err) {
      toast.error('Erro ao deletar agendamento');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Agendamento de Relatórios</h1>
        <p className="text-muted-foreground">Configure envios automáticos de relatórios por e-mail</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Novo Agendamento</CardTitle>
            <CardDescription>Configure um novo relatório automático</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome do Agendamento</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Relatório Semanal"
                  required
                />
              </div>

              <div>
                <Label>Descrição (opcional)</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do relatório"
                />
              </div>

              <div>
                <Label>Frequência</Label>
                <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="custom">Customizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.frequency === 'weekly' && (
                <div>
                  <Label>Dia da Semana</Label>
                  <Select value={formData.dayOfWeek.toString()} onValueChange={(value) => setFormData({ ...formData, dayOfWeek: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Domingo</SelectItem>
                      <SelectItem value="1">Segunda</SelectItem>
                      <SelectItem value="2">Terça</SelectItem>
                      <SelectItem value="3">Quarta</SelectItem>
                      <SelectItem value="4">Quinta</SelectItem>
                      <SelectItem value="5">Sexta</SelectItem>
                      <SelectItem value="6">Sábado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.frequency === 'monthly' && (
                <div>
                  <Label>Dia do Mês</Label>
                  <Input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                  />
                </div>
              )}

              <div>
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>E-mails Destinatários</Label>
                {formData.recipientEmails.map((email, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(idx, e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                    {formData.recipientEmails.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveEmail(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddEmail}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar E-mail
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="graphs"
                  checked={formData.includeGraphs}
                  onCheckedChange={(checked) => setFormData({ ...formData, includeGraphs: checked as boolean })}
                />
                <Label htmlFor="graphs" className="font-normal">Incluir gráficos no relatório</Label>
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Agendamento'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Lista de Agendamentos */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos Ativos</CardTitle>
              <CardDescription>{reports.length} agendamento(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhum agendamento configurado</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((report: any) => (
                    <div key={report.id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {report.frequency === 'weekly' && `Toda ${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][report.dayOfWeek]} às ${report.time}`}
                          {report.frequency === 'monthly' && `Dia ${report.dayOfMonth} de cada mês às ${report.time}`}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(report.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
