import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import {
  Users,
  Building2,
  CreditCard,
  DollarSign,
  TrendingUp,
  XCircle,
  Loader2,
} from 'lucide-react';

interface AdminMetrics {
  totalUsers: number;
  totalEntities: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  mrr: number;
  totalRevenue: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [
          { count: totalUsers },
          { count: totalEntities },
          { data: subs },
          { data: payments },
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('entities').select('*', { count: 'exact', head: true }),
          supabase.from('subscriptions').select('status, price'),
          supabase.from('payments').select('amount, status'),
        ]);

        const activeSubs = subs?.filter((s) => s.status === 'active') || [];
        const cancelledSubs = subs?.filter((s) => s.status === 'cancelled') || [];
        const mrr = activeSubs.reduce((sum, s) => sum + Number(s.price), 0);
        const totalRevenue =
          payments
            ?.filter((p) => p.status === 'approved')
            .reduce((sum, p) => sum + Number(p.amount), 0) || 0;

        setMetrics({
          totalUsers: totalUsers || 0,
          totalEntities: totalEntities || 0,
          activeSubscriptions: activeSubs.length,
          cancelledSubscriptions: cancelledSubs.length,
          mrr,
          totalRevenue,
        });
      } catch (error) {
        console.error('Error fetching admin metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  const cards = [
    {
      title: 'Total de Usuários',
      value: metrics?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-500',
    },
    {
      title: 'Total de Empresas',
      value: metrics?.totalEntities || 0,
      icon: Building2,
      color: 'text-emerald-500',
    },
    {
      title: 'Assinaturas Ativas',
      value: metrics?.activeSubscriptions || 0,
      icon: CreditCard,
      color: 'text-primary',
    },
    {
      title: 'Assinaturas Canceladas',
      value: metrics?.cancelledSubscriptions || 0,
      icon: XCircle,
      color: 'text-destructive',
    },
    {
      title: 'MRR',
      value: `R$ ${(metrics?.mrr || 0).toFixed(2)}`,
      icon: TrendingUp,
      color: 'text-green-600',
    },
    {
      title: 'Receita Total',
      value: `R$ ${(metrics?.totalRevenue || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-amber-500',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
