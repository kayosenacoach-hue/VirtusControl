import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, subscription, isLoading, isSubscriptionLoading, subscriptionError } = useAuthContext();
  const location = useLocation();

  if (isLoading || isSubscriptionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const isChoosePlanRoute = location.pathname === '/choose-plan';
  if (isChoosePlanRoute) {
    return <>{children}</>;
  }

  if (subscriptionError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background flex-col gap-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-bold">Erro de Conexão</h2>
        <p className="text-muted-foreground font-medium">Não conseguimos verificar a sua assinatura no momento.</p>
        <Button onClick={() => window.location.reload()} variant="outline">Tentar Novamente</Button>
      </div>
    );
  }

  // ACEITA QUALQUER STATUS VÁLIDO (Ativo, Pendente, Período de Teste)
  const validStatuses = ['active', 'trialing', 'pending'];
  const hasActiveSubscription = subscription && validStatuses.includes(subscription.status);
  
  const isOwner = profile?.role === 'owner' || !profile;

  if (isOwner && !hasActiveSubscription) {
    return <Navigate to="/choose-plan" replace />;
  }

  return <>{children}</>;
}