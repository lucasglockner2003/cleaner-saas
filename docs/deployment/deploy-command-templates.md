# Deploy Command Templates

## Staging validation and release prep

```bash
npm run deploy:check:staging
npm run db:staging:migrate
npm run db:staging:reset-seed
```

## Production validation

```bash
npm run deploy:check:production
npm run db:production:migrate
```

## Optional full check with DB apply in one command

```bash
node scripts/release/check-deploy-ready.mjs --environment staging --with-db
node scripts/release/check-deploy-ready.mjs --environment production --with-db
```

## Scripted templates

- PowerShell: `scripts/release/deploy-template.ps1`
- Bash: `scripts/release/deploy-template.sh`

Example:

```bash
powershell -ExecutionPolicy Bypass -File scripts/release/deploy-template.ps1 -Environment staging
```

```bash
bash scripts/release/deploy-template.sh production
```
