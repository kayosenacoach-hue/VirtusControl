import { useState, useEffect, useCallback } from 'react';
import { RecurringAccount } from '@/types/recurring';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useRecurringAccounts() {
  const [accounts, setAccounts] = useState<RecurringAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();

  // Load accounts from database
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

      // Transform database format to app format
      const transformed: RecurringAccount[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        category: row.category as RecurringAccount['category'],
        entityId: row.entity_id || undefined,
        recurrence: 'mensal', // Default to monthly since DB doesn't have this column
        expectedDay: row.expected_day || undefined,
        averageAmount: row.expected_amount ? Number(row.expected_amount) : undefined,
        notes: row.notes || undefined,
        isActive: row.is_active,
        createdAt: row.created_at,
      }));

      setAccounts(transformed);
    } catch (error) {
      console.error('Erro ao carregar contas recorrentes:', error);
      toast.error('Erro ao carregar contas recorrentes');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const addAccount = useCallback(async (account: Omit<RecurringAccount, 'id' | 'createdAt'>) => {
    if (!user) {
      toast.error('Você precisa estar logado para adicionar contas');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('recurring_accounts')
        .insert({
          user_id: user.id,
          name: account.name,
          category: account.category,
          entity_id: account.entityId || null,
          expected_day: account.expectedDay || null,
          expected_amount: account.averageAmount || null,
          is_active: account.isActive,
          notes: account.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newAccount: RecurringAccount = {
        id: data.id,
        name: data.name,
        category: data.category as RecurringAccount['category'],
        entityId: data.entity_id || undefined,
        recurrence: account.recurrence,
        expectedDay: data.expected_day || undefined,
        averageAmount: data.expected_amount ? Number(data.expected_amount) : undefined,
        notes: data.notes || undefined,
        isActive: data.is_active,
        createdAt: data.created_at,
      };

      setAccounts(prev => [...prev, newAccount]);
      toast.success('Conta fixa cadastrada com sucesso!');
      return newAccount;
    } catch (error) {
      console.error('Erro ao adicionar conta:', error);
      toast.error('Erro ao adicionar conta');
      return null;
    }
  }, [user]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Omit<RecurringAccount, 'id' | 'createdAt'>>) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      const updateData: Record<string, any> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.entityId !== undefined) updateData.entity_id = updates.entityId || null;
      if (updates.expectedDay !== undefined) updateData.expected_day = updates.expectedDay || null;
      if (updates.averageAmount !== undefined) updateData.expected_amount = updates.averageAmount || null;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.notes !== undefined) updateData.notes = updates.notes || null;

      const { error } = await supabase
        .from('recurring_accounts')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setAccounts(prev => prev.map(account =>
        account.id === id ? { ...account, ...updates } : account
      ));

      toast.success('Conta atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast.error('Erro ao atualizar conta');
    }
  }, [user]);

  const deleteAccount = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      const { error } = await supabase
        .from('recurring_accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setAccounts(prev => prev.filter(account => account.id !== id));
      toast.success('Conta removida com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta');
    }
  }, [user]);

  return {
    accounts,
    isLoading,
    addAccount,
    updateAccount,
    deleteAccount,
    refetch: loadAccounts,
  };
}
