-- Fix RLS policies on pending_whatsapp_expenses to use whatsapp_number instead of phone

DROP POLICY IF EXISTS "Users can view pending expenses by phone" ON public.pending_whatsapp_expenses;
DROP POLICY IF EXISTS "Users can update pending expenses" ON public.pending_whatsapp_expenses;
DROP POLICY IF EXISTS "Users can delete pending expenses" ON public.pending_whatsapp_expenses;

CREATE POLICY "Users can view pending expenses by whatsapp"
  ON public.pending_whatsapp_expenses FOR SELECT
  USING (
    is_admin() OR (phone = (
      SELECT profiles.whatsapp_number
      FROM profiles
      WHERE profiles.id = auth.uid()
    ))
  );

CREATE POLICY "Users can update pending expenses"
  ON public.pending_whatsapp_expenses FOR UPDATE
  USING (
    is_admin() OR (phone = (
      SELECT profiles.whatsapp_number
      FROM profiles
      WHERE profiles.id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete pending expenses"
  ON public.pending_whatsapp_expenses FOR DELETE
  USING (
    is_admin() OR (phone = (
      SELECT profiles.whatsapp_number
      FROM profiles
      WHERE profiles.id = auth.uid()
    ))
  );