-- Add phone column to profiles table for linking WhatsApp
ALTER TABLE public.profiles 
ADD COLUMN phone TEXT;

-- Create index for phone lookup
CREATE INDEX idx_profiles_phone ON public.profiles(phone);

-- Update RLS policy for pending_whatsapp_expenses to allow users to see their own by phone
DROP POLICY IF EXISTS "Admins can view all pending expenses" ON public.pending_whatsapp_expenses;

CREATE POLICY "Users can view pending expenses by phone"
ON public.pending_whatsapp_expenses
FOR SELECT
USING (
  public.is_admin() OR 
  phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
);

-- Users can claim their own pending expenses
DROP POLICY IF EXISTS "Admins can update pending expenses" ON public.pending_whatsapp_expenses;

CREATE POLICY "Users can update pending expenses"
ON public.pending_whatsapp_expenses
FOR UPDATE
USING (
  public.is_admin() OR 
  phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
);

-- Users can delete their own pending expenses
DROP POLICY IF EXISTS "Admins can delete pending expenses" ON public.pending_whatsapp_expenses;

CREATE POLICY "Users can delete pending expenses"
ON public.pending_whatsapp_expenses
FOR DELETE
USING (
  public.is_admin() OR 
  phone = (SELECT phone FROM public.profiles WHERE id = auth.uid())
);