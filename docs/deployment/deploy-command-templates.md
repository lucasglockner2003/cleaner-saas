# Deploy Command Templates

## Staging validation and release prep

```bash
npm run check:env:staging
npm run test:run
npm run build
npm run db:bundle:pilot
npm run db:staging:reset-seed
```

## Production validation

```bash
npm run check:env:production
npm run test:run
npm run build
npm run db:bundle:pilot
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
