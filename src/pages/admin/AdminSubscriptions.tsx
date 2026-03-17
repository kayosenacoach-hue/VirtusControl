import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Loader2, Search, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SubscriptionRow {
  id: string;
  entity_id: string;
  plan_name: string;
  price: number;
  status: string;
  trial_end: string | null;
  next_billing_date: string | null;
  mercado_pago_subscription_id: string | null;
  created_at: string;
  entityName: string;
}

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; sub: SubscriptionRow | null }>({
    open: false,
    sub: null,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSubscriptions = async () => {
    try {
      const [{ data: subs }, { data: entities }] = await Promise.all([
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
        supabase.from('entities').select('id, name'),
      ]);

      if (!subs) return;

      const entityMap = new Map(entities?.map((e) => [e.id, e.name]) || []);

      const enriched: SubscriptionRow[] = subs.map((s) => ({
        ...s,
        entityName: entityMap.get(s.entity_id) || '—',
      }));

      setSubscriptions(enriched);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleCancelSubscription = async () => {
    if (!cancelDialog.sub) return;
    setActionLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          subscriptionId: cancelDialog.sub.id,
          mercadoPagoSubscriptionId: cancelDialog.sub.mercado_pago_subscription_id,
          isAdmin: true,
        },
      });

      if (error) throw error;

      // Log action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('admin_logs' as any).insert({
        admin_id: user?.id,
        action: 'cancel_subscription',
        entity_id: cancelDialog.sub.entity_id,
        description: `Cancelou assinatura da empresa "${cancelDialog.sub.entityName}"`,
      });

      toast.success('Assinatura cancelada com sucesso');
      setCancelDialog({ open: false, sub: null });
      fetchSubscriptions();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar assinatura');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = subscriptions
    .filter((s) => filter === 'all' || s.status === filter)
    .filter((s) => s.entityName.toLowerCase().includes(search.toLowerCase()));

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'authorized':
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinaturas</h1>
          <p className="text-muted-foreground">Gerenciar assinaturas de todas as empresas</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="active">Ativas</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
            </TabsList>
          </Tabs>
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
                  <TableHead>Empresa</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Próxima cobrança</TableHead>
                  <TableHead>Criação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.entityName}</TableCell>
                    <TableCell className="capitalize">{sub.plan_name}</TableCell>
                    <TableCell>R$ {Number(sub.price).toFixed(2)}</TableCell>
                    <TableCell>{statusBadge(sub.status)}</TableCell>
                    <TableCell>
                      {sub.next_billing_date
                        ? format(new Date(sub.next_billing_date), 'dd/MM/yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell>{format(new Date(sub.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      {sub.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancelDialog({ open: true, sub })}
                        >
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma assinatura encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, sub: cancelDialog.sub })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar assinatura</DialogTitle>
            <DialogDescription>
              Deseja cancelar a assinatura da empresa "{cancelDialog.sub?.entityName}"?
              A API do Mercado Pago será chamada para cancelar a cobrança recorrente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, sub: null })}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={actionLoading}>
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
