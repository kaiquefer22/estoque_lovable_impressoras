import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
import { toast } from "sonner";
import { getColorStyles } from "@/../../shared/colorMap";
import { ImageUpload } from "@/components/ImageUpload";

function SuppliesPageContent() {
  const { canCreate, canEdit, canDelete } = useUserPermissions();
  const utils = trpc.useUtils();
  const [filterPrinter, setFilterPrinter] = useState<string>("all");
  const { data: printers } = trpc.printers.list.useQuery();
  const { data: suppliesData, isLoading } = trpc.supplies.list.useQuery();

  const createMutation = trpc.supplies.create.useMutation({
    onSuccess: () => { utils.supplies.list.invalidate(); toast.success("Insumo cadastrado"); setOpen(false); resetForm(); },
    onError: (e) => {
      const msg = e.message.includes("permiss") ? "Voce nao tem permissao para cadastrar insumos" : e.message;
      toast.error(msg);
    },
  });
  const updateMutation = trpc.supplies.update.useMutation({
    onSuccess: () => { utils.supplies.list.invalidate(); toast.success("Insumo atualizado"); setEditOpen(false); },
    onError: (e) => {
      const msg = e.message.includes("permiss") ? "Voce nao tem permissao para editar insumos" : e.message;
      toast.error(msg);
    },
  });
  const deleteMutation = trpc.supplies.delete.useMutation({
    onSuccess: () => { utils.supplies.list.invalidate(); toast.success("Insumo removido"); },
    onError: (e) => {
      const msg = e.message.includes("permiss") ? "Voce nao tem permissao para deletar insumos" : e.message;
      toast.error(msg);
    },
  });

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [form, setForm] = useState({ printerId: "", code: "", name: "", color: "", minStock: "1" });

  function resetForm() { setForm({ printerId: "", code: "", name: "", color: "", minStock: "1" }); setImageUrl(null); }

  function handleEdit(s: any) {
    setEditId(s.id);
    setForm({
      printerId: String(s.printerId),
      code: s.code || "",
      name: s.name,
      color: s.color || "",
      minStock: String(s.minStock),
    });
    setImageUrl(s.imageUrl || null);
    setEditOpen(true);
  }

  function handleDelete(id: number) {
    setDeleteId(id);
    setDeleteOpen(true);
  }

  function confirmDelete() {
    if (deleteId) {
      deleteMutation.mutate({ id: deleteId });
      setDeleteOpen(false);
      setDeleteId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insumos</h1>
          <p className="text-muted-foreground">Gerencie cartuchos, papéis e outros insumos</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button disabled={!canCreate("supplies")}><Plus className="h-4 w-4 mr-2" />Novo Insumo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Cadastrar Insumo</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex justify-center">
                <ImageUpload
                  currentImageUrl={imageUrl}
                  onImageUploaded={(url) => setImageUrl(url)}
                  onImageRemoved={() => setImageUrl(null)}
                  folder="supplies"
                  size="md"
                  label="Foto do Insumo"
                />
              </div>
              <div className="space-y-2">
                <Label>Impressora</Label>
                <Select value={form.printerId} onValueChange={v => setForm(f => ({ ...f, printerId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a impressora" /></SelectTrigger>
                  <SelectContent>{printers?.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Código</Label><Input placeholder="Ex: T9131" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Nome</Label><Input placeholder="Ex: Photo Black" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cor</Label><Input placeholder="Ex: Cyan" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Estoque Mínimo</Label><Input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} /></div>
              </div>
              <Button className="w-full" disabled={!form.printerId || !form.name || createMutation.isPending} onClick={() => createMutation.mutate({
                name: form.name,
                code: form.code || "",
                color: form.color || undefined,
                quantity: 0,
                minStock: Number(form.minStock),
                printerIds: form.printerId ? [Number(form.printerId)] : [],
                imageUrl: imageUrl || undefined,
              })}>
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Label>Impressora:</Label>
          <Select value={filterPrinter} onValueChange={setFilterPrinter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {printers?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Supplies Table */}
      <Card>
        <CardHeader><CardTitle>Insumos Cadastrados</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : suppliesData && suppliesData.length > 0 ? (() => {
            const filteredData = filterPrinter === "all" ? suppliesData : suppliesData.filter((s: any) => String(s.printerId) === filterPrinter);
            return filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Imagem</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Impressora</TableHead>
                    <TableHead>Estoque Mín.</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground/40" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{item.code}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        {item.color && (
                          <Badge style={getColorStyles(item.color) || undefined} className="text-xs">
                            {item.color}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{item.printerName}</TableCell>
                      <TableCell>{item.minStock}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Dialog open={editOpen && editId === item.id} onOpenChange={setEditOpen}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={!canEdit("supplies")} onClick={() => handleEdit(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Editar Insumo</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-2">
                              <div className="flex justify-center">
                                <ImageUpload
                                  currentImageUrl={imageUrl}
                                  onImageUploaded={(url) => setImageUrl(url)}
                                  onImageRemoved={() => setImageUrl(null)}
                                  folder="supplies"
                                  size="md"
                                  label="Foto do Insumo"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Impressora</Label>
                                <Select value={form.printerId} onValueChange={v => setForm(f => ({ ...f, printerId: v }))}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>{printers?.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Código</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} /></div>
                                <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><Label>Cor</Label><Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} /></div>
                                <div className="space-y-2"><Label>Estoque Mínimo</Label><Input type="number" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: e.target.value }))} /></div>
                              </div>
                              <Button className="w-full" disabled={updateMutation.isPending} onClick={() => editId && updateMutation.mutate({
                                id: editId,
                                name: form.name,
                                code: form.code || undefined,
                                color: form.color || undefined,
                                minStock: Number(form.minStock),
                                printerIds: form.printerId ? [Number(form.printerId)] : [],
                                imageUrl: imageUrl || undefined,
                              })}>
                                {updateMutation.isPending ? "Salvando..." : "Atualizar"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Dialog open={deleteOpen && deleteId === item.id} onOpenChange={setDeleteOpen}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" disabled={!canDelete("supplies")} onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm">
                            <DialogHeader><DialogTitle>Confirmar Deleção</DialogTitle></DialogHeader>
                            <p className="text-sm text-muted-foreground">Tem certeza que deseja deletar o insumo <strong>{item.name}</strong>? Esta ação não pode ser desfeita.</p>
                            <div className="flex gap-3 justify-end pt-4">
                              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
                              <Button variant="destructive" disabled={deleteMutation.isPending} onClick={confirmDelete}>
                                {deleteMutation.isPending ? "Deletando..." : "Deletar"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum insumo encontrado para esta impressora
            </div>
          );
          })() : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum insumo cadastrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function SuppliesPage() {
  return (
    <PermissionGuard module="supplies" action="view">
      <SuppliesPageContent />
    </PermissionGuard>
  );
}
