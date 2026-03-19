export const referrals = [
  {
    id: "ref-001",
    referrer_client_id: "c-001",
    referred_client_id: "c-008",
    referred_name: "Daniela Rios",
    referred_email: "daniela.rios@example.com",
    source_channel: "customer_referral",
    status: "rewarded",
    reward_type: "credit",
    reward_amount: 40,
    reward_status: "issued",
    campaign_id: "camp-001",
    created_at: "2026-02-18T02:20:00.000Z",
    converted_at: "2026-02-25T04:10:00.000Z",
    notes: "Referral converted to recurring fortnightly service."
  },
  {
    id: "ref-002",
    referrer_client_id: "c-005",
    referred_client_id: null,
    referred_name: "Auckland Studio Office",
    referred_email: "office.manager@example.com",
    source_channel: "customer_referral",
    status: "invited",
    reward_type: "credit",
    reward_amount: 50,
    reward_status: "pending",
    campaign_id: "camp-001",
    created_at: "2026-03-10T01:05:00.000Z",
    converted_at: null,
    notes: "Invitation sent, awaiting booking conversion."
  },
  {
    id: "ref-003",
    referrer_client_id: "c-006",
    referred_client_id: null,
    referred_name: "James H.",
    referred_email: "james.h@example.com",
    source_channel: "portal_share",
    status: "qualified",
    reward_type: "voucher",
    reward_amount: 25,
    reward_status: "pending",
    campaign_id: "camp-003",
    created_at: "2026-03-16T00:20:00.000Z",
    converted_at: null,
    notes: "Lead qualified through portal referral link."
  }
];

