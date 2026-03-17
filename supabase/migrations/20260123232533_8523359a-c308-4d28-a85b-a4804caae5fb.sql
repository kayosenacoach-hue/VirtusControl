-- Tabela de despesas
CREATE TABLE public.expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    payment_method TEXT,
    notes TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de contas recorrentes (fixas)
CREATE TABLE public.recurring_accounts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    expected_amount DECIMAL(12,2),
    expected_day INTEGER CHECK (expected_day >= 1 AND expected_day <= 31),
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de contas mensais (instâncias mensais das contas recorrentes)
CREATE TABLE public.monthly_bills (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recurring_account_id UUID REFERENCES public.recurring_accounts(id) ON DELETE CASCADE,
    entity_id UUID REFERENCES public.entities(id) ON DELETE SET NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    expected_amount DECIMAL(12,2),
    actual_amount DECIMAL(12,2),
    expected_day INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    paid_date DATE,
    expense_id UUID REFERENCES public.expenses(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(recurring_account_id, month, year)
);

-- Habilitar RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_bills ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para expenses
CREATE POLICY "Users can view own expenses" ON public.expenses
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses" ON public.expenses
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses" ON public.expenses
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses" ON public.expenses
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para recurring_accounts
CREATE POLICY "Users can view own recurring accounts" ON public.recurring_accounts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring accounts" ON public.recurring_accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring accounts" ON public.recurring_accounts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring accounts" ON public.recurring_accounts
    FOR DELETE USING (auth.uid() = user_id);

-- Políticas RLS para monthly_bills
CREATE POLICY "Users can view own monthly bills" ON public.monthly_bills
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly bills" ON public.monthly_bills
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly bills" ON public.monthly_bills
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own monthly bills" ON public.monthly_bills
    FOR DELETE USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recurring_accounts_updated_at
    BEFORE UPDATE ON public.recurring_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_bills_updated_at
    BEFORE UPDATE ON public.monthly_bills
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_expenses_entity_id ON public.expenses(entity_id);
CREATE INDEX idx_expenses_date ON public.expenses(date);
CREATE INDEX idx_recurring_accounts_user_id ON public.recurring_accounts(user_id);
CREATE INDEX idx_monthly_bills_user_id ON public.monthly_bills(user_id);
CREATE INDEX idx_monthly_bills_period ON public.monthly_bills(month, year);