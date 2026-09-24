# Cloudflare R2 + staging setup

## 1. Buckets
Cloudflare Dashboard → R2 → Create bucket:

| Bucket | Access | Contents |
|---|---|---|
| `sale-enzo-originals` | **Private** | `originals/{category}/{sku}/{n}.jpg`: untouched camera files for Marketplace |
| `sale-enzo-media` | **Public** (custom domain or r2.dev) | `cutout/…/{n}.webp` (full-res, no background) and `web/…/{n}.webp` (1600px, no background) |

Put the public domain in `NEXT_PUBLIC_R2_PUBLIC_BASE_URL`. `next.config.ts` reads it for `images.remotePatterns`.

## 2. API token
R2 → Manage API tokens → **Object Read & Write**, scoped to both buckets. Fill in `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` in `.env` and in Vercel.

## 3. CORS (both buckets)
The browser uploads directly with presigned PUT URLs:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://*.vercel.app", "https://YOUR_DOMAIN"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

## 4. Supabase
1. Run `supabase/migrations/20260924000001_staging.sql`, then `20260924000002_public_additions.sql` (SQL editor or `supabase db push`).
2. Go to Project Settings → API → **Exposed schemas** and add `staging`.
3. The admin user needs `raw_app_meta_data.role = 'admin'`; `public.is_admin()` checks it.

## 5. Storage budget (free tier: 10 GB, $0 egress)
200 products × 3 photos: ~2.4 GB originals + ~1.2 GB full cutouts + ~120 MB web ≈ **3.7 GB**.
