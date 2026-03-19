-- Auto-generated migration bundle
-- Bundle: pilot-launch
-- Generated at: 2026-03-19T01:16:22.491Z

-- [1] supabase\migrations\20260320_launch_readiness.sql
-- Launch readiness migration
-- Applies tenant, payment reliability, worker queue, and audit primitives.

begin;

-- Shared tenant key additions for core launch-critical tables.
alter table if exists public.clients add column if not exists organization_id text not null default 'org-default';
alter table if exists public.invoices add column if not exists organization_id text not null default 'org-default';
alter table if exists public.payments add column if not exists organization_id text not null default 'org-default';
alter table if exists public.subscription_plans add column if not exists organization_id text not null default 'org-default';
alter table if exists public.client_subscriptions add column if not exists organization_id text not null default 'org-default';
alter table if exists public.crm_profiles add column if not exists organization_id text not null default 'org-default';
alter table if exists public.referrals add column if not exists organization_id text not null default 'org-default';
alter table if exists public.growth_campaigns add column if not exists organization_id text not null default 'org-default';
alter table if exists public.portal_accounts add column if not exists organization_id text not null default 'org-default';
alter table if exists public.booking_requests add column if not exists organization_id text not null default 'org-default';

-- Payment provider event ledger.
create table if not exists public.payment_events (
  id text primary key,
  organization_id text not null default 'org-default',
  provider text not null,
  provider_event_id text not null unique,
  event_type text not null,
  payment_id text null references public.payments(id) on delete set null,
  invoice_id text null references public.invoices(id) on delete set null,
  processing_status text not null default 'processed',
  processing_message text null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Operations worker queue.
create table if not exists public.operation_jobs (
  id text primary key,
  organization_id text not null default 'org-default',
  job_type text not null,
  status text not null,
  priority integer not null default 5,
  scheduled_for timestamptz not null,
  next_attempt_at timestamptz null,
  started_at timestamptz null,
  finished_at timestamptz null,
  worker_id text null,
  lock_expires_at timestamptz null,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  payload jsonb not null default '{}'::jsonb,
  result_summary jsonb null,
  error_message text null,
  created_by text not null default 'system',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Immutable operational audit log.
create table if not exists public.audit_events (
  id text primary key,
  organization_id text not null default 'org-default',
  action_key text not null,
  entity_type text null,
  entity_id text null,
  outcome text not null default 'success',
  severity text not null default 'info',
  actor_id text not null default 'system',
  actor_role text not null default 'system',
  message text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Payment table enhancements used by provider reconciliation flow.
alter table if exists public.payments add column if not exists provider_event_id text null;
alter table if exists public.payments add column if not exists idempotency_key text null;
alter table if exists public.payments add column if not exists reconciliation_status text null;
alter table if exists public.payments add column if not exists provider_last_error text null;
alter table if exists public.payments add column if not exists last_reconciled_at timestamptz null;

-- Indexes for launch-critical query paths.
create index if not exists idx_clients_org on public.clients (organization_id);
create index if not exists idx_invoices_org on public.invoices (organization_id);
create index if not exists idx_payments_org on public.payments (organization_id);
create index if not exists idx_payments_invoice on public.payments (invoice_id);
create index if not exists idx_payments_provider_intent on public.payments (provider_intent_id);
create index if not exists idx_payments_idempotency on public.payments (idempotency_key);
create index if not exists idx_payment_events_org on public.payment_events (organization_id);
create index if not exists idx_payment_events_provider_event on public.payment_events (provider_event_id);
create index if not exists idx_operation_jobs_org_status on public.operation_jobs (organization_id, status, next_attempt_at);
create index if not exists idx_operation_jobs_lock on public.operation_jobs (lock_expires_at);
create index if not exists idx_audit_events_org_created on public.audit_events (organization_id, created_at desc);
create index if not exists idx_booking_requests_org on public.booking_requests (organization_id);
create index if not exists idx_portal_accounts_org on public.portal_accounts (organization_id);

-- Updated_at trigger helper for mutable tables.
create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_operation_jobs_updated_at on public.operation_jobs;
create trigger trg_operation_jobs_updated_at
before update on public.operation_jobs
for each row execute function public.set_row_updated_at();

-- Row-level security baselines.
alter table public.clients enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.operation_jobs enable row level security;
alter table public.audit_events enable row level security;
alter table public.portal_accounts enable row level security;
alter table public.booking_requests enable row level security;

-- Internal users (owner/ops/cleaner) should carry JWT claim `organization_id`.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_tenant_select_internal'
  ) then
    create policy clients_tenant_select_internal on public.clients
      for select
      using ((auth.jwt() ->> 'organization_id') = organization_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'invoices' and policyname = 'invoices_tenant_select_internal'
  ) then
    create policy invoices_tenant_select_internal on public.invoices
      for select
      using ((auth.jwt() ->> 'organization_id') = organization_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payments' and policyname = 'payments_tenant_select_internal'
  ) then
    create policy payments_tenant_select_internal on public.payments
      for select
      using ((auth.jwt() ->> 'organization_id') = organization_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'payment_events' and policyname = 'payment_events_tenant_select_internal'
  ) then
    create policy payment_events_tenant_select_internal on public.payment_events
      for select
      using ((auth.jwt() ->> 'organization_id') = organization_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'operation_jobs' and policyname = 'operation_jobs_tenant_select_internal'
  ) then
    create policy operation_jobs_tenant_select_internal on public.operation_jobs
      for select
      using ((auth.jwt() ->> 'organization_id') = organization_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'audit_events' and policyname = 'audit_events_tenant_select_internal'
  ) then
    create policy audit_events_tenant_select_internal on public.audit_events
      for select
      using ((auth.jwt() ->> 'organization_id') = organization_id);
  end if;
end $$;

-- Customer portal scope (JWT `user_type=customer` and `client_id`).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'portal_accounts' and policyname = 'portal_accounts_customer_self_select'
  ) then
    create policy portal_accounts_customer_self_select on public.portal_accounts
      for select
      using (
        (auth.jwt() ->> 'organization_id') = organization_id
        and (auth.jwt() ->> 'user_type') = 'customer'
        and (auth.jwt() ->> 'client_id') = client_id
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'booking_requests' and policyname = 'booking_requests_customer_self_select'
  ) then
    create policy booking_requests_customer_self_select on public.booking_requests
      for select
      using (
        (auth.jwt() ->> 'organization_id') = organization_id
        and (auth.jwt() ->> 'user_type') = 'customer'
        and ((auth.jwt() ->> 'client_id') = client_id or client_id is null)
      );
  end if;
end $$;

commit;

