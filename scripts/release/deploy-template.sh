#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "[deploy] Usage: ./scripts/release/deploy-template.sh [staging|production]"
  exit 1
fi

echo "[deploy] Starting deploy template for $ENVIRONMENT"

if [[ "$ENVIRONMENT" == "staging" ]]; then
  npm run deploy:check:staging
else
  npm run deploy:check:production
fi

echo
echo "[deploy] Manual provider/runtime steps:"
echo "1. Apply Supabase migrations:"
if [[ "$ENVIRONMENT" == "staging" ]]; then
  echo "   npm run db:staging:migrate"
else
  echo "   npm run db:production:migrate"
fi
echo "2. Deploy Stripe webhook endpoint runtime with STRIPE_WEBHOOK_SECRET."
echo "3. Deploy operations worker runtime with scheduler trigger."
echo "4. Deploy frontend with environment file for $ENVIRONMENT."
echo "5. Run smoke checklist: RELEASE_PREP/smoke-test-checklist.md"
