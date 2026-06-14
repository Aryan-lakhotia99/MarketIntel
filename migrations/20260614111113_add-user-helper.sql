-- SECURITY DEFINER function that can access auth.users
-- Looks up or provisions a user in auth.users by email, returns their UUID
CREATE OR REPLACE FUNCTION public.get_or_create_insforge_user(p_email TEXT, p_name TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Check if user already exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email));

    -- If not found, create the user in auth.users
    IF v_user_id IS NULL THEN
        INSERT INTO auth.users (email, email_verified, created_at, updated_at, profile, metadata, is_project_admin, is_anonymous)
        VALUES (
            lower(trim(p_email)),
            true,
            now(),
            now(),
            jsonb_build_object('name', COALESCE(p_name, split_part(p_email, '@', 1))),
            '{}'::jsonb,
            false,
            false
        )
        RETURNING id INTO v_user_id;
    END IF;

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow authenticated and anon roles to call this function
GRANT EXECUTE ON FUNCTION public.get_or_create_insforge_user(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_insforge_user(TEXT, TEXT) TO anon;
