import { ROLES } from "../auth/roles";

export const NAV_ITEMS = [
  { path: "/", label: "Dashboard", allowedRoles: [ROLES.OWNER, ROLES.OPS, ROLES.CLEANER] },
  { path: "/clients", label: "Clients", allowedRoles: [ROLES.OWNER, ROLES.OPS] },
  { path: "/schedule", label: "Schedule", allowedRoles: [ROLES.OWNER, ROLES.OPS, ROLES.CLEANER] },
  { path: "/teams", label: "Teams", allowedRoles: [ROLES.OWNER, ROLES.OPS] },
  { path: "/employees", label: "Employees", allowedRoles: [ROLES.OWNER, ROLES.OPS] },
  { path: "/finance", label: "Finance", allowedRoles: [ROLES.OWNER, ROLES.OPS] },
  { path: "/products", label: "Products", allowedRoles: [ROLES.OWNER, ROLES.OPS] },
  { path: "/visits", label: "Visits", allowedRoles: [ROLES.OWNER, ROLES.OPS, ROLES.CLEANER] },
  { path: "/monetization", label: "Monetization", allowedRoles: [ROLES.OWNER, ROLES.OPS] },
  { path: "/crm", label: "CRM & Growth", allowedRoles: [ROLES.OWNER, ROLES.OPS] },
  { path: "/bookings", label: "Bookings", allowedRoles: [ROLES.OWNER, ROLES.OPS] },
  { path: "/recurring", label: "Recurring", allowedRoles: [ROLES.OWNER, ROLES.OPS] },
  { path: "/communications", label: "Comms", allowedRoles: [ROLES.OWNER, ROLES.OPS] },
  { path: "/settings", label: "Settings", allowedRoles: [ROLES.OWNER] }
];
