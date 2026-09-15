-- Create the organization and attach its profile in one transaction.
-- Identity comes from the authenticated session, never a request user ID.
CREATE FUNCTION public.complete_onboarding_atomic(
    p_organization_name text DEFAULT NULL,
    p_fleet_size integer DEFAULT 0,
    p_vehicle_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_email text;
    v_organization_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '28000';
    END IF;

    -- The auth row exists even when the profile does not.
    -- Serialize onboarding calls for this user.
    SELECT u.email INTO v_email
    FROM auth.users AS u
    WHERE u.id = v_user_id
      AND u.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid session' USING ERRCODE = '28000';
    END IF;

    -- Never replace an existing profile's name, email or role.
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        v_user_id,
        v_email,
        COALESCE(NULLIF(split_part(v_email, '@', 1), ''),
                 'HarborGuard User'),
        'manager'
    )
    ON CONFLICT (id) DO NOTHING;

    SELECT p.organization_id INTO STRICT v_organization_id
    FROM public.profiles AS p
    WHERE p.id = v_user_id
    FOR UPDATE;

    IF v_organization_id IS NOT NULL THEN
        RETURN v_organization_id;
    END IF;

    IF p_fleet_size IS NULL OR p_fleet_size < 0 THEN
        RAISE EXCEPTION 'Invalid fleet size' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.organizations (
        name, fleet_size, first_vehicle, subscription_status,
        plan, trial_ends_at, seats, billing_email
    )
    VALUES (
        COALESCE(
            NULLIF(btrim(p_organization_name), ''),
            COALESCE(v_email, 'HarborGuard User') || '''s Organization'
        ),
        p_fleet_size,
        NULLIF(btrim(p_vehicle_name), ''),
        'trialing',
        'trial',
        now() + interval '14 days',
        1,
        v_email
    )
    RETURNING id INTO v_organization_id;

    UPDATE public.profiles
    SET organization_id = v_organization_id
    WHERE id = v_user_id
      AND organization_id IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Profile membership changed';
    END IF;

    RETURN v_organization_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_onboarding_atomic(text, integer, text)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.complete_onboarding_atomic(text, integer, text)
TO authenticated;
