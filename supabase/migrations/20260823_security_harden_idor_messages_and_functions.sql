-- Security hardening: prevent message impersonation/tampering and pin mutable function search_path.

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_user_insert_own ON public.messages;
CREATE POLICY messages_user_insert_own
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = (select auth.uid())
  AND sender_role = 'user'
  AND is_read = false
  AND read_by_user = true
  AND read_by_admin = false
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = public.messages.order_id
      AND o.user_id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS messages_user_update_read_own ON public.messages;
CREATE POLICY messages_user_update_read_own
ON public.messages
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = public.messages.order_id
      AND o.user_id = (select auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = public.messages.order_id
      AND o.user_id = (select auth.uid())
  )
);

CREATE OR REPLACE FUNCTION public.prevent_user_message_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (select auth.uid())
      AND p.role = 'admin'
  ) INTO is_admin;

  IF is_admin THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.order_id IS DISTINCT FROM OLD.order_id
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.sender_role IS DISTINCT FROM OLD.sender_role
     OR NEW.message IS DISTINCT FROM OLD.message
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.read_by_admin IS DISTINCT FROM OLD.read_by_admin
     OR NEW.is_read IS DISTINCT FROM OLD.is_read THEN
    RAISE EXCEPTION 'ویرایش این بخش از پیام مجاز نیست.';
  END IF;

  IF NEW.read_by_user IS DISTINCT FROM OLD.read_by_user
     AND NEW.read_by_user IS NOT TRUE THEN
    RAISE EXCEPTION 'علامت‌گذاری پیام به عنوان خوانده‌شده مجاز است.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_message_tampering ON public.messages;
CREATE TRIGGER trg_prevent_user_message_tampering
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.prevent_user_message_tampering();

CREATE OR REPLACE FUNCTION public.generate_service_slug(input_title text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text;
BEGIN
  result := lower(trim(regexp_replace(coalesce(input_title, ''), '[[:space:][:punct:]]+', '-', 'g')));
  result := regexp_replace(result, '(^-+|-+$)', '', 'g');
  RETURN NULLIF(result, '');
END;
$$;
