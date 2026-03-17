import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Expense } from '@/types/expense';
import { format, parseISO, startOfMonth, subMonths, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MonthlyChartProps {
  expenses: Expense[];
}

export function MonthlyChart({ expenses }: MonthlyChartProps) {
  const data = useMemo(() => {
    const now = new Date();
    const months: { month: Date; label: string; total: number }[] = [];

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = startOfMonth(subMonths(now, i - 1));
      
      const total = expenses
        .filter((expense) => {
          const date = parseISO(expense.date);
          return isAfter(date, monthStart) && isBefore(date, monthEnd) || 
                 format(date, 'yyyy-MM') === format(monthStart, 'yyyy-MM');
        })
        .reduce((sum, expense) => sum + expense.amount, 0);

      months.push({
        month: monthStart,
        label: format(monthStart, 'MMM', { locale: ptBR }),
        total,
      });
    }

    return months;
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div className="flex h-[250px] md:h-[300px] items-center justify-center text-muted-foreground">
        <p className="text-sm">Nenhuma despesa registrada</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(175 65% 35%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(175 65% 35%)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={50}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            tickFormatter={(value) =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                notation: 'compact',
                maximumFractionDigits: 0,
              }).format(value)
            }
          />
          <Tooltip
            formatter={(value: number) =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(value)
            }
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              boxShadow: 'var(--shadow-md)',
              fontSize: '12px',
            }}
            labelFormatter={(label) => `Mês: ${label}`}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="hsl(175 65% 35%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTotal)"
            name="Total"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
