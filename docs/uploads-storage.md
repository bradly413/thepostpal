# Upload storage (S3)

`POST /api/upload` stores user images. Behavior depends on env:

- **S3 configured** → uploads go to the bucket, response is `{ url, filename, storage: "s3" }`.
- **Not configured** → falls back to writing under `public/uploads/`, response `storage: "local"`. Fine for local dev, but **ephemeral on Vercel** — files vanish on every deploy/restart. Configure S3 for production.

## Env vars

Required to enable S3 (`src/lib/storage.ts::isS3Configured()` returns true only when all four are set):

```bash
S3_BUCKET=
S3_REGION=                 # or AWS_REGION
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
```

Optional:

```bash
S3_ENDPOINT=               # set for S3-compatible providers (Cloudflare R2, MinIO)
S3_PUBLIC_BASE_URL=        # CDN / custom domain for the returned public URL
S3_FORCE_PATH_STYLE=true   # auto-on when S3_ENDPOINT is set
```

## Public URL resolution

1. `S3_PUBLIC_BASE_URL` set → `${S3_PUBLIC_BASE_URL}/uploads/<uuid>.<ext>`
2. else `S3_ENDPOINT` set → `${S3_ENDPOINT}[/<bucket>]/uploads/...` (path-style when forced)
3. else AWS default → `https://<bucket>.s3.<region>.amazonaws.com/uploads/...`

Objects are keyed `uploads/<uuid>.<ext>`. The bucket (or the `S3_PUBLIC_BASE_URL` CDN) must serve them publicly for the app to display the image and for Meta publishing to fetch a public URL.

## Not yet done

- Old local-disk uploads are not migrated to S3.
- No deletion path — removing a photo in the UI does not delete the S3 object.
- The S3 path is unit-untested end-to-end (needs a real bucket + creds); only the local fallback has been exercised.
