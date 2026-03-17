import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Search, Ban, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface EntityRow {
  id: string;
  name: string;
  type: string;
  status: string;
  created_at: string;
  userCount: number;
  subscriptionStatus: string;
  planName: string;
}

export default function AdminEntities() {
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; entity: EntityRow | null }>({
    open: false,
    entity: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchEntities = async () => {
    try {
      const [
        { data: ents },
        { data: accessList },
        { data: subs },
      ] = await Promise.all([
        supabase.from('entities').select('*').order('created_at', { ascending: false }),
        supabase.from('user_entity_access').select('entity_id'),
        supabase.from('subscriptions').select('entity_id, status, plan_name').order('created_at', { ascending: false }),
      ]);

      if (!ents) return;

      const userCountMap = new Map<string, number>();
      accessList?.forEach((a) => {
        userCountMap.set(a.entity_id, (userCountMap.get(a.entity_id) || 0) + 1);
      });

      const subMap = new Map<string, { status: string; plan_name: string }>();
      subs?.forEach((s) => {
        if (!subMap.has(s.entity_id)) subMap.set(s.entity_id, { status: s.status, plan_name: s.plan_name });
      });

      const enriched: EntityRow[] = ents.map((e) => {
        const sub = subMap.get(e.id);
        return {
          ...e,
          status: (e as any).status || 'active',
          userCount: userCountMap.get(e.id) || 0,
          subscriptionStatus: sub?.status || 'sem assinatura',
          planName: sub?.plan_name || '—',
        };
      });

      setEntities(enriched);
    } catch (error) {
      console.error('Error fetching entities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const handleToggleBlock = async () => {
    if (!blockDialog.entity) return;
    setActionLoading(true);

    const entity = blockDialog.entity;
    const newStatus = entity.status === 'blocked' ? 'active' : 'blocked';

    try {
      const { error } = await supabase
        .from('entities')
        .update({ status: newStatus } as any)
        .eq('id', entity.id);

      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_logs' as any).insert({
        admin_id: user?.id,
        action: newStatus === 'blocked' ? 'block_entity' : 'unblock_entity',
        entity_id: entity.id,
        description: `${newStatus === 'blocked' ? 'Bloqueou' : 'Desbloqueou'} empresa "${entity.name}"`,
      });

      toast.success(
        newStatus === 'blocked'
          ? `Empresa "${entity.name}" bloqueada`
          : `Empresa "${entity.name}" desbloqueada`
      );

      setBlockDialog({ open: false, entity: null });
      fetchEntities();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = entities.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case 'blocked':
        return <Badge className="bg-red-100 text-red-800">Bloqueada</Badge>;
      case 'suspended':
        return <Badge className="bg-yellow-100 text-yellow-800">Suspensa</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-muted-foreground">Todas as empresas cadastradas</p>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Usuários</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entity) => (
                  <TableRow key={entity.id}>
                    <TableCell className="font-medium">{entity.name}</TableCell>
                    <TableCell>{entity.type.toUpperCase()}</TableCell>
                    <TableCell>{entity.userCount}</TableCell>
                    <TableCell>{entity.planName}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          entity.subscriptionStatus === 'active'
                            ? 'bg-green-100 text-green-800'
                            : entity.subscriptionStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }
                      >
                        {entity.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusBadge(entity.status)}</TableCell>
                    <TableCell>{format(new Date(entity.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBlockDialog({ open: true, entity })}
                      >
                        {entity.status === 'blocked' ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <Ban className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhuma empresa encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={blockDialog.open} onOpenChange={(open) => setBlockDialog({ open, entity: blockDialog.entity })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {blockDialog.entity?.status === 'blocked' ? 'Desbloquear' : 'Bloquear'} empresa
            </DialogTitle>
            <DialogDescription>
              {blockDialog.entity?.status === 'blocked'
                ? `Deseja desbloquear a empresa "${blockDialog.entity?.name}"?`
                : `Deseja bloquear a empresa "${blockDialog.entity?.name}"? Os usuários não poderão acessar o sistema.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog({ open: false, entity: null })}>
              Cancelar
            </Button>
            <Button
              variant={blockDialog.entity?.status === 'blocked' ? 'default' : 'destructive'}
              onClick={handleToggleBlock}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {blockDialog.entity?.status === 'blocked' ? 'Desbloquear' : 'Bloquear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
