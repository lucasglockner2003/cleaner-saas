export const ROLES = {
  OWNER: "owner",
  OPS: "ops",
  CLEANER: "cleaner",
  CUSTOMER: "customer"
};

export function canAccessRole(userRole, allowedRoles = []) {
  if (!allowedRoles?.length) {
    return true;
  }

  return allowedRoles.includes(userRole);
}
