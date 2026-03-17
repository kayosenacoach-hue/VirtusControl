-- Create table to store pending WhatsApp expenses
CREATE TABLE public.pending_whatsapp_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  extracted_data JSONB NOT NULL,
  file_url TEXT,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  claimed_by UUID REFERENCES auth.users(id),
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_whatsapp_expenses ENABLE ROW LEVEL SECURITY;

-- Admin can see all pending expenses
CREATE POLICY "Admins can view all pending expenses"
ON public.pending_whatsapp_expenses
FOR SELECT
USING (public.is_admin());

-- Admin can update (claim) pending expenses
CREATE POLICY "Admins can update pending expenses"
ON public.pending_whatsapp_expenses
FOR UPDATE
USING (public.is_admin());

-- Admin can delete pending expenses
CREATE POLICY "Admins can delete pending expenses"
ON public.pending_whatsapp_expenses
FOR DELETE
USING (public.is_admin());

-- Service role can insert (from webhook)
CREATE POLICY "Service role can insert pending expenses"
ON public.pending_whatsapp_expenses
FOR INSERT
WITH CHECK (true);