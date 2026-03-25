import { useState, useEffect, useCallback } from 'react';
import { RecurringAccount } from '@/types/recurring';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useRecurringAccounts() {
  const [accounts, setAccounts] = useState<RecurringAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();

  const loadAccounts = useCallback(async () => {
    if (!user) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('recurring_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      const transformed: RecurringAccount[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category as RecurringAccount['category'],
        entityId: row.entity_id || undefined,
        recurrence: row.recurrence as RecurringAccount['recurrence'] || 'mensal',
        expectedDay: row.expected_day || undefined,
        averageAmount: row.expected_amount ? Number(row.expected_amount) : undefined,
        notes: row.notes || undefined,
        isActive: row.is_active,
        createdAt: row.created_at,
      }));

      setAccounts(transformed);
    } catch (error) {
      console.error('Erro ao carregar contas fixas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const addAccount = useCallback(async (account: Omit<RecurringAccount, 'id' | 'createdAt'>) => {
    if (!user) return null;

    try {
      const payload = {
        user_id: user.id,
        name: account.name,
        category: account.category,
        recurrence: account.recurrence || 'mensal',
        entity_id: account.entityId || null,
        expected_day: account.expectedDay || null,
        expected_amount: account.averageAmount || null,
        is_active: account.isActive,
        notes: account.notes || null,
      };

      const { data, error } = await supabase
        .from('recurring_accounts')
        .insert(payload as any)
        .select()
        .single();

      if (error) throw error;

      toast.success('Conta fixa cadastrada!');
      await loadAccounts(); 
      
      return data;
    } catch (error: any) {
      console.error('Erro ao gravar conta:', error);
      toast.error('Não foi possível gravar a conta fixa.');
      return null;
    }
  }, [user, loadAccounts]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Omit<RecurringAccount, 'id' | 'createdAt'>>) => {
    if (!user) return;
    try {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.recurrence !== undefined) updateData.recurrence = updates.recurrence;
      if (updates.entityId !== undefined) updateData.entity_id = updates.entityId || null;
      if (updates.expectedDay !== undefined) updateData.expected_day = updates.expectedDay || null;
      if (updates.averageAmount !== undefined) updateData.expected_amount = updates.averageAmount || null;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase.from('recurring_accounts').update(updateData).eq('id', id).eq('user_id', user.id);
      if (error) throw error;

      await loadAccounts();
      toast.success('Conta atualizada!');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      toast.error('Erro ao atualizar a conta.');
    }
  }, [user, loadAccounts]);

  const deleteAccount = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.from('recurring_accounts').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      
      await loadAccounts();
      toast.success('Conta removida!');
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Não foi possível remover a conta.');
    }
  }, [user, loadAccounts]);

  return { accounts, isLoading, addAccount, updateAccount, deleteAccount, refetch: loadAccounts };
}