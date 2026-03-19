-- Staging seed for pilot rollouts.
-- Inserts a practical baseline dataset for dispatch, finance, and portal smoke checks.

begin;

do $$
begin
  if to_regclass('public.service_types') is not null then
    insert into public.service_types (id, name, default_duration_min, default_price, active)
    values
      ('st-regular', 'Regular Clean', 90, 130, true),
      ('st-deep', 'Deep Clean', 150, 240, true),
      ('st-office', 'Small Office', 120, 190, true)
    on conflict (id) do update
      set name = excluded.name,
          default_duration_min = excluded.default_duration_min,
          default_price = excluded.default_price,
          active = excluded.active;
  end if;
exception when others then
  raise notice 'service_types seed skipped: %', sqlerrm;
end
$$;

do $$
begin
  if to_regclass('public.teams') is not null then
    insert into public.teams (id, name, region, target_day_minutes, is_active, depot_latitude, depot_longitude)
    values
      ('t-001', 'Team A', 'Central', 480, true, -36.8483, 174.7633),
      ('t-002', 'Team B', 'North Shore', 480, true, -36.7871, 174.7693)
    on conflict (id) do update
      set name = excluded.name,
          region = excluded.region,
          target_day_minutes = excluded.target_day_minutes,
          is_active = excluded.is_active,
          depot_latitude = excluded.depot_latitude,
          depot_longitude = excluded.depot_longitude;
  end if;
exception when others then
  raise notice 'teams seed skipped: %', sqlerrm;
end
$$;

do $$
begin
  if to_regclass('public.employees') is not null then
    insert into public.employees (id, full_name, role, hourly_cost, team_id, status, start_date)
    values
      ('e-001', 'Ariana Wolfe', 'Team Lead', 38, 't-001', 'active', '2024-05-10'),
      ('e-002', 'Marcus Reed', 'Cleaner', 31, 't-001', 'active', '2025-02-02'),
      ('e-003', 'Lucas Price', 'Team Lead', 39, 't-002', 'active', '2023-10-11')
    on conflict (id) do update
      set full_name = excluded.full_name,
          role = excluded.role,
          hourly_cost = excluded.hourly_cost,
          team_id = excluded.team_id,
          status = excluded.status,
          start_date = excluded.start_date;
  end if;
exception when others then
  raise notice 'employees seed skipped: %', sqlerrm;
end
$$;

do $$
begin
  if to_regclass('public.clients') is not null then
    insert into public.clients (
      id,
      organization_id,
      full_name,
      phone,
      email,
      suburb,
      address,
      latitude,
      longitude,
      geo_source,
      geocode_status,
      acquisition_source,
      referral_source,
      service_type_id,
      cleaning_frequency,
      estimated_duration_min,
      notes_summary,
      special_instructions,
      status,
      last_cleaning_at,
      created_at,
      updated_at
    )
    values
      (
        'c-001',
        'org-pilot',
        'Maria Carter',
        '+64 21 444 1001',
        'maria.carter@example.com',
        'Ponsonby',
        '14 Norfolk St, Ponsonby, Auckland',
        -36.8549,
        174.7408,
        'seed_manual',
        'verified',
        'referral',
        'Neighbour recommendation',
        'st-regular',
        'Weekly',
        90,
        'Prefers eco-friendly products.',
        'Call 15 minutes before arrival. Dog is inside.',
        'active',
        now() - interval '2 days',
        now() - interval '150 days',
        now() - interval '2 days'
      ),
      (
        'c-002',
        'org-pilot',
        'John Foster',
        '+64 21 444 1002',
        'john.foster@example.com',
        'Mount Eden',
        '22 Stokes Rd, Mount Eden, Auckland',
        -36.8788,
        174.7521,
        'seed_manual',
        'verified',
        'google',
        '',
        'st-regular',
        'Fortnightly',
        75,
        'Focus kitchen and bathroom.',
        'Alarm code on file with supervisor.',
        'active',
        now() - interval '3 days',
        now() - interval '140 days',
        now() - interval '3 days'
      ),
      (
        'c-003',
        'org-pilot',
        'Anna Lee',
        '+64 21 444 1003',
        'anna.lee@example.com',
        'New Lynn',
        '7 Crown Lynn Pl, New Lynn, Auckland',
        -36.9108,
        174.6857,
        'seed_manual',
        'verified',
        'website',
        '',
        'st-deep',
        'Monthly',
        150,
        'Requested oven and rangehood focus.',
        'Use fragrance-free products.',
        'active',
        now() - interval '1 days',
        now() - interval '110 days',
        now() - interval '1 days'
      )
    on conflict (id) do update
      set organization_id = excluded.organization_id,
          full_name = excluded.full_name,
          phone = excluded.phone,
          email = excluded.email,
          suburb = excluded.suburb,
          address = excluded.address,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          geo_source = excluded.geo_source,
          geocode_status = excluded.geocode_status,
          acquisition_source = excluded.acquisition_source,
          referral_source = excluded.referral_source,
          service_type_id = excluded.service_type_id,
          cleaning_frequency = excluded.cleaning_frequency,
          estimated_duration_min = excluded.estimated_duration_min,
          notes_summary = excluded.notes_summary,
          special_instructions = excluded.special_instructions,
          status = excluded.status,
          last_cleaning_at = excluded.last_cleaning_at,
          updated_at = excluded.updated_at;
  end if;
exception when others then
  raise notice 'clients seed skipped: %', sqlerrm;
end
$$;

do $$
begin
  if to_regclass('public.schedule_days') is not null then
    insert into public.schedule_days (
      id,
      date,
      day_name,
      team_id,
      start_time,
      break_duration_min,
      travel_buffer_min,
      target_day_minutes
    )
    values
      ('sd-pilot-mon', current_date + interval '1 day', 'Monday', 't-001', '08:00', 30, 15, 480),
      ('sd-pilot-tue', current_date + interval '2 day', 'Tuesday', 't-002', '08:00', 30, 15, 480)
    on conflict (id) do update
      set date = excluded.date,
          day_name = excluded.day_name,
          team_id = excluded.team_id,
          start_time = excluded.start_time,
          break_duration_min = excluded.break_duration_min,
          travel_buffer_min = excluded.travel_buffer_min,
          target_day_minutes = excluded.target_day_minutes;
  end if;
exception when others then
  raise notice 'schedule_days seed skipped: %', sqlerrm;
end
$$;

do $$
begin
  if to_regclass('public.scheduled_visits') is not null then
    insert into public.scheduled_visits (
      id,
      client_id,
      team_id,
      employee_id,
      schedule_day_id,
      order_index,
      estimated_start,
      estimated_end,
      estimated_duration_min,
      status,
      service_type_id,
      date,
      price
    )
    values
      (
        'v-pilot-001',
        'c-001',
        't-001',
        'e-001',
        'sd-pilot-mon',
        1,
        '08:00',
        '09:30',
        90,
        'scheduled',
        'st-regular',
        current_date + interval '1 day',
        140
      ),
      (
        'v-pilot-002',
        'c-002',
        't-001',
        'e-002',
        'sd-pilot-mon',
        2,
        '09:45',
        '11:00',
        75,
        'scheduled',
        'st-regular',
        current_date + interval '1 day',
        125
      ),
      (
        'v-pilot-003',
        'c-003',
        't-002',
        'e-003',
        'sd-pilot-tue',
        1,
        '08:00',
        '10:30',
        150,
        'scheduled',
        'st-deep',
        current_date + interval '2 day',
        250
      )
    on conflict (id) do update
      set client_id = excluded.client_id,
          team_id = excluded.team_id,
          employee_id = excluded.employee_id,
          schedule_day_id = excluded.schedule_day_id,
          order_index = excluded.order_index,
          estimated_start = excluded.estimated_start,
          estimated_end = excluded.estimated_end,
          estimated_duration_min = excluded.estimated_duration_min,
          status = excluded.status,
          service_type_id = excluded.service_type_id,
          date = excluded.date,
          price = excluded.price;
  end if;
exception when others then
  raise notice 'scheduled_visits seed skipped: %', sqlerrm;
end
$$;

do $$
begin
  if to_regclass('public.products') is not null then
    insert into public.products (id, name, quantity, unit, low_stock_threshold, cost_per_unit, status)
    values
      ('p-001', 'Multi-Surface Cleaner', 22, 'liters', 10, 7.2, 'healthy'),
      ('p-002', 'Glass Cleaner', 8, 'liters', 9, 6.5, 'low'),
      ('p-003', 'Disinfectant', 16, 'liters', 12, 8.1, 'healthy')
    on conflict (id) do update
      set name = excluded.name,
          quantity = excluded.quantity,
          unit = excluded.unit,
          low_stock_threshold = excluded.low_stock_threshold,
          cost_per_unit = excluded.cost_per_unit,
          status = excluded.status;
  end if;
exception when others then
  raise notice 'products seed skipped: %', sqlerrm;
end
$$;

do $$
begin
  if to_regclass('public.expenses') is not null then
    insert into public.expenses (id, date, category, amount, team_id, visit_id, note)
    values
      ('ex-pilot-001', current_date + interval '1 day', 'gas', 62, 't-001', null, 'Pilot dispatch route gas'),
      ('ex-pilot-002', current_date + interval '1 day', 'products', 39, 't-001', 'v-pilot-002', 'Pilot product usage'),
      ('ex-pilot-003', current_date + interval '1 day', 'wages', 410, 't-001', null, 'Pilot wage placeholder')
    on conflict (id) do update
      set date = excluded.date,
          category = excluded.category,
          amount = excluded.amount,
          team_id = excluded.team_id,
          visit_id = excluded.visit_id,
          note = excluded.note;
  end if;
exception when others then
  raise notice 'expenses seed skipped: %', sqlerrm;
end
$$;

commit;
