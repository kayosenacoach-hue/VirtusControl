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