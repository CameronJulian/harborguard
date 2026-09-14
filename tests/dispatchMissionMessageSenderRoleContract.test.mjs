import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const routePath =
  "app/api/dispatch/missions/[id]/messages/route.ts";

const route =
  fs.readFileSync(routePath, "utf8");

test("mission message sender role is derived from trusted server identity", () => {
  assert.match(
    route,
    /const \{ supabase, organizationId, user, role \} = await requireOrganization\(\);/
  );

  assert.match(
    route,
    /const trustedSenderRole\s*=\s*[\s\S]*role === "driver"[\s\S]*\? "driver"[\s\S]*: "dispatcher";/
  );

  assert.match(
    route,
    /sender_role:\s*trustedSenderRole/
  );
});

test("client supplied senderRole cannot control persisted sender identity", () => {
  assert.doesNotMatch(
    route,
    /sender_role:\s*body\.senderRole/
  );

  assert.doesNotMatch(
    route,
    /sender_role:\s*body\["senderRole"\]/
  );
});

test("authenticated user id remains the persisted sender id", () => {
  assert.match(
    route,
    /sender_id:\s*user\?\.id\s*\|\|\s*null/
  );
});
