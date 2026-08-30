-- Support read receipts and unread counters.
-- Authorization is enforced inside SECURITY DEFINER functions; clients never choose a sender/reader identity.

CREATE OR REPLACE FUNCTION public.mark_support_messages_read(p_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_id uuid;
  v_assigned_staff_id uuid;
  v_is_admin boolean := false;
  v_updated integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT user_id, assigned_staff_id
    INTO v_user_id, v_assigned_staff_id
  FROM public.support_conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  BEGIN
    v_is_admin := public.is_admin(v_uid);
  EXCEPTION WHEN undefined_function THEN
    v_is_admin := false;
  END;

  IF v_uid <> v_user_id
     AND v_uid <> COALESCE(v_assigned_staff_id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND NOT v_is_admin THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.support_messages
  SET is_read = true
  WHERE conversation_id = p_conversation_id
    AND sender_id <> v_uid
    AND is_read = false;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_support_unread_count(p_conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user_id uuid;
  v_assigned_staff_id uuid;
  v_is_admin boolean := false;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT user_id, assigned_staff_id
    INTO v_user_id, v_assigned_staff_id
  FROM public.support_conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'conversation not found';
  END IF;

  BEGIN
    v_is_admin := public.is_admin(v_uid);
  EXCEPTION WHEN undefined_function THEN
    v_is_admin := false;
  END;

  IF v_uid <> v_user_id
     AND v_uid <> COALESCE(v_assigned_staff_id, '00000000-0000-0000-0000-000000000000'::uuid)
     AND NOT v_is_admin THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT count(*)::integer
    INTO v_count
  FROM public.support_messages
  WHERE conversation_id = p_conversation_id
    AND sender_id <> v_uid
    AND is_read = false;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_support_messages_read(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_support_unread_count(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_support_messages_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_unread_count(uuid) TO authenticated;
