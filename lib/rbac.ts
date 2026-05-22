export type UserRole =
  | "owner"
  | "admin"
  | "operator"
  | "viewer";

export type Permission =
  | "billing:manage"
  | "reports:manage"
  | "vehicles:manage"
  | "incidents:resolve"
  | "organization:manage"
  | "analytics:view"
  | "fleet:view";

export const rolePermissions: Record<UserRole, Permission[]> = {
  owner: [
    "billing:manage",
    "reports:manage",
    "vehicles:manage",
    "incidents:resolve",
    "organization:manage",
    "analytics:view",
    "fleet:view",
  ],
  admin: [
    "reports:manage",
    "vehicles:manage",
    "incidents:resolve",
    "analytics:view",
    "fleet:view",
  ],
  operator: [
    "reports:manage",
    "vehicles:manage",
    "incidents:resolve",
    "fleet:view",
  ],
  viewer: [
    "analytics:view",
    "fleet:view",
  ],
};

export function hasPermission(
  role: string | null | undefined,
  permission: Permission
) {
  if (!role) return false;

  const permissions =
    rolePermissions[role as UserRole] || [];

  return permissions.includes(permission);
}