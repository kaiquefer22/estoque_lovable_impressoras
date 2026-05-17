import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import PermissionGuard from "@/components/PermissionGuard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Printer } from "lucide-react";
import { getPrinterImage } from "@shared/images";
import { ImageUpload } from "@/components/ImageUpload";

function PrintersPageContent() {
  const { canCreate, canEdit, canDelete } = useUserPermissions();
  const utils = trpc.useUtils();
  const { data: printers, isLoading } = trpc.printers.list.useQuery();
  const createMutation = trpc.printers.create.useMutation({
    onSuccess: () => { utils.printers.list.invalidate(); toast.success("Impressora cadastrada com sucesso"); setOpen(false); resetForm(); },
    onError: (e) => {
      const msg = e.message.includes("permiss") ? "Você não tem permissão para cadastrar impressoras" : e.message;
      toast.error(msg);
    },
  });
  const updateMutation = trpc.printers.update.useMutation({
    onSuccess: () => { utils.printers.list.invalidate(); toast.success("Impressora atualizada"); setEditOpen(false); },
    onError: (e) => {
      const msg = e.message.includes("permiss") ? "Você não tem permissão para editar impressoras" : e.message;
      toast.error(msg);
    },
  });
  const deleteMutation = trpc.printers.delete.useMutation({
    onSuccess: () => { utils.printers.list.invalidate(); toast.success("Impressora removida"); },
    onError: (e) => {
      const msg = e.message.includes("permiss") ? "Você não tem permissão para deletar impressoras" : e.message;
      toast.error(msg);
    },
  });

  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [brand, setBrand] = useState("Epson");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [editId, setEditId] = useState<number | null>(null);

  function resetForm() { setName(""); setModel(""); setBrand("Epson"); setDescription(""); setImageUrl(null); }

  function handleEdit(p: any) {
    setEditId(p.id); setName(p.name); setModel(p.model); setBrand(p.brand); setDescription(p.description || "");
    setImageUrl(p.imageUrl || null);
    setEditOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Impressoras</h1>
          <p className="text-muted-foreground mt-1">Gerencie os modelos de impressoras cadastrados</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button disabled={!canCreate("printers")}><Plus className="h-4 w-4 mr-2" />Nova Impressora</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar Impressora</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="flex justify-center">
                <ImageUpload
                  currentImageUrl={imageUrl}
                  onImageUploaded={(url) => setImageUrl(url)}
                  onImageRemoved={() => setImageUrl(null)}
                  folder="printers"
                  size="lg"
                  label="Foto da Impressora"
                />
              </div>
              <div className="space-y-2"><Label>Nome</Label><Input placeholder="Ex: Impressora Sala 1" value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Modelo</Label><Input placeholder="Ex: L1110" value={model} onChange={e => setModel(e.target.value)} /></div>
              <div className="space-y-2"><Label>Descrição (opcional)</Label><Input placeholder="Descrição da impressora" value={description} onChange={e => setDescription(e.target.value)} /></div>
              <Button className="w-full" onClick={() => createMutation.mutate({ name, model, imageUrl: imageUrl || undefined })} disabled={!name || !model || createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : printers && printers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {printers.map((p: any) => {
            const image = p.imageUrl || getPrinterImage(p.name, p.model);
            return (
              <Card key={p.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                  {image ? (
                    <img src={image} alt={p.name} className="h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <Printer className="h-20 w-20 text-muted-foreground/20" />
                  )}
                  <div className="absolute top-3 right-3 flex gap-1">
                    <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm bg-white/90 hover:bg-white" disabled={!canEdit("printers")} onClick={() => handleEdit(p)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="secondary" size="icon" className="h-8 w-8 shadow-sm bg-white/90 hover:bg-white text-destructive hover:text-destructive" disabled={!canDelete("printers")} onClick={() => { if (confirm("Remover esta impressora?")) deleteMutation.mutate({ id: p.id }); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-lg">{p.name}</h3>
                      <p className="text-sm text-muted-foreground mt-0.5">{p.model}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">{p.brand}</Badge>
                  </div>
                  {p.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{p.description}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Printer className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-1">Nenhuma impressora cadastrada</h3>
          <p className="text-sm text-muted-foreground">Clique em "Nova Impressora" para começar</p>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) resetForm(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Impressora</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex justify-center">
              <ImageUpload
                currentImageUrl={imageUrl}
                onImageUploaded={(url) => setImageUrl(url)}
                onImageRemoved={() => setImageUrl(null)}
                folder="printers"
                size="lg"
                label="Foto da Impressora"
              />
            </div>
            <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Modelo</Label><Input value={model} onChange={e => setModel(e.target.value)} /></div>
            <div className="space-y-2"><Label>Marca</Label><Input value={brand} onChange={e => setBrand(e.target.value)} /></div>
            <div className="space-y-2"><Label>Descrição</Label><Input value={description} onChange={e => setDescription(e.target.value)} /></div>
            <Button className="w-full" onClick={() => updateMutation.mutate({ id: editId!, name, model, imageUrl: imageUrl || undefined })} disabled={!name || !model || updateMutation.isPending}>
              {updateMutation.isPending ? "Salvando..." : "Atualizar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PrintersPage() {
  return (
    <PermissionGuard module="printers" action="view">
      <PrintersPageContent />
    </PermissionGuard>
  );
}
