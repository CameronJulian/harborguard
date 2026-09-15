-- Accept an organization invitation atomically.
--
-- Security invariants:
-- - identity comes only from auth.uid() / auth.users;
-- - the authenticated email must match the invitation email;
-- - expired or previously accepted invitations cannot be consumed;
-- - only viewer/operator/manager invitations may be applied;
-- - an existing organization membership is never replaced;
-- - profile membership and invitation acceptance commit together.

CREATE FUNCTION public.accept_organization_invitation_atomic(
    p_token text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_user_email text;

    v_invitation_id uuid;
    v_invitation_organization_id uuid;
    v_invitation_email text;
    v_invitation_role text;
    v_invitation_accepted_at timestamptz;
    v_invitation_expires_at timestamptz;

    v_profile_found boolean := false;
    v_profile_organization_id uuid;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized'
            USING ERRCODE = '28000';
    END IF;

    IF p_token IS NULL OR btrim(p_token) = '' THEN
        RAISE EXCEPTION 'Invalid invitation token'
            USING ERRCODE = '22023';
    END IF;

    -- Serialize acceptance attempts for this authenticated identity.
    SELECT lower(btrim(u.email))
    INTO v_user_email
    FROM auth.users AS u
    WHERE u.id = v_user_id
      AND u.deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND OR v_user_email IS NULL OR v_user_email = '' THEN
        RAISE EXCEPTION 'Invalid session'
            USING ERRCODE = '28000';
    END IF;

    -- Serialize all consumers of this invitation token.
    SELECT
        invitation.id,
        invitation.organization_id,
        lower(btrim(invitation.email)),
        invitation.role,
        invitation.accepted_at,
        invitation.expires_at
    INTO
        v_invitation_id,
        v_invitation_organization_id,
        v_invitation_email,
        v_invitation_role,
        v_invitation_accepted_at,
        v_invitation_expires_at
    FROM public.organization_invitations AS invitation
    WHERE invitation.token = p_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found'
            USING ERRCODE = '22023';
    END IF;

    IF v_invitation_accepted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Invitation already accepted'
            USING ERRCODE = '22023';
    END IF;

    IF v_invitation_expires_at <= clock_timestamp() THEN
        RAISE EXCEPTION 'Invitation expired'
            USING ERRCODE = '22023';
    END IF;

    IF v_invitation_email <> v_user_email THEN
        RAISE EXCEPTION 'Invitation email does not match authenticated user'
            USING ERRCODE = '42501';
    END IF;

    IF v_invitation_role NOT IN ('viewer', 'operator', 'manager') THEN
        RAISE EXCEPTION 'Invitation role is not permitted'
            USING ERRCODE = '22023';
    END IF;

    -- Lock an existing profile before deciding whether membership can change.
    SELECT
        true,
        profile.organization_id
    INTO
        v_profile_found,
        v_profile_organization_id
    FROM public.profiles AS profile
    WHERE profile.id = v_user_id
    FOR UPDATE;

    IF v_profile_found AND v_profile_organization_id IS NOT NULL THEN
        RAISE EXCEPTION 'User already belongs to an organization'
            USING ERRCODE = '23505';
    END IF;

    IF v_profile_found THEN
        -- The profile exists but has no organization membership yet.
        UPDATE public.profiles
        SET
            organization_id = v_invitation_organization_id,
            role = v_invitation_role
        WHERE id = v_user_id
          AND organization_id IS NULL;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Profile membership changed'
                USING ERRCODE = '40001';
        END IF;
    ELSE
        INSERT INTO public.profiles (
            id,
            email,
            full_name,
            role,
            organization_id
        )
        VALUES (
            v_user_id,
            v_user_email,
            COALESCE(
                NULLIF(split_part(v_user_email, '@', 1), ''),
                'HarborGuard User'
            ),
            v_invitation_role,
            v_invitation_organization_id
        );
    END IF;

    UPDATE public.organization_invitations
    SET accepted_at = clock_timestamp()
    WHERE id = v_invitation_id
      AND accepted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation acceptance changed concurrently'
            USING ERRCODE = '40001';
    END IF;

    RETURN v_invitation_organization_id;
END;
$function$;

REVOKE ALL
ON FUNCTION public.accept_organization_invitation_atomic(text)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE
ON FUNCTION public.accept_organization_invitation_atomic(text)
TO authenticated;
