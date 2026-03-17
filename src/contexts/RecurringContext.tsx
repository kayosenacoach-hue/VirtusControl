import React, { createContext, useContext, ReactNode } from 'react';
import { useRecurringAccounts } from '@/hooks/useRecurringAccounts';
import { RecurringAccount } from '@/types/recurring';

interface RecurringContextType {
  accounts: RecurringAccount[];
  isLoading: boolean;
  addAccount: (account: Omit<RecurringAccount, 'id' | 'createdAt'>) => Promise<RecurringAccount | null>;
  updateAccount: (id: string, updates: Partial<Omit<RecurringAccount, 'id' | 'createdAt'>>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const RecurringContext = createContext<RecurringContextType | undefined>(undefined);

export function RecurringProvider({ children }: { children: ReactNode }) {
  const recurringData = useRecurringAccounts();

  return (
    <RecurringContext.Provider value={recurringData}>
      {children}
    </RecurringContext.Provider>
  );
}

export function useRecurringContext() {
  const context = useContext(RecurringContext);
  if (context === undefined) {
    throw new Error('useRecurringContext must be used within a RecurringProvider');
  }
  return context;
}
