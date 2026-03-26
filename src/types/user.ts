export interface Profile {
  id: string;
  email?: string;
  full_name?: string;
  role: 'owner' | 'admin' | 'manager' | 'user';
  avatar_url?: string;
  phone?: string;
  whatsapp_number?: string;
  document?: string;
  company_name?: string;
  createdAt?: string;
  updatedAt?: string;
  menu_access?: string[]; // Adicionado para a gestão de acessos do Users.tsx
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused' | 'pending';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  paymentMethod?: string;
}

// RESTAURADO: As listas de menus que a página Users.tsx precisa para funcionar
export const MENU_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  lancamentos: 'Lançar Despesas',
  despesas: 'Consultar Despesas',
  contas: 'Contas Fixas',
  empresas: 'Configurações',
  usuarios: 'Gerenciar Usuários',
  ia: 'Upload de Comprovantes (IA)',
  relatorios: 'Relatórios'
};

export const ALL_MENUS = Object.keys(MENU_LABELS);