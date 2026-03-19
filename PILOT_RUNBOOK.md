# PILOT_RUNBOOK

Step-by-step script for running a live pilot session with real operators.

## 1. Session objective

Demonstrate one end-to-end operational cycle:

1. Load pilot clients
2. Generate a working week schedule
3. Execute a visit (start -> finish)
4. Generate invoice records
5. Simulate payment outcomes

## 2. Pre-session setup (15-20 minutes before demo)

1. Open terminal in repo root.
2. Install dependencies (first time only):
   ```bash
   npm install
   ```
3. Start app:
   ```bash
   npm run dev
   ```
4. Open local app URL shown by Vite (usually `http://localhost:5173`).
5. Login using internal owner account:
   - Email: `owner@cleanerops.local`
   - Password: `owner123`
6. Go to **Pilot Tools** (`/pilot-tools`).
7. Confirm sample CSV exists in repo:
   - `samples/pilot-clients-sample.csv`
8. Keep these pages ready in browser tabs:
   - `/pilot-tools`
   - `/schedule`
   - `/visits`
   - `/monetization`
   - `/communications`

## 3. Live pilot execution script (operator-facing)

### Step A - Bootstrap data in minutes

1. In **Pilot Tools**, open **0) Demo mode helper**.
2. Keep defaults (or set:
   - Week start = next Monday
   - Billing month = current month
   - Max clients = 18
   - Max visits = 12
   - Payment mode = Mixed outcome)
3. Click **Run demo mode sequence**.
4. Wait for all 5 steps to show `ok`.

Expected outcome:
- Active clients increase
- Scheduled visits created
- Completed visits created
- Open invoices present
- Payment records present

### Step B - Dispatch view validation

1. Open **Schedule** page.
2. Confirm weekly board is populated.
3. Apply `Risk focus = Only needs-attention days` for dispatch signal review.
4. (Optional) Click **Apply suggested order** on one day column.
5. Confirm route/load signals update and board remains readable.

### Step C - Visit execution walkthrough

1. Open **Visits** page.
2. Filter to `Status = Scheduled` (or `In Progress`).
3. Select one visit row.
4. In **Execution control panel**, click:
   - **Start house**
   - Add a short note
   - Add `before` and `after` proof placeholders if needed
   - **Finish house**
5. Confirm:
   - Status transitions to completed
   - Duration/lateness metrics appear
   - Completion communication status is visible

### Step D - Invoice and payment walkthrough

1. Open **Monetization** page.
2. Confirm invoice lifecycle rows exist (`draft/issued/paid/pending/failed` mix).
3. Confirm payment records are linked to invoices.
4. Verify balances and status counters update coherently.

### Step E - Communication/job visibility

1. Open **Communications** page.
2. Confirm reminder/invoice/completion jobs exist with statuses.
3. Highlight failed/retry-needed jobs and retry action path.

## 4. Demo mode helper behavior

The demo mode helper runs, in order:

1. Import pilot sample CSV
2. Generate weekly schedule
3. Generate fake visit execution
4. Generate test invoices
5. Simulate payments

If any step fails, the helper stops immediately and shows the failed step.

## 5. Recovery actions during session

If data looks inconsistent:

1. Return to **Pilot Tools**.
2. Re-run **Demo mode helper** once.
3. If still inconsistent, run manual sequence:
   - CSV import panel (Load pilot sample -> Import)
   - Week schedule generator
   - Fake visit generator
   - Test invoice generator
   - Payment simulator

## 6. Post-session handoff

1. Export notes on:
   - UX friction
   - Any failed jobs
   - Any confusing statuses
2. Log defects with page + step + expected vs actual behavior.
3. Save the final checklist status in `PILOT_CHECKLIST.md`.
