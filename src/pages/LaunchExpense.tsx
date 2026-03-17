import { useState } from 'react';
import { useExpenseContext } from '@/contexts/ExpenseContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { PlusCircle } from 'lucide-react';

export default function LaunchExpense() {
  const { addExpense } = useExpenseContext();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: Parameters<typeof addExpense>[0]) => {
    setIsSubmitting(true);
    try {
      await addExpense(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
            <PlusCircle className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lançar Despesa</h1>
            <p className="text-muted-foreground mt-1">
              Registre uma nova despesa manualmente
            </p>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <ExpenseForm onSubmit={handleSubmit} isLoading={isSubmitting} />
        </div>
      </div>
    </MainLayout>
  );
}
