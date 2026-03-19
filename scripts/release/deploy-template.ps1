param(
  [ValidateSet("staging", "production")]
  [string]$Environment = "staging"
)

$ErrorActionPreference = "Stop"

Write-Host "[deploy] Starting deploy template for $Environment"

if ($Environment -eq "staging") {
  npm run deploy:check:staging
} else {
  npm run deploy:check:production
}

Write-Host ""
Write-Host "[deploy] Manual provider/runtime steps:"
Write-Host "1. Apply Supabase migrations:"
if ($Environment -eq "staging") {
  Write-Host "   npm run db:staging:migrate"
} else {
  Write-Host "   npm run db:production:migrate"
}
Write-Host "2. Deploy Stripe webhook endpoint runtime with STRIPE_WEBHOOK_SECRET."
Write-Host "3. Deploy operations worker runtime with scheduler trigger."
Write-Host "4. Deploy frontend with environment file for $Environment."
Write-Host "5. Run smoke checklist: RELEASE_PREP/smoke-test-checklist.md"
