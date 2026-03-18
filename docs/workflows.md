# Workflows

## 1. Client onboarding and setup

1. Operations creates client profile with suburb, address, service type, frequency, and estimated duration.
2. Operations adds note summaries and special instructions.
3. Client is assigned to recurring schedule preference.
4. Client appears in suburb grouping and scheduling pool.

## 2. Weekly scheduling (Monday-Friday)

1. Coordinator reviews weekly board by day.
2. Visits are assigned to teams with order index.
3. Estimated windows are generated from day start, travel buffer, and visit durations.
4. Team workload and projected end-of-day are reviewed.
5. Schedule board serves as execution source for cleaners.

## 3. Visit execution with work clock

1. Cleaner starts visit (`Start house`) when arriving.
2. System logs actual start timestamp and status in progress.
3. Cleaner finishes visit (`Finish house`) and can add notes/proof placeholders.
4. System stores actual finish timestamp, calculates actual duration, and delta vs estimate.
5. Visit appears in history timeline and dashboard/finance summaries.

## 4. Client detail operational review

1. Coordinator opens client detail page.
2. Reviews service profile, instructions, and recent status.
3. Checks visit history and before/after photo metadata placeholders.
4. Uses metrics to identify frequent overruns or service issues.

## 5. Daily finance review

1. Owner selects operating date.
2. Sees completed houses, total revenue, and cost categories.
3. Reviews profit estimate and monthly aggregate trend.
4. Uses results for pricing and staffing decisions.

## 6. Inventory review

1. Team updates product usage movements.
2. Inventory module computes stock status and low-stock warnings.
3. Owner plans replenishment and tracks usage cost impact.

## 7. Reminder preparation (foundation)

1. Reminder payload is prepared from visit schedule.
2. Reminder record is queued with status placeholder.
3. Email provider integration can later dispatch queued reminders.

