import { hasPermission, Permission } from "./rbac";

export function requirePermission(
  role: string | null | undefined,
  permission: Permission
) {
  const allowed = hasPermission(role, permission);

  if (!allowed) {
    throw new Error(
      "You do not have permission to perform this action."
    );
  }

  return true;
}