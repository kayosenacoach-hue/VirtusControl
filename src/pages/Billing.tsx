import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Loader2, CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function Billing() {
  const { user, subscription, isLoading: authLoading, refreshUser } = useAuthContext();
  const navigate = useNavigate();
  const [isCanceling, setIsCanceling] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else {
      setPageLoading(false);
    }
  }, [user, authLoading, navigate]);

  const handleCancelSubscription = async () => {
    if (!subscription?.id) {
      toast.error('Nenhuma assinatura ativa encontrada.');
      return;
    }

    const confirmCancel = window.confirm('Tem certeza que deseja cancelar sua assinatura? Você continuará com acesso até o final do período faturado.');
    if (!confirmCancel) return;

    setIsCanceling(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionData.session?.access_token}`
        },
        body: JSON.stringify({ subscriptionId: subscription.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao cancelar assinatura');
      }

      await refreshUser();
      toast.success('Assinatura cancelada. O acesso continuará até o fim do período.');
    } catch (error: any) {
      console.error('Cancel error:', error);
      toast.error(error.message || 'Erro ao cancelar assinatura');
    } finally {
      setIsCanceling(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <MainLayout>
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isCanceled = subscription?.cancelAtPeriodEnd;
  const endDate = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString('pt-BR') : '';

  return (
    <MainLayout>
      <div className="container max-w-4xl py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Faturamento & Assinatura</h1>
          <p className="text-muted-foreground">Gerencie seu plano e método de pagamento.</p>
        </div>

        {isCanceled && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Assinatura Cancelada</AlertTitle>
            <AlertDescription>
              Sua assinatura foi cancelada, mas você ainda tem acesso até o dia {endDate}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>Informações sobre sua assinatura atual</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-lg">Plano Pro</p>
                  <p className="text-sm text-muted-foreground">R$39,00 / mês</p>
                </div>
                {isActive && !isCanceled ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Ativo
                  </span>
                ) : isCanceled ? (
                   <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                    Cancelado
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                    Inativo
                  </span>
                )}
              </div>

              {isActive && endDate && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Próxima cobrança: </span>
                  <span className="font-medium">{endDate}</span>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              {isActive && !isCanceled ? (
                <Button variant="destructive" onClick={handleCancelSubscription} disabled={isCanceling}>
                  {isCanceling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Cancelar Assinatura'}
                </Button>
              ) : isCanceled ? (
                 <Button variant="outline" onClick={() => navigate('/plano')}>
                  Reativar Assinatura
                </Button>
              ) : (
                <Button onClick={() => navigate('/plano')}>
                  Escolher Plano
                </Button>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Método de Pagamento</CardTitle>
              <CardDescription>O cartão utilizado para cobranças</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-6 text-center space-y-4">
               {subscription?.paymentMethod ? (
                 <div className="flex items-center gap-2 text-lg font-medium">
                   <CreditCard className="h-5 w-5 text-primary" />
                   Cartão de Crédito
                 </div>
               ) : (
                 <>
                  <CreditCard className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Nenhum método de pagamento cadastrado.</p>
                 </>
               )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}