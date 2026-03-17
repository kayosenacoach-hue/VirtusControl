import { useState, useEffect, useCallback } from 'react';
import { Expense } from '@/types/expense';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();

  // Load expenses from database
  const loadExpenses = useCallback(async () => {
    if (!user) {
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;

      // Transform database format to app format
      const transformed: Expense[] = (data || []).map(row => ({
        id: row.id,
        description: row.description,
        amount: Number(row.amount),
        category: row.category as Expense['category'],
        date: row.date,
        paymentMethod: (row.payment_method || 'pix') as Expense['paymentMethod'],
        personType: row.entity_id ? 'pj' : 'pf',
        entityId: row.entity_id || undefined,
        recurringAccountId: undefined, // Will be handled separately
        isRecurring: false,
        notes: row.notes || undefined,
        createdAt: row.created_at,
      }));

      setExpenses(transformed);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
      toast.error('Erro ao carregar despesas');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const addExpense = useCallback(async (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    if (!user) {
      toast.error('Você precisa estar logado para adicionar despesas');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          date: expense.date,
          payment_method: expense.paymentMethod,
          entity_id: expense.entityId || null,
          notes: expense.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newExpense: Expense = {
        id: data.id,
        description: data.description,
        amount: Number(data.amount),
        category: data.category as Expense['category'],
        date: data.date,
        paymentMethod: (data.payment_method || 'pix') as Expense['paymentMethod'],
        personType: data.entity_id ? 'pj' : 'pf',
        entityId: data.entity_id || undefined,
        recurringAccountId: expense.recurringAccountId,
        isRecurring: expense.isRecurring,
        notes: data.notes || undefined,
        createdAt: data.created_at,
      };

      setExpenses(prev => [newExpense, ...prev]);
      toast.success('Despesa adicionada com sucesso!');
      return newExpense;
    } catch (error) {
      console.error('Erro ao adicionar despesa:', error);
      toast.error('Erro ao adicionar despesa');
      return null;
    }
  }, [user]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt'>>) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      const updateData: Record<string, any> = {};
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.amount !== undefined) updateData.amount = updates.amount;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
      if (updates.entityId !== undefined) updateData.entity_id = updates.entityId || null;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setExpenses(prev => prev.map(expense =>
        expense.id === id ? { ...expense, ...updates } : expense
      ));

      toast.success('Despesa atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar despesa:', error);
      toast.error('Erro ao atualizar despesa');
    }
  }, [user]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setExpenses(prev => prev.filter(expense => expense.id !== id));
      toast.success('Despesa excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      toast.error('Erro ao excluir despesa');
    }
  }, [user]);

  const clearAllExpenses = useCallback(async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setExpenses([]);
      toast.success('Todas as despesas foram removidas!');
    } catch (error) {
      console.error('Erro ao limpar despesas:', error);
      toast.error('Erro ao limpar despesas');
    }
  }, [user]);

  return {
    expenses,
    isLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    clearAllExpenses,
    refetch: loadExpenses,
  };
}
