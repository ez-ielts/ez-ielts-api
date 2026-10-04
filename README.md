# Ez-IELTS API

TypeScript API for Ez-IELTS web and mobile clients. Runs on Cloudflare Workers with Hono, D1, R2, and Clerk. No frontend code lives here.

## API

All paths are under `/v1`. Send `Authorization: Bearer <Clerk session token>` on every endpoint except `GET /health`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/me` | Verified Clerk user ID |
| GET, POST | `/writing` | List or create writing submissions |
| GET | `/writing/:id` | Read one of your writing submissions |
| GET, POST | `/speaking` | List or create speaking submissions |
| GET | `/speaking/:id` | Read one of your speaking submissions |
| POST | `/uploads` | Upload audio as the raw request body (20 MiB limit) |
| GET | `/uploads/:id` | Download your private audio |

Create writing with JSON `{ "prompt": "...", "response": "..." }`. Create speaking with JSON `{ "prompt": "...", "uploadId": "..." }` after uploading its audio. Uploads accept `audio/webm`, `audio/mpeg`, `audio/mp4`, `audio/wav`, or `audio/ogg` with `Content-Type`. Lists return at most 50 newest records. Records are scoped to the verified Clerk user ID. No AI scoring is performed yet.

## Local setup

1. Install Node.js 20.9+ and pnpm, then run `pnpm install`.
2. In Cloudflare, create a D1 database named `ez-ielts-api` and an R2 bucket named `ez-ielts-files`. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc` with the new D1 ID.
3. Copy `.dev.vars.example` to `.dev.vars`. Set `CLERK_JWT_KEY` to the Clerk PEM public key (Dashboard → API Keys → JWT public key). Set `ALLOWED_ORIGINS` to the exact web client origins, comma separated. Set `CLERK_AUTHORIZED_PARTIES` to all trusted Clerk token origins, including mobile clients if their tokens have an `azp` claim. Do not commit `.dev.vars`.
4. Run `pnpm db:migrate:local`, then `pnpm dev`. Local Wrangler uses local D1 and R2 storage.

Run `pnpm typecheck` and `pnpm test` before pushing changes.

## Production setup

1. Create production D1 and R2 resources, and update the D1 ID in `wrangler.jsonc`.
2. Set Worker secrets with `pnpm exec wrangler secret put CLERK_JWT_KEY`, `pnpm exec wrangler secret put CLERK_AUTHORIZED_PARTIES`, and `pnpm exec wrangler secret put ALLOWED_ORIGINS`.
3. Apply migrations with `pnpm db:migrate:remote` and deploy with `pnpm deploy`.
4. Attach the Worker to `api.ez-ielts.com` in Cloudflare and configure DNS. Deployment and resource creation are deliberately separate from repository creation.

The Clerk public verification key is a Worker secret so requests are verified without a per-request Clerk API call. Never use the Clerk secret key as the JWT public key. Authentication failures return 401; server failures return a generic 500 response and are logged by the Worker.
