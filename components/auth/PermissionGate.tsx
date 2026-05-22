"use client";

import { ReactNode } from "react";
import { Permission, hasPermission } from "@/lib/rbac";
import { useUserRole } from "@/hooks/useUserRole";

type Props = {
  permission: Permission;
  children: ReactNode;
  fallback?: ReactNode;
};

export default function PermissionGate({
  permission,
  children,
  fallback = null,
}: Props) {
  const { role, loading } = useUserRole();

  if (loading) return null;

  if (!hasPermission(role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}