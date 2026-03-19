-- Staging reset for pilot validation cycles.
-- Truncates launch-relevant tables when they exist.

begin;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'audit_events',
    'operation_jobs',
    'payment_events',
    'payments',
    'invoices',
    'communication_jobs',
    'reminders',
    'visit_photos',
    'visit_logs',
    'scheduled_visits',
    'schedule_days',
    'expenses',
    'product_movements',
    'products',
    'booking_requests',
    'portal_accounts',
    'ratings',
    'client_notes',
    'recurring_services',
    'team_members',
    'employees',
    'teams',
    'crm_profiles',
    'referrals',
    'growth_campaigns',
    'client_subscriptions',
    'subscription_plans',
    'clients',
    'service_types'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('truncate table public.%I restart identity cascade', table_name);
      raise notice 'Truncated table public.%', table_name;
    else
      raise notice 'Skipped table public.% (not present)', table_name;
    end if;
  end loop;
end
$$;

commit;
