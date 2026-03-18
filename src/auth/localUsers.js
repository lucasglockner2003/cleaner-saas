import { ROLES } from "./roles";

export const localAuthUsers = [
  {
    id: "user-owner-001",
    email: "owner@cleanerops.local",
    password: "owner123",
    full_name: "Owner Manager",
    role: ROLES.OWNER,
    user_type: "internal"
  },
  {
    id: "user-ops-001",
    email: "ops@cleanerops.local",
    password: "ops12345",
    full_name: "Operations Lead",
    role: ROLES.OPS,
    user_type: "internal"
  },
  {
    id: "user-cleaner-001",
    email: "cleaner@cleanerops.local",
    password: "clean123",
    full_name: "Cleaner Agent",
    role: ROLES.CLEANER,
    user_type: "internal"
  },
  {
    id: "user-customer-001",
    email: "maria.carter@example.com",
    password: "portal123",
    full_name: "Maria Carter",
    role: ROLES.CUSTOMER,
    user_type: "customer",
    client_id: "c-001",
    portal_account_id: "pa-001"
  },
  {
    id: "user-customer-002",
    email: "oliver.brooks@example.com",
    password: "portal123",
    full_name: "Oliver Brooks",
    role: ROLES.CUSTOMER,
    user_type: "customer",
    client_id: "c-006",
    portal_account_id: "pa-002"
  }
];
