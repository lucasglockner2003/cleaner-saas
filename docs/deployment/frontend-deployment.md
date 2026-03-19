# Frontend Deployment

## Build and ship

```bash
npm install
npm run test:run
npm run build
```

Deploy `dist/` to your static hosting provider (Vercel/Netlify/CloudFront/etc.).

## Runtime behavior

- App routes are client-side; configure SPA fallback to `index.html`.
- Route-level code splitting is enabled; ensure cache headers allow chunk updates.
- Degraded sync/config warnings surface in UI; do not hide these indicators in production.

## Recommended headers

- `Cache-Control`:
  - `index.html`: short TTL (`max-age=0,must-revalidate`)
  - hashed JS/CSS chunks: long TTL (`max-age=31536000,immutable`)
- `Content-Security-Policy` (minimum):
  - allow Supabase domain
  - allow webhook/map domains if needed

## Smoke checks after deploy

1. Login (internal + portal).
2. Create/update a client.
3. Record a payment and confirm invoice balance update.
4. Run an operation job cycle from Settings.
5. Confirm no critical config banner appears.
