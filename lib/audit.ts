import { supabaseAdmin } from "@/lib/supabase-admin";

type AuditLogInput = {
  organizationId: string;
  userId?: string | null;
  action: string;
  target?: string | null;
  metadata?: any;
};

export async function createAuditLog({
  organizationId,
  userId,
  action,
  target,
  metadata,
}: AuditLogInput) {
  try {
    await supabaseAdmin
      .from("audit_logs")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        action,
        target,
        metadata,
      });
  } catch (err) {
    console.error(
      "Failed to create audit log:",
      err
    );
  }
}