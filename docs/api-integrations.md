# API Integrations

## 1. Google Gemini — Image Generation

**Route:** `POST /api/generate-image`  
**Model:** `gemini-2.5-flash-image` (previously `gemini-2.0-flash-exp`)  
**File:** `src/app/api/generate-image/route.ts`

Generates images from text prompts. Returns base64 data URI.

### Request
```json
{
  "prompt": "A cozy farmhouse kitchen. Style: Photo Realistic",
  "aspectRatio": "1:1",
  "referenceImage": null
}
```

### Response
```json
{ "image": "data:image/png;base64,..." }
```

### Rate Limiting
- 10 requests per 60 seconds per IP
- Uses Upstash Redis (`KV_REST_API_URL` / `KV_REST_API_TOKEN`)
- Free tier has daily quota (429 errors when exhausted)

### Notes
- The `referenceImage` field accepts a base64 data URL for image-to-image generation
- Response `image` key (not `url`) contains the data URI
- Aspect ratios: "1:1", "16:9", "9:16", "4:5"

---

## 2. Leonardo.ai — Image Editing

Three routes work together for post-generation editing:

### Upload: `POST /api/leonardo/upload`
**File:** `src/app/api/leonardo/upload/route.ts`

Uploads a base64 image to Leonardo's servers. Returns an `imageId` needed for edit operations.

### Edit: `POST /api/leonardo/edit`
**File:** `src/app/api/leonardo/edit/route.ts`

Triggers an async edit job. Actions:

| Action | Endpoint | Returns |
|--------|----------|---------|
| `upscale` | `/variations/universal-upscaler` | `variationId` (poll for result) |
| `remove-bg` | `/variations/nobg` | `variationId` (poll for result) |
| `inpaint` | `/lcm-inpainting` | May return direct result or `variationId` |

### Status: `GET /api/leonardo/status?id=<variationId>`
**File:** `src/app/api/leonardo/status/route.ts`

Polls until job completes. Returns the result image URL.

### Flow in Studio
1. User clicks "Upscale HD" or "Remove BG"
2. Studio uploads current image to Leonardo (`/api/leonardo/upload`)
3. Gets back `imageId`
4. Calls `/api/leonardo/edit` with action + imageId
5. Gets back `variationId` with status "PENDING"
6. Polls `/api/leonardo/status?id=variationId` every 2-3 seconds
7. When status is "COMPLETE", gets the result URL
8. Replaces current image with the edited version

---

## 3. Anthropic Claude — AI Chat

**Route:** `POST /api/ai`  
**File:** `src/app/api/ai/route.ts`

Used by the AI Assistant page for conversational AI. Uses `@anthropic-ai/sdk`.

---

## 4. Meta Graph API — Social Publishing

**Files:**
- `src/lib/meta.ts` — Graph API functions
- `src/lib/meta-store.ts` — localStorage for tokens/connection state
- `src/app/api/meta/callback/route.ts` — OAuth callback
- `src/app/api/meta/publish/route.ts` — Publish to FB/IG
- `src/app/api/meta/insights/route.ts` — Analytics

### OAuth Flow
1. User clicks "Connect with Facebook" in Settings
2. Redirected to Meta login with required permissions
3. Callback exchanges code for long-lived token
4. Token stored in localStorage

### Publishing
Editor sends caption + image to publish endpoint. Currently sends data URLs — production needs public image URLs (requires S3/Cloudinary image hosting pipeline).

---

## 5. Vimeo — Video Library

**Route:** `GET /api/vimeo/videos`  
**File:** `src/lib/vimeo.ts`

Fetches user's Vimeo videos for the Videos page and dashboard video carousel.

---

## 6. Prompt Enhancement

**Route:** `POST /api/enhance-prompt`  
**File:** `src/app/api/enhance-prompt/route.ts`

AI-powered prompt improvement for Studio image generation.
