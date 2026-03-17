export type ExpenseCategory = 
  | 'operacional' 
  | 'pessoal' 
  | 'marketing' 
  | 'fornecedores' 
  | 'impostos' 
  | 'equipamentos' 
  | 'outros';

export type PaymentMethod = 
  | 'dinheiro' 
  | 'cartao_credito' 
  | 'cartao_debito' 
  | 'pix' 
  | 'boleto' 
  | 'transferencia';

export type PersonType = 'pj' | 'pf';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  paymentMethod: PaymentMethod;
  personType: PersonType;
  entityId?: string; // ID da entidade (empresa/pessoa) associada
  recurringAccountId?: string; // ID da conta fixa associada
  isRecurring: boolean; // Se é uma despesa recorrente
  notes?: string;
  createdAt: string;
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  operacional: 'Operacional',
  pessoal: 'Pessoal',
  marketing: 'Marketing',
  fornecedores: 'Fornecedores',
  impostos: 'Impostos',
  equipamentos: 'Equipamentos',
  outros: 'Outros',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  operacional: 'hsl(200 70% 50%)',
  pessoal: 'hsl(280 60% 55%)',
  marketing: 'hsl(340 75% 55%)',
  fornecedores: 'hsl(25 85% 55%)',
  impostos: 'hsl(0 65% 50%)',
  equipamentos: 'hsl(220 65% 55%)',
  outros: 'hsl(180 25% 50%)',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  pix: 'PIX',
  boleto: 'Boleto',
  transferencia: 'Transferência',
};

export const PERSON_TYPE_LABELS: Record<PersonType, string> = {
  pj: 'Pessoa Jurídica (PJ)',
  pf: 'Pessoa Física (PF)',
};
