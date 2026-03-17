CREATE OR REPLACE FUNCTION public.onboard_new_user(_company_name text, _whatsapp_number text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _user_id uuid;
    _entity_id uuid;
BEGIN
    _user_id := auth.uid();
    
    IF _user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Update profile with phone/whatsapp number and set role to owner
    UPDATE public.profiles 
    SET phone = _whatsapp_number, role = 'owner'
    WHERE id = _user_id;
    
    -- Update user_roles to owner
    UPDATE public.user_roles 
    SET role = 'owner'
    WHERE user_id = _user_id;

    -- Create entity (company) - use lowercase 'pj' to match check constraint
    INSERT INTO public.entities (name, document, type, color, created_by)
    VALUES (_company_name, '', 'pj', '220, 90%, 56%', _user_id)
    RETURNING id INTO _entity_id;

    -- Grant user access to the entity
    INSERT INTO public.user_entity_access (user_id, entity_id, assigned_by)
    VALUES (_user_id, _entity_id, _user_id);

    RETURN _entity_id;
END;
$function$