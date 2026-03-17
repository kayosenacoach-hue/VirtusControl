import { useState, useEffect, useCallback } from 'react';
import { MonthlyBill, BillStatus } from '@/types/recurring';
import { toast } from 'sonner';
import { format, isBefore, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/contexts/AuthContext';

export function useMonthlyBills() {
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthContext();

  // Load bills from database
  const loadBills = useCallback(async () => {
    if (!user) {
      setBills([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('monthly_bills')
        .select('*')
        .eq('user_id', user.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;

      // Transform and update overdue status
      const today = new Date();
      const transformed: MonthlyBill[] = (data || []).map(row => {
        const dueDate = new Date(row.year, row.month - 1, row.expected_day || 1);
        let status = row.status as BillStatus;
        
        // Auto-update to overdue if pending and past due
        if (status === 'pending' && isBefore(dueDate, today)) {
          status = 'overdue';
        }

        return {
          id: row.id,
          recurringAccountId: row.recurring_account_id || '',
          month: row.month,
          year: row.year,
          expectedAmount: row.expected_amount ? Number(row.expected_amount) : 0,
          actualAmount: row.actual_amount ? Number(row.actual_amount) : undefined,
          dueDate: format(dueDate, 'yyyy-MM-dd'),
          paidDate: row.paid_date || undefined,
          expenseId: row.expense_id || undefined,
          status,
          notes: row.notes || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
      });

      setBills(transformed);
    } catch (error) {
      console.error('Erro ao carregar contas mensais:', error);
      toast.error('Erro ao carregar contas mensais');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const getBillForMonth = useCallback((recurringAccountId: string, month: number, year: number) => {
    return bills.find(b => 
      b.recurringAccountId === recurringAccountId && 
      b.month === month && 
      b.year === year
    );
  }, [bills]);

  const createBill = useCallback(async (bill: Omit<MonthlyBill, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('monthly_bills')
        .insert({
          user_id: user.id,
          recurring_account_id: bill.recurringAccountId || null,
          month: bill.month,
          year: bill.year,
          expected_amount: bill.expectedAmount || null,
          actual_amount: bill.actualAmount || null,
          expected_day: parseInt(bill.dueDate.split('-')[2]) || null,
          status: bill.status,
          paid_date: bill.paidDate || null,
          expense_id: bill.expenseId || null,
          notes: bill.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newBill: MonthlyBill = {
        id: data.id,
        recurringAccountId: data.recurring_account_id || '',
        month: data.month,
        year: data.year,
        expectedAmount: data.expected_amount ? Number(data.expected_amount) : 0,
        actualAmount: data.actual_amount ? Number(data.actual_amount) : undefined,
        dueDate: bill.dueDate,
        paidDate: data.paid_date || undefined,
        expenseId: data.expense_id || undefined,
        status: data.status as BillStatus,
        notes: data.notes || undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };

      setBills(prev => [...prev, newBill]);
      return newBill;
    } catch (error) {
      console.error('Erro ao criar conta mensal:', error);
      toast.error('Erro ao criar conta mensal');
      return null;
    }
  }, [user]);

  const markAsPaid = useCallback(async (
    billId: string, 
    actualAmount: number, 
    paidDate: string,
    expenseId?: string
  ) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      const { error } = await supabase
        .from('monthly_bills')
        .update({
          status: 'paid',
          actual_amount: actualAmount,
          paid_date: paidDate,
          expense_id: expenseId || null,
        })
        .eq('id', billId)
        .eq('user_id', user.id);

      if (error) throw error;

      setBills(prev => prev.map(bill =>
        bill.id === billId 
          ? { ...bill, status: 'paid' as BillStatus, actualAmount, paidDate, expenseId, updatedAt: new Date().toISOString() } 
          : bill
      ));

      toast.success('Conta marcada como paga!');
    } catch (error) {
      console.error('Erro ao marcar como paga:', error);
      toast.error('Erro ao marcar conta como paga');
    }
  }, [user]);

  const linkExpenseToBill = useCallback(async (
    recurringAccountId: string,
    month: number,
    year: number,
    expenseId: string,
    actualAmount: number,
    paidDate: string,
    expectedDay: number = 1
  ) => {
    const existingBill = bills.find(b => 
      b.recurringAccountId === recurringAccountId && 
      b.month === month && 
      b.year === year
    );

    if (existingBill) {
      await markAsPaid(existingBill.id, actualAmount, paidDate, expenseId);
    } else {
      const dueDate = new Date(year, month - 1, expectedDay);
      await createBill({
        recurringAccountId,
        month,
        year,
        expectedAmount: actualAmount,
        actualAmount,
        dueDate: format(dueDate, 'yyyy-MM-dd'),
        paidDate,
        expenseId,
        status: 'paid',
      });
    }

    toast.success('Comprovante vinculado à conta recorrente!');
  }, [bills, createBill, markAsPaid]);

  const generateMonthlyBills = useCallback(async (
    accounts: { id: string; expectedDay?: number; averageAmount?: number }[],
    month: number,
    year: number
  ) => {
    if (!user) return [];

    const newBills: MonthlyBill[] = [];
    
    for (const account of accounts) {
      const exists = bills.some(b => 
        b.recurringAccountId === account.id && 
        b.month === month && 
        b.year === year
      );

      if (!exists) {
        const day = account.expectedDay || 1;
        const dueDate = new Date(year, month - 1, Math.min(day, 28));
        const today = new Date();
        
        const bill = await createBill({
          recurringAccountId: account.id,
          month,
          year,
          expectedAmount: account.averageAmount || 0,
          dueDate: format(dueDate, 'yyyy-MM-dd'),
          status: isBefore(dueDate, today) ? 'overdue' : 'pending',
        });
        
        if (bill) newBills.push(bill);
      }
    }

    return newBills;
  }, [user, bills, createBill]);

  const deleteBill = useCallback(async (id: string) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      const { error } = await supabase
        .from('monthly_bills')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setBills(prev => prev.filter(bill => bill.id !== id));
      toast.success('Conta removida com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta');
    }
  }, [user]);

  const updateBill = useCallback(async (id: string, updates: Partial<MonthlyBill>) => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }

    try {
      const updateData: Record<string, any> = {};
      if (updates.expectedAmount !== undefined) updateData.expected_amount = updates.expectedAmount;
      if (updates.actualAmount !== undefined) updateData.actual_amount = updates.actualAmount;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.paidDate !== undefined) updateData.paid_date = updates.paidDate;
      if (updates.expenseId !== undefined) updateData.expense_id = updates.expenseId;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      const { error } = await supabase
        .from('monthly_bills')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setBills(prev => prev.map(bill =>
        bill.id === id 
          ? { ...bill, ...updates, updatedAt: new Date().toISOString() } 
          : bill
      ));
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast.error('Erro ao atualizar conta');
    }
  }, [user]);

  const getBillsForPeriod = useCallback((month: number, year: number) => {
    return bills.filter(b => b.month === month && b.year === year);
  }, [bills]);

  const getPendingBills = useCallback(() => {
    return bills.filter(b => b.status === 'pending' || b.status === 'overdue');
  }, [bills]);

  const getPaidBillsForPeriod = useCallback((month: number, year: number) => {
    return bills.filter(b => b.month === month && b.year === year && b.status === 'paid');
  }, [bills]);

  return {
    bills,
    isLoading,
    createBill,
    markAsPaid,
    linkExpenseToBill,
    generateMonthlyBills,
    deleteBill,
    updateBill,
    getBillForMonth,
    getBillsForPeriod,
    getPendingBills,
    getPaidBillsForPeriod,
    refetch: loadBills,
  };
}
