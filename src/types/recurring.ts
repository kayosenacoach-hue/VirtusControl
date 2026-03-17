export type RecurrenceType = 'pontual' | 'mensal' | 'semanal' | 'quinzenal' | 'anual';
export type BillStatus = 'pending' | 'paid' | 'overdue';

export interface RecurringAccount {
  id: string;
  name: string; // Ex: "Conta de Energia", "Internet", "Aluguel"
  category: import('./expense').ExpenseCategory;
  entityId?: string; // Associação com entidade (empresa/pessoa)
  recurrence: RecurrenceType;
  expectedDay?: number; // Dia esperado de vencimento (1-31)
  averageAmount?: number; // Valor médio para referência
  notes?: string;
  isActive: boolean;
  createdAt: string;
}

// Represents a monthly instance of a recurring bill
export interface MonthlyBill {
  id: string;
  recurringAccountId: string;
  month: number; // 1-12
  year: number;
  expectedAmount: number; // Valor esperado (do cadastro)
  actualAmount?: number; // Valor real pago
  dueDate: string; // Data de vencimento
  paidDate?: string; // Data de pagamento
  expenseId?: string; // Link to the expense record
  status: BillStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const RECURRENCE_LABELS: Record<RecurrenceType, string> = {
  pontual: 'Pontual (única vez)',
  mensal: 'Mensal',
  semanal: 'Semanal',
  quinzenal: 'Quinzenal',
  anual: 'Anual',
};

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  overdue: 'Vencido',
};
