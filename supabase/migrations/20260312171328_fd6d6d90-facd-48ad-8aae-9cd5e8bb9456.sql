-- Add status column to entities
ALTER TABLE public.entities 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Add check constraint for entity status
ALTER TABLE public.entities 
ADD CONSTRAINT entities_status_check CHECK (status IN ('active', 'blocked', 'suspended'));

-- Create admin_logs table
CREATE TABLE public.admin_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL,
    action text NOT NULL,
    entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
    target_user_id uuid,
    description text,
    metadata jsonb DEFAULT '{}',
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on admin_logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view all logs"
ON public.admin_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Only admins can insert logs
CREATE POLICY "Admins can insert logs"
ON public.admin_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Create admin read policies for subscriptions and payments (admins see all)
CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can update all subscriptions"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (public.is_admin());