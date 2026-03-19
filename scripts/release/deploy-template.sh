#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "[deploy] Usage: ./scripts/release/deploy-template.sh [staging|production]"
  exit 1
fi

echo "[deploy] Starting deploy template for $ENVIRONMENT"

if [[ "$ENVIRONMENT" == "staging" ]]; then
  npm run check:env:staging
else
  npm run check:env:production
fi

npm run test:run
npm run build
npm run db:bundle:pilot

echo
echo "[deploy] Manual provider/runtime steps:"
echo "1. Apply Supabase migrations:"
echo "   supabase db push --linked"
echo "2. Deploy Stripe webhook endpoint runtime with STRIPE_WEBHOOK_SECRET."
echo "3. Deploy operations worker runtime with scheduler trigger."
echo "4. Deploy frontend with environment file for $ENVIRONMENT."
echo "5. Run smoke checklist: RELEASE_PREP/smoke-test-checklist.md"
