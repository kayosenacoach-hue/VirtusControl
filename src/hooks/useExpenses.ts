import { useState, useEffect, useCallback } from 'react';
import { Expense } from '@/types/expense';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();

  const loadExpenses = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('expenses').select('*').eq('user_id', user.id).order('date', { ascending: false });
      if (error) throw error;

      const transformed: Expense[] = (data || []).map((row: any) => ({
        id: row.id,
        description: row.description,
        amount: Number(row.amount),
        category: row.category,
        date: row.date,
        paymentMethod: row.payment_method || 'pix',
        personType: row.entity_id ? 'pj' : 'pf',
        entityId: row.entity_id || undefined,
        isRecurring: row.is_recurring || false, 
        notes: row.notes || undefined,
        createdAt: row.created_at,
      }));
      
      setExpenses(transformed);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const addExpense = useCallback(async (expense: any) => {
    if (!user) {
      toast.error('Sessão expirada. Faça login novamente.');
      return null;
    }

    try {
      const payload = {
        user_id: user.id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        payment_method: expense.paymentMethod,
        entity_id: expense.entityId || null,
        is_recurring: expense.isRecurring,
        notes: expense.notes || null,
      };

      const { data, error } = await supabase.from('expenses').insert(payload as any).select().single();

      if (error) throw error;

      toast.success('Despesa adicionada com sucesso!');
      loadExpenses();
      return data;
    } catch (error) {
      console.error('Erro no Supabase:', error);
      toast.error('Não foi possível gravar a despesa. Tente novamente.');
      return null;
    }
  }, [user, loadExpenses]);

  const updateExpense = useCallback(async (id: string, updates: Partial<Expense>) => {
    if (!user) return;
    try {
      const payload: any = {};
      if (updates.description) payload.description = updates.description;
      if (updates.amount) payload.amount = updates.amount;
      if (updates.category) payload.category = updates.category;
      if (updates.date) payload.date = updates.date;
      if (updates.paymentMethod) payload.payment_method = updates.paymentMethod;
      if (updates.entityId !== undefined) payload.entity_id = updates.entityId || null;
      if (updates.isRecurring !== undefined) payload.is_recurring = updates.isRecurring;
      if (updates.notes !== undefined) payload.notes = updates.notes || null;

      const { error } = await supabase.from('expenses').update(payload).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      
      toast.success('Despesa atualizada com sucesso!');
      loadExpenses();
    } catch (error: any) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar despesa.');
    }
  }, [user, loadExpenses]);

  const deleteExpense = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      
      toast.success('Despesa excluída!');
      loadExpenses();
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir despesa.');
    }
  }, [user, loadExpenses]);

  const clearAllExpenses = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      const { error } = await supabase.from('expenses').delete().eq('user_id', user.id);
      if (error) throw error;
      
      toast.success('Todas as despesas foram apagadas.');
      setExpenses([]);
    } catch (error: any) {
      console.error('Erro ao limpar despesas:', error);
      toast.error('Não foi possível limpar as despesas.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return { expenses, isLoading, addExpense, updateExpense, deleteExpense, clearAllExpenses, refetch: loadExpenses };
}