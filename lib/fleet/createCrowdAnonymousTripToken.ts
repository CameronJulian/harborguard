import { createHash } from "crypto";

export function createCrowdAnonymousTripToken(
  tripId: string
): string {
  return createHash("sha256")
    .update(
      `harborguard:crowd-segment-traversal:v1:${tripId}`
    )
    .digest("hex");
}
