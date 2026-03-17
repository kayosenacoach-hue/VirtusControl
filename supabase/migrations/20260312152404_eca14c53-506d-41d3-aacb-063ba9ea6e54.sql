-- Create subscriptions table
CREATE TABLE public.subscriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mercado_pago_subscription_id text,
    plan_name text NOT NULL DEFAULT 'pro',
    price numeric NOT NULL DEFAULT 39.00,
    status text NOT NULL DEFAULT 'pending',
    trial_end timestamp with time zone,
    next_billing_date timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
    subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
    mercado_pago_payment_id text,
    amount numeric NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    payment_date timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Subscriptions RLS: users can view their own, service role can manage all
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Service role can insert subscriptions" ON public.subscriptions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can update subscriptions" ON public.subscriptions
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Payments RLS
CREATE POLICY "Users can view own payments" ON public.payments
    FOR SELECT TO authenticated
    USING (entity_id IN (SELECT entity_id FROM public.subscriptions WHERE user_id = auth.uid()));

-- Allow webhook (service role) to insert/update via security definer function
CREATE OR REPLACE FUNCTION public.upsert_subscription_from_webhook(
    _mercado_pago_subscription_id text,
    _status text,
    _next_billing_date timestamp with time zone DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    UPDATE public.subscriptions
    SET status = _status,
        next_billing_date = COALESCE(_next_billing_date, next_billing_date),
        updated_at = now()
    WHERE mercado_pago_subscription_id = _mercado_pago_subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_payment_from_webhook(
    _mercado_pago_payment_id text,
    _mercado_pago_subscription_id text,
    _amount numeric,
    _status text,
    _payment_date timestamp with time zone
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    _sub_record RECORD;
BEGIN
    SELECT id, entity_id INTO _sub_record
    FROM public.subscriptions
    WHERE mercado_pago_subscription_id = _mercado_pago_subscription_id
    LIMIT 1;

    IF _sub_record IS NOT NULL THEN
        INSERT INTO public.payments (entity_id, subscription_id, mercado_pago_payment_id, amount, status, payment_date)
        VALUES (_sub_record.entity_id, _sub_record.id, _mercado_pago_payment_id, _amount, _status, _payment_date)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

-- Update trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();