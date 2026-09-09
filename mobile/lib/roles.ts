import type { Icon } from "@/components/ui";

// Mirrors server/src/auth/enums/role.enum.ts. ADMIN is deliberately excluded
// from SELF_ASSIGNABLE — nobody can self-register as admin.
export type UserRole = "landlord" | "property_manager" | "staff" | "tenant" | "vendor" | "admin";

export const SELF_ASSIGNABLE_ROLES: { id: UserRole; title: string; sub: string; icon: Icon }[] = [
  { id: "landlord", title: "Landlord", sub: "Own and manage your properties", icon: "business-outline" },
  {
    id: "property_manager",
    title: "Property Manager",
    sub: "Manage properties on an owner's behalf",
    icon: "briefcase-outline",
  },
  { id: "staff", title: "Staff", sub: "Manage day-to-day operations", icon: "people-outline" },
  {
    id: "tenant",
    title: "Tenant",
    sub: "View lease, pay rent, request maintenance",
    icon: "document-text-outline",
  },
  { id: "vendor", title: "Vendor", sub: "Provide services and manage jobs", icon: "construct-outline" },
];

export function roleLabel(role: UserRole): string {
  return SELF_ASSIGNABLE_ROLES.find((r) => r.id === role)?.title ?? "Admin";
}

// ── Role groups ────────────────────────────────────────────────────
// Central place for "who sees what". Screens and menus branch on these so a
// tenant/vendor never sees portfolio-management UI they can't act on.

/** Roles that manage a property portfolio (see everything they own/manage). */
export const MANAGEMENT_ROLES: ReadonlySet<UserRole> = new Set([
  "landlord",
  "property_manager",
  "staff",
  "admin",
]);

/** Roles that are self-service occupants/service providers (slimmed-down app). */
export const SELF_SERVICE_ROLES: ReadonlySet<UserRole> = new Set([
  "tenant",
  "vendor",
]);

export const isManagementRole = (role?: UserRole | null) =>
  !!role && MANAGEMENT_ROLES.has(role);

export const isTenant = (role?: UserRole | null) => role === "tenant";
export const isVendor = (role?: UserRole | null) => role === "vendor";
export const isAdmin = (role?: UserRole | null) => role === "admin";
