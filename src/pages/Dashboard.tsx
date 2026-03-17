import { useMemo, useState } from 'react';
import { useExpenseContext } from '@/contexts/ExpenseContext';
import { useEntityContext } from '@/contexts/EntityContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { OnboardingManager, useShowChecklist } from '@/components/onboarding/OnboardingManager';
import { OnboardingChecklist } from '@/components/onboarding/OnboardingChecklist';
import { EntitySelector } from '@/components/layout/EntitySelector';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CategoryChart } from '@/components/dashboard/CategoryChart';
import { MonthlyChart } from '@/components/dashboard/MonthlyChart';
import { RecentExpenses } from '@/components/dashboard/RecentExpenses';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  PieChart,
  Calendar,
  Building2,
  User,
  BarChart3
} from 'lucide-react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { parseISO, format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CATEGORY_LABELS, ExpenseCategory } from '@/types/expense';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDocument } from '@/types/entity';

export default function Dashboard() {
  const { expenses, isLoading } = useExpenseContext();
  const { entities, selectedEntity, selectedEntityId, isLoading: isLoadingEntities } = useEntityContext();
  const [selectedMonth, setSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  // Generate month options for last 12 months
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      options.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, "MMMM 'de' yyyy", { locale: ptBR }),
      });
    }
    return options;
  }, []);

  // Filter expenses by selected month and entity
  const filteredExpenses = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(new Date(year, month - 1));

    return expenses.filter((expense) => {
      const date = parseISO(expense.date);
      const inMonth = isWithinInterval(date, { start, end });
      
      // If an entity is selected, filter by it
      if (selectedEntityId) {
        return inMonth && expense.entityId === selectedEntityId;
      }
      
      return inMonth;
    });
  }, [expenses, selectedMonth, selectedEntityId]);

  // Expenses filtered only by entity (for monthly chart)
  const entityExpenses = useMemo(() => {
    if (!selectedEntityId) return expenses;
    return expenses.filter(e => e.entityId === selectedEntityId);
  }, [expenses, selectedEntityId]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const maxExpense = filteredExpenses.reduce(
      (max, e) => (e.amount > max.amount ? e : max),
      { amount: 0, description: 'Nenhuma' } as { amount: number; description: string }
    );

    // Find category with highest spending
    const categoryTotals = filteredExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

    return {
      total,
      count: filteredExpenses.length,
      maxExpense,
      topCategory: topCategory
        ? { name: CATEGORY_LABELS[topCategory[0] as ExpenseCategory], value: topCategory[1] }
        : null,
    };
  }, [filteredExpenses]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-[400px] rounded-xl" />
            <Skeleton className="h-[400px] rounded-xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  const { show: showChecklist, dismiss: dismissChecklist } = useShowChecklist();

  return (
    <MainLayout>
      <OnboardingManager />
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* Onboarding Checklist */}
        {showChecklist && (
          <OnboardingChecklist onDismiss={dismissChecklist} />
        )}
        {/* Header - Mobile optimized */}
        <div className="space-y-4">
          {/* Title row */}
          <div className="flex items-center gap-3">
            {selectedEntity ? (
              <div
                className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `hsl(${selectedEntity.color})` }}
              >
                {selectedEntity.type === 'pj' ? (
                  <Building2 className="h-5 w-5 md:h-6 md:w-6 text-white" />
                ) : (
                  <User className="h-5 w-5 md:h-6 md:w-6 text-white" />
                )}
              </div>
            ) : (
              <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-primary-foreground" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-3xl font-bold text-foreground truncate">
                {selectedEntity ? selectedEntity.name : 'Visão Consolidada'}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {selectedEntity 
                  ? `${selectedEntity.type === 'pj' ? 'CNPJ' : 'CPF'}: ${formatDocument(selectedEntity.document, selectedEntity.type)}`
                  : 'Todas as empresas e pessoas'}
              </p>
            </div>
          </div>
          
          {/* Filters row - stacked on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-tour="entity-selector">
            <EntitySelector />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full h-11">
                <Calendar className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Metric Cards - 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4" data-tour="metric-cards">
          <MetricCard
            title="Total"
            value={formatCurrency(metrics.total)}
            subtitle={`${metrics.count} lanç.`}
            icon={DollarSign}
            iconClassName="bg-primary/10 text-primary"
          />
          <MetricCard
            title="Maior"
            value={formatCurrency(metrics.maxExpense.amount)}
            subtitle={metrics.maxExpense.description.slice(0, 15) + (metrics.maxExpense.description.length > 15 ? '...' : '')}
            icon={TrendingUp}
            iconClassName="bg-warning/10 text-warning"
          />
          <MetricCard
            title="Top Categ."
            value={metrics.topCategory?.name || 'Nenhuma'}
            subtitle={metrics.topCategory ? formatCurrency(metrics.topCategory.value) : '-'}
            icon={PieChart}
            iconClassName="bg-accent/10 text-accent"
          />
          <MetricCard
            title="Média"
            value={metrics.count > 0 ? formatCurrency(metrics.total / metrics.count) : 'R$ 0'}
            subtitle="Por despesa"
            icon={CreditCard}
            iconClassName="bg-info/10 text-info"
          />
        </div>

        {/* Charts - stack on mobile */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2" data-tour="charts">
          <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-card">
            <h2 className="text-base md:text-lg font-semibold text-card-foreground mb-4">
              Por Categoria
            </h2>
            <CategoryChart expenses={filteredExpenses} />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-card">
            <h2 className="text-base md:text-lg font-semibold text-card-foreground mb-4">
              Evolução Mensal
            </h2>
            <MonthlyChart expenses={entityExpenses} />
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="rounded-xl border border-border bg-card p-4 md:p-6 shadow-card">
          <h2 className="text-base md:text-lg font-semibold text-card-foreground mb-4">
            Últimas Despesas
          </h2>
          <RecentExpenses expenses={filteredExpenses} />
        </div>
      </div>
    </MainLayout>
  );
}
