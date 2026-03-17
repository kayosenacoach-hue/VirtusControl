import { Expense, CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '@/types/expense';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RecentExpensesProps {
  expenses: Expense[];
}

const categoryBadgeStyles: Record<string, string> = {
  operacional: 'bg-category-operacional/10 text-category-operacional border-category-operacional/30',
  pessoal: 'bg-category-pessoal/10 text-category-pessoal border-category-pessoal/30',
  marketing: 'bg-category-marketing/10 text-category-marketing border-category-marketing/30',
  fornecedores: 'bg-category-fornecedores/10 text-category-fornecedores border-category-fornecedores/30',
  impostos: 'bg-category-impostos/10 text-category-impostos border-category-impostos/30',
  equipamentos: 'bg-category-equipamentos/10 text-category-equipamentos border-category-equipamentos/30',
  outros: 'bg-category-outros/10 text-category-outros border-category-outros/30',
};

export function RecentExpenses({ expenses }: RecentExpensesProps) {
  const recentExpenses = expenses.slice(0, 5);

  if (recentExpenses.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-muted-foreground">
        <p>Nenhuma despesa registrada ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recentExpenses.map((expense, index) => (
        <div
          key={expense.id}
          className="rounded-lg border border-border bg-card/50 p-3 md:p-4 transition-all duration-200 hover:bg-card hover:shadow-sm animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Mobile layout - stacked */}
          <div className="flex flex-col gap-2 md:hidden">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-card-foreground text-sm truncate flex-1">
                {expense.description}
              </span>
              <span className="font-semibold text-card-foreground tabular-nums text-sm shrink-0">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(expense.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{format(parseISO(expense.date), "dd/MM", { locale: ptBR })}</span>
                <span>•</span>
                <span className="truncate">{PAYMENT_METHOD_LABELS[expense.paymentMethod]}</span>
              </div>
              <Badge
                variant="outline"
                className={cn("border text-xs shrink-0", categoryBadgeStyles[expense.category])}
              >
                {CATEGORY_LABELS[expense.category]}
              </Badge>
            </div>
          </div>

          {/* Desktop layout - horizontal */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="font-medium text-card-foreground">
                  {expense.description}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {format(parseISO(expense.date), "dd 'de' MMM", { locale: ptBR })}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
                  <span className="text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[expense.paymentMethod]}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant="outline"
                className={cn("border", categoryBadgeStyles[expense.category])}
              >
                {CATEGORY_LABELS[expense.category]}
              </Badge>
              <span className="font-semibold text-card-foreground tabular-nums">
                {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(expense.amount)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
