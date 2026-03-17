import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/layout/Logo';
import { Check, Loader2, Crown, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { loadMercadoPago } from '@mercadopago/sdk-js';

const MP_PUBLIC_KEY = 'APP_USR-d68c854c-2b9f-497e-bbd9-e2df17f12bb7';

export default function ChoosePlan() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entityId, setEntityId] = useState<string | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [mpReady, setMpReady] = useState(false);
  const cardFormRef = useRef<any>(null);
  const mpInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const fetchEntity = async () => {
      const { data } = await supabase
        .from('user_entity_access')
        .select('entity_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        setEntityId(data.entity_id);

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('entity_id', data.entity_id)
          .in('status', ['active', 'pending'])
          .maybeSingle();

        if (sub?.status === 'active') {
          navigate('/dashboard', { replace: true });
        }
      }
    };

    fetchEntity();
  }, [isAuthenticated, user, navigate]);

  const initMercadoPago = useCallback(async () => {
    try {
      await loadMercadoPago();
      const mp = new (window as any).MercadoPago(MP_PUBLIC_KEY, {
        locale: 'pt-BR',
      });
      mpInstanceRef.current = mp;

      const cardForm = mp.cardForm({
        amount: '39.00',
        iframe: true,
        form: {
          id: 'form-checkout',
          cardNumber: {
            id: 'form-checkout__cardNumber',
            placeholder: 'Número do cartão',
          },
          expirationDate: {
            id: 'form-checkout__expirationDate',
            placeholder: 'MM/AA',
          },
          securityCode: {
            id: 'form-checkout__securityCode',
            placeholder: 'CVV',
          },
          cardholderName: {
            id: 'form-checkout__cardholderName',
            placeholder: 'Nome como no cartão',
          },
          issuer: {
            id: 'form-checkout__issuer',
            placeholder: 'Banco emissor',
          },
          installments: {
            id: 'form-checkout__installments',
            placeholder: 'Parcelas',
          },
          identificationType: {
            id: 'form-checkout__identificationType',
            placeholder: 'Tipo de documento',
          },
          identificationNumber: {
            id: 'form-checkout__identificationNumber',
            placeholder: 'Número do documento',
          },
          cardholderEmail: {
            id: 'form-checkout__cardholderEmail',
            placeholder: 'E-mail',
          },
        },
        callbacks: {
          onFormMounted: (error: any) => {
            if (error) {
              console.error('CardForm mount error:', error);
              toast.error('Erro ao carregar formulário de pagamento');
              return;
            }
            setMpReady(true);
          },
          onSubmit: async (event: Event) => {
            event.preventDefault();
            await handleCardSubmit(cardForm);
          },
          onFetching: (resource: string) => {
            console.log('Fetching resource:', resource);
          },
        },
      });

      cardFormRef.current = cardForm;
    } catch (error) {
      console.error('MercadoPago init error:', error);
      toast.error('Erro ao inicializar pagamento');
    }
  }, []);

  useEffect(() => {
    if (showCardForm) {
      // Small delay to ensure DOM elements are ready
      const timer = setTimeout(() => {
        initMercadoPago();
      }, 100);
      return () => {
        clearTimeout(timer);
        if (cardFormRef.current) {
          try { cardFormRef.current.unmount(); } catch (_) {}
        }
      };
    }
  }, [showCardForm, initMercadoPago]);

  const handleCardSubmit = async (cardForm: any) => {
    if (!entityId) {
      toast.error('Nenhuma empresa encontrada. Faça o cadastro primeiro.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = cardForm.getCardFormData();

      if (!formData.token) {
        toast.error('Erro ao processar dados do cartão. Verifique as informações.');
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          entityId,
          planName: 'pro',
          price: 39,
          cardTokenId: formData.token,
        },
      });

      if (error) throw error;

      if (data?.status === 'authorized' || data?.status === 'active') {
        toast.success('Assinatura criada com sucesso! Bem-vindo ao VirtusControl Pro.');
        navigate('/dashboard', { replace: true });
      } else if (data?.status === 'pending') {
        toast.success('Assinatura criada! Aguardando confirmação do pagamento.');
        navigate('/dashboard', { replace: true });
      } else {
        toast.error('Erro ao processar assinatura. Tente novamente.');
      }
    } catch (error: any) {
      console.error('Subscribe error:', error);
      toast.error(error.message || 'Erro ao criar assinatura');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    'Dashboard financeiro completo',
    'Gestão multi-entidade (PJ/PF)',
    'Registro de despesas via WhatsApp',
    'Upload e análise de documentos por IA',
    'Controle de contas a pagar',
    'Relatórios e gráficos',
    'Usuários ilimitados',
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-lg mx-4">
        <div className="text-center mb-8 space-y-4">
          <div className="flex justify-center">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Escolha seu plano</h1>
          <p className="text-muted-foreground">Comece com 7 dias grátis, cancele quando quiser</p>
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => navigate('/dashboard')}
          >
            ← Voltar ao menu
          </Button>
        </div>

        <Card className="border-2 border-primary relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
            POPULAR
          </div>
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Plano Pro</CardTitle>
            <CardDescription>Tudo que você precisa para gerenciar suas finanças</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <span className="text-4xl font-bold text-foreground">R$39</span>
              <span className="text-muted-foreground">/mês</span>
              <p className="text-sm text-primary font-medium mt-1">7 dias grátis para testar</p>
            </div>

            <ul className="space-y-3">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            {!showCardForm ? (
              <Button
                onClick={() => setShowCardForm(true)}
                className="w-full h-12 text-base"
                disabled={!entityId}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Assinar agora
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Dados do cartão de crédito
                </div>

                <form id="form-checkout" className="space-y-3">
                  <div
                    id="form-checkout__cardNumber"
                    className="h-11 rounded-md border border-input bg-background px-1"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      id="form-checkout__expirationDate"
                      className="h-11 rounded-md border border-input bg-background px-1"
                    />
                    <div
                      id="form-checkout__securityCode"
                      className="h-11 rounded-md border border-input bg-background px-1"
                    />
                  </div>
                  <input
                    type="text"
                    id="form-checkout__cardholderName"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Nome como no cartão"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      id="form-checkout__issuer"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <select
                      id="form-checkout__installments"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      id="form-checkout__identificationType"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                    <input
                      type="text"
                      id="form-checkout__identificationNumber"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      placeholder="CPF"
                    />
                  </div>
                  <input
                    type="email"
                    id="form-checkout__cardholderEmail"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="E-mail"
                    defaultValue={user?.email || ''}
                  />

                  <Button
                    type="submit"
                    className="w-full h-12 text-base"
                    disabled={isSubmitting || !mpReady}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : !mpReady ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      'Confirmar assinatura'
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setShowCardForm(false);
                      setMpReady(false);
                      if (cardFormRef.current) {
                        try { cardFormRef.current.unmount(); } catch (_) {}
                      }
                    }}
                  >
                    Voltar
                  </Button>
                </form>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Pagamento seguro via Mercado Pago. Cancele a qualquer momento.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
