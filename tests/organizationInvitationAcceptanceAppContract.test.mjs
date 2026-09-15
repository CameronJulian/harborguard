import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const api = fs.readFileSync(
  "app/api/organization-invitations/accept/route.ts",
  "utf8",
);

const page = fs.readFileSync(
  "app/invite/[token]/page.tsx",
  "utf8",
);

test(
  "acceptance API uses authenticated user-scoped Supabase RPC",
  () => {
    assert.match(
      api,
      /request\.headers\.get\("authorization"\)/,
    );

    assert.match(
      api,
      /Authorization:\s*`Bearer \$\{accessToken\}`/,
    );

    assert.match(
      api,
      /userClient\.auth\.getUser\(accessToken\)/,
    );

    assert.match(
      api,
      /userClient\.rpc\(\s*"accept_organization_invitation_atomic"/,
    );

    assert.match(
      api,
      /p_token:\s*invitationToken/,
    );
  },
);

test(
  "acceptance API does not bypass the authenticated RPC boundary",
  () => {
    assert.doesNotMatch(
      api,
      /supabaseAdmin/,
    );

    assert.doesNotMatch(
      api,
      /SUPABASE_SERVICE_ROLE_KEY/,
    );

    assert.doesNotMatch(
      api,
      /requireOrganization/,
    );

    assert.doesNotMatch(
      api,
      /\.from\(\s*["']organization_invitations["']\s*\)/,
    );

    assert.doesNotMatch(
      api,
      /\.from\(\s*["']profiles["']\s*\)/,
    );
  },
);

test(
  "acceptance API validates bearer auth and invitation token",
  () => {
    assert.match(
      api,
      /status:\s*401/,
    );

    assert.match(
      api,
      /Invitation token is required\./,
    );

    assert.match(
      api,
      /Invalid request body\./,
    );
  },
);

test(
  "acceptance API maps canonical RPC failures without exposing raw database errors",
  () => {
    for (const signal of [
      "invitation expired",
      "invitation already accepted",
      "invitation email does not match authenticated user",
      "user already belongs to an organization",
      "invitation not found",
    ]) {
      assert.ok(
        api.toLowerCase().includes(signal),
        "missing error mapping for: " + signal,
      );
    }

    assert.doesNotMatch(
      api,
      /error:\s*acceptanceError\.message/,
    );
  },
);

test(
  "invite page preserves the invitation path through root authentication",
  () => {
    assert.match(
      page,
      /\/\?redirectedFrom=/,
    );

    assert.match(
      page,
      /encodeURIComponent\(destination\)/,
    );

    assert.match(
      page,
      /`\/invite\/\$\{token\}`/,
    );

    assert.match(
      page,
      /supabase\.auth\.getSession\(\)/,
    );
  },
);

test(
  "invite page requires explicit acceptance and does not auto-consume the token",
  () => {
    assert.match(
      page,
      /Accept Invitation/,
    );

    assert.match(
      page,
      /onClick=\{acceptInvitation\}/,
    );

    assert.match(
      page,
      /fetchWithAuth\(\s*"\/api\/organization-invitations\/accept"/,
    );

    const effectStart =
      page.indexOf("useEffect(() =>");

    const acceptFunctionStart =
      page.indexOf("async function acceptInvitation()");

    assert.ok(
      effectStart >= 0,
      "session-check effect missing",
    );

    assert.ok(
      acceptFunctionStart > effectStart,
      "acceptance function should follow the session-check effect",
    );

    const effectSection =
      page.slice(effectStart, acceptFunctionStart);

    assert.equal(
      effectSection.includes("acceptInvitation()"),
      false,
      "invitation must not be accepted automatically from useEffect",
    );
  },
);

test(
  "invite page sends only the invitation token to the acceptance API",
  () => {
    assert.match(
      page,
      /JSON\.stringify\(\{\s*token,\s*\}\)/,
    );

    assert.doesNotMatch(
      page,
      /organizationId/,
    );

    assert.doesNotMatch(
      page,
      /inviteRole/,
    );
  },
);

test(
  "unauthenticated invitee is returned to the same invitation after authentication",
  () => {
    assert.match(
      page,
      /const destination\s*=\s*token[\s\S]*?`\/invite\/\$\{token\}`/,
    );

    assert.match(
      page,
      /router\.replace\([\s\S]*?redirectedFrom=\$\{encodeURIComponent\(destination\)\}/,
    );
  },
);

test(
  "successful acceptance exposes an explicit dashboard continuation",
  () => {
    assert.match(
      page,
      /setAccepted\(true\)/,
    );

    assert.match(
      page,
      /router\.replace\("\/dashboard"\)/,
    );

    assert.match(
      page,
      /Continue to Dashboard/,
    );
  },
);