export type AppRole = 'admin' | 'employee' | 'owner';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  avatar_url: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  menu_permissions?: MenuPermission[];
}

export interface UserEntityAccess {
  id: string;
  user_id: string;
  entity_id: string;
  assigned_by: string | null;
  created_at: string;
}

export interface UserWithAccess extends Profile {
  entity_access: UserEntityAccess[];
}

// Menu permissions for employees
export type MenuPermission = 
  | 'dashboard'
  | 'bills'
  | 'launch_expense'
  | 'upload_ai'
  | 'expense_list'
  | 'settings';

export const MENU_LABELS: Record<MenuPermission, string> = {
  dashboard: 'Dashboard',
  bills: 'Contas a Pagar',
  launch_expense: 'Lançar Despesa',
  upload_ai: 'Upload IA',
  expense_list: 'Lista de Despesas',
  settings: 'Configurações',
};

export const ALL_MENUS: MenuPermission[] = [
  'dashboard',
  'bills',
  'launch_expense',
  'upload_ai',
  'expense_list',
  'settings',
];
