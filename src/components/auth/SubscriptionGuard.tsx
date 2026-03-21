import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  children: ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, isAuthenticated, isAdmin } = useAuthContext();
  const [status, setStatus] = useState<'loading' | 'active' | 'trial' | 'inactive' | 'blocked'>('loading');

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    // Admins bypass subscription check
    if (isAdmin) {
      setStatus('active');
      return;
    }

    const checkSubscription = async () => {
      // Get user's entity
      const { data: access } = await supabase
        .from('user_entity_access')
        .select('entity_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!access) {
        setStatus('inactive');
        return;
      }

      // Check if entity is blocked
      const { data: entity } = await supabase
        .from('entities')
        .select('status')
        .eq('id', access.entity_id)
        .maybeSingle();

      if (entity && (entity as any).status === 'blocked') {
        setStatus('blocked');
        return;
      }

      // Check subscription
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_end')
        .eq('entity_id', access.entity_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!sub) {
        setStatus('inactive');
        return;
      }

      if (sub.status === 'active' || sub.status === 'authorized') {
        setStatus('active');
        return;
      }

      // Check if still in trial
      if (sub.trial_end && new Date(sub.trial_end) > new Date()) {
        setStatus('trial');
        return;
      }

      setStatus('inactive');
    };

    checkSubscription();
  }, [isAuthenticated, user, isAdmin]);

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'blocked') {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-2xl font-bold text-destructive">Acesso Bloqueado</h1>
          <p className="text-muted-foreground">
            Sua empresa foi bloqueada pelo administrador. Entre em contato com o suporte para mais informações.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'inactive') {
    return <Navigate to="/plano" replace />;
  }

  return <>{children}</>;
}
