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

      const transformed: Expense[] = (data || []).map(row => ({
        id: row.id,
        description: row.description,
        amount: Number(row.amount),
        category: row.category as any,
        date: row.date,
        paymentMethod: (row.payment_method || 'pix') as any,
        personType: row.entity_id ? 'pj' : 'pf',
        entityId: row.entity_id || undefined,
        isRecurring: false,
        notes: row.notes || undefined,
        createdAt: row.created_at,
      }));
      setExpenses(transformed);
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => { loadExpenses(); }, [loadExpenses]);

  const addExpense = useCallback(async (expense: any) => {
    if (!user) { alert('Usuário não autenticado!'); return null; }

    try {
      const payload = {
        user_id: user.id,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        payment_method: expense.paymentMethod,
        entity_id: expense.entityId || null,
        notes: expense.notes || null,
      };

      console.log("🚀 Payload disparado para o Supabase:", payload);

      const { data, error } = await supabase.from('expenses').insert(payload).select().single();

      if (error) {
        console.error("🔴 Supabase rejeitou:", error);
        alert(`🔴 ERRO DO SUPABASE:\n${error.message}`);
        throw error;
      }

      alert("🟢 SUCESSO ABSOLUTO! Despesa gravada na base de dados!");
      toast.success('Despesa adicionada com sucesso!');
      loadExpenses();
      return data;
    } catch (error) {
      toast.error('Erro ao adicionar despesa');
      return null;
    }
  }, [user, loadExpenses]);

  const updateExpense = useCallback(async (id: string, updates: any) => {}, [user]);
  const deleteExpense = useCallback(async (id: string) => {}, [user]);
  const clearAllExpenses = useCallback(async () => {}, [user]);

  return { expenses, isLoading, addExpense, updateExpense, deleteExpense, clearAllExpenses, refetch: loadExpenses };
}