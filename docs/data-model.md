# Data Model (Supabase-ready)

This model is represented in docs, mock seeds, and service interfaces.

## Entity overview

### `clients`

- Purpose: store customer profile, location, service preferences, and status.
- Important fields:
  - `id`, `organization_id` (future), `full_name`, `phone`, `email`, `suburb`, `address`
  - `service_type_id`, `cleaning_frequency`, `estimated_duration_min`
  - `notes_summary`, `special_instructions`, `status`, `last_cleaning_at`
  - `created_at`, `updated_at`
- Relationships:
  - one-to-many with `client_notes`
  - one-to-many with `scheduled_visits`
- Future extension:
  - customer portal credentials
  - payment preferences

### `client_notes`

- Purpose: operational notes and instruction log for cleaners.
- Important fields: `id`, `client_id`, `note_type`, `body`, `is_active`, `created_by`, `created_at`
- Relationships: many-to-one `clients`
- Future extension: visibility scope, sensitive flag, attachments

### `service_types`

- Purpose: standardize offerings (regular, deep clean, move-out).
- Important fields: `id`, `name`, `default_duration_min`, `default_price`, `active`
- Relationships: referenced by `clients`, `scheduled_visits`
- Future extension: dynamic checklists and optional add-ons

### `recurring_services`

- Purpose: recurring cadence definitions by client.
- Important fields: `id`, `client_id`, `weekday`, `window_start`, `window_end`, `frequency`
- Relationships: many-to-one `clients`
- Future extension: automation rules and exceptions

### `teams`

- Purpose: groups of employees for assignments.
- Important fields: `id`, `name`, `region`, `is_active`
- Relationships:
  - one-to-many with `team_members`
  - one-to-many with `scheduled_visits`
- Future extension: capacity rules and routing preferences

### `employees`

- Purpose: cleaner and supervisor records.
- Important fields: `id`, `full_name`, `role`, `hourly_cost`, `team_id`, `status`, `start_date`
- Relationships: many-to-one `teams`; one-to-many `visit_logs`
- Future extension: payroll integration, certification data

### `team_members`

- Purpose: join table between teams and employees.
- Important fields: `id`, `team_id`, `employee_id`, `assigned_from`, `assigned_to`
- Relationships: many-to-one `teams`, many-to-one `employees`
- Future extension: temporary assignments and historical snapshots

### `schedule_days`

- Purpose: stores day-level schedule metadata.
- Important fields: `id`, `date`, `day_name`, `team_id`, `start_time`, `break_duration_min`
- Relationships: one-to-many with `scheduled_visits`
- Future extension: branch/zone assignment and shift templates

### `scheduled_visits`

- Purpose: planned visits for clients.
- Important fields:
  - `id`, `client_id`, `team_id`, `employee_id` (optional), `schedule_day_id`
  - `order_index`, `estimated_start`, `estimated_end`, `estimated_duration_min`
  - `status`, `price`, `service_type_id`
- Relationships:
  - many-to-one `clients`, `teams`, `service_types`, `schedule_days`
  - one-to-many `visit_logs`, `visit_photos`
- Future extension: route and ETA confidence

### `visit_logs`

- Purpose: execution log for house work clock and notes.
- Important fields:
  - `id`, `scheduled_visit_id`, `actual_start`, `actual_finish`, `actual_duration_min`
  - `status`, `notes`, `proof_summary`
- Relationships: many-to-one `scheduled_visits`
- Future extension: incident report linkage

### `visit_photos`

- Purpose: metadata for before/after proof media.
- Important fields:
  - `id`, `scheduled_visit_id`, `phase` (`before`/`after`)
  - `file_name`, `storage_path`, `captured_at`, `captured_by`, `is_placeholder`
- Relationships: many-to-one `scheduled_visits`
- Future extension: secure client share links

### `expenses`

- Purpose: record daily operating costs (gas, products, wages placeholder).
- Important fields: `id`, `date`, `category`, `amount`, `team_id`, `visit_id`, `note`
- Relationships: optional many-to-one `teams`, `scheduled_visits`
- Future extension: vendor and tax attributes

### `products`

- Purpose: inventory items used during cleans.
- Important fields: `id`, `name`, `quantity`, `unit`, `low_stock_threshold`, `cost_per_unit`, `status`
- Relationships: one-to-many `product_movements`
- Future extension: supplier and restock automation

### `product_movements`

- Purpose: stock movement history (in/out/adjustment).
- Important fields: `id`, `product_id`, `movement_type`, `quantity`, `reason`, `moved_at`, `visit_id`
- Relationships: many-to-one `products`; optional many-to-one `scheduled_visits`
- Future extension: approval workflows

### `reminders`

- Purpose: reminder and communication queue records.
- Important fields:
  - `id`, `client_id`, `scheduled_visit_id`, `channel`, `template_key`
  - `scheduled_at`, `status`, `provider_ref`, `payload`
- Relationships: many-to-one `clients`, `scheduled_visits`
- Future extension: retries, delivery events, localization

### `invoices` (placeholder)

- Purpose: future invoice lifecycle records.
- Important fields: `id`, `client_id`, `period_start`, `period_end`, `total`, `status`, `issued_at`
- Relationships: many-to-one `clients`
- Future extension: payment provider references

### `ratings` (placeholder)

- Purpose: future service quality feedback.
- Important fields: `id`, `client_id`, `visit_id`, `score`, `comment`, `submitted_at`
- Relationships: many-to-one `clients`, `scheduled_visits`
- Future extension: manager review workflows

## Relationship summary

- `clients` -> many `scheduled_visits`
- `scheduled_visits` -> one optional `visit_logs` current record + many `visit_photos`
- `teams` <-> `employees` via `team_members`
- `schedule_days` -> many `scheduled_visits`
- `products` -> many `product_movements`

## Normalization strategy

- Keep base tables normalized.
- Build page-specific summaries in service layer (`dashboard`, `finance`, `employees`).
- Avoid persisting derived fields that can be computed from source entities.

