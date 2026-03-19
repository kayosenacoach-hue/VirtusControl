import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CreditCard, Calendar, DollarSign, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SubscriptionInfo {
  id: string;
  plan_name: string;
  price: number;
  status: string;
  trial_end: string | null;
  next_billing_date: string | null;
  mercado_pago_subscription_id: string | null;
  created_at: string;
}

export default function Billing() {
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchSubscription = async () => {
      const { data: access } = await supabase
        .from('user_entity_access')
        .select('entity_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!access) {
        setLoading(false);
        return;
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('entity_id', access.entity_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) setSubscription(sub);
      setLoading(false);
    };

    fetchSubscription();
  }, [user]);

  const handleCancel = async () => {
    if (!subscription) return;
    setCancelling(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`
        },
        body: JSON.stringify({
          subscriptionId: subscription.id,
          mercadoPagoSubscriptionId: subscription.mercado_pago_subscription_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao cancelar assinatura');
      }

      toast.success('Assinatura cancelada. Você mantém acesso até o fim do ciclo atual.');
      setSubscription((prev) => prev ? { ...prev, status: 'cancelled' } : null);
      setCancelOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar assinatura');
    } finally {
      setCancelling(false);
    }
  };

  const statusLabel = (status: string) => {
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

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Assinatura</h1>
          <p className="text-muted-foreground">Gerencie seu plano e cobrança</p>
        </div>

        {subscription ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="capitalize">Plano {subscription.plan_name}</CardTitle>
                  <CardDescription>Detalhes da sua assinatura</CardDescription>
                </div>
                {statusLabel(subscription.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Valor</p>
                    <p className="font-semibold">R$ {Number(subscription.price).toFixed(2)}/mês</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Próxima cobrança</p>
                    <p className="font-semibold">
                      {subscription.next_billing_date
                        ? format(new Date(subscription.next_billing_date), 'dd/MM/yyyy')
                        : subscription.trial_end
                        ? format(new Date(subscription.trial_end), 'dd/MM/yyyy')
                        : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Desde</p>
                    <p className="font-semibold">
                      {format(new Date(subscription.created_at), 'dd/MM/yyyy')}
                    </p>
                  </div>
                </div>
              </div>

              {subscription.status !== 'cancelled' && (
                <div className="pt-4 border-t">
                  <Button variant="destructive" onClick={() => setCancelOpen(true)}>
                    Cancelar assinatura
                  </Button>
                </div>
              )}

              {subscription.status === 'cancelled' && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  Assinatura cancelada. Acesso mantido até o fim do ciclo de cobrança.
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhuma assinatura encontrada.</p>
              <Button className="mt-4" onClick={() => navigate('/plano')}>
                Escolher um plano
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar assinatura</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar sua assinatura? Você manterá acesso ao sistema até o fim do ciclo de cobrança atual.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Manter assinatura
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
