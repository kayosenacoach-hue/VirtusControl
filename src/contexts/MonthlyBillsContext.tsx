import React, { createContext, useContext, ReactNode } from 'react';
import { useMonthlyBills } from '@/hooks/useMonthlyBills';
import { MonthlyBill } from '@/types/recurring';

interface MonthlyBillsContextType {
  bills: MonthlyBill[];
  isLoading: boolean;
  createBill: (bill: Omit<MonthlyBill, 'id' | 'createdAt' | 'updatedAt'>) => Promise<MonthlyBill | null>;
  markAsPaid: (billId: string, actualAmount: number, paidDate: string, expenseId?: string) => Promise<void>;
  linkExpenseToBill: (recurringAccountId: string, month: number, year: number, expenseId: string, actualAmount: number, paidDate: string, expectedDay?: number) => Promise<void>;
  generateMonthlyBills: (accounts: { id: string; expectedDay?: number; averageAmount?: number }[], month: number, year: number) => Promise<MonthlyBill[]>;
  deleteBill: (id: string) => Promise<void>;
  updateBill: (id: string, updates: Partial<MonthlyBill>) => Promise<void>;
  getBillForMonth: (recurringAccountId: string, month: number, year: number) => MonthlyBill | undefined;
  getBillsForPeriod: (month: number, year: number) => MonthlyBill[];
  getPendingBills: () => MonthlyBill[];
  getPaidBillsForPeriod: (month: number, year: number) => MonthlyBill[];
  refetch: () => Promise<void>;
}

const MonthlyBillsContext = createContext<MonthlyBillsContextType | undefined>(undefined);

export function MonthlyBillsProvider({ children }: { children: ReactNode }) {
  const billsData = useMonthlyBills();

  return (
    <MonthlyBillsContext.Provider value={billsData}>
      {children}
    </MonthlyBillsContext.Provider>
  );
}

export function useMonthlyBillsContext() {
  const context = useContext(MonthlyBillsContext);
  if (context === undefined) {
    throw new Error('useMonthlyBillsContext must be used within a MonthlyBillsProvider');
  }
  return context;
}

// Safe hook that returns null if outside provider (useful for optional features)
export function useMonthlyBillsSafe() {
  return useContext(MonthlyBillsContext);
}
