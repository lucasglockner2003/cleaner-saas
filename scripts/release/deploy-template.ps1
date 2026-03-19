param(
  [ValidateSet("staging", "production")]
  [string]$Environment = "staging"
)

$ErrorActionPreference = "Stop"

Write-Host "[deploy] Starting deploy template for $Environment"

if ($Environment -eq "staging") {
  npm run check:env:staging
} else {
  npm run check:env:production
}

npm run test:run
npm run build
npm run db:bundle:pilot

Write-Host ""
Write-Host "[deploy] Manual provider/runtime steps:"
Write-Host "1. Apply Supabase migrations:"
Write-Host "   supabase db push --linked"
Write-Host "2. Deploy Stripe webhook endpoint runtime with STRIPE_WEBHOOK_SECRET."
Write-Host "3. Deploy operations worker runtime with scheduler trigger."
Write-Host "4. Deploy frontend with environment file for $Environment."
Write-Host "5. Run smoke checklist: RELEASE_PREP/smoke-test-checklist.md"
