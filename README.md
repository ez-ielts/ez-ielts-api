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

1. The production D1 database `ez-ielts-api` is bound in `wrangler.jsonc`. Create an R2 bucket named `ez-ielts-files`. R2 must first be enabled for the Cloudflare account in Storage & databases → R2 → Overview.
2. Set Worker secrets with `pnpm exec wrangler secret put CLERK_JWT_KEY`, `pnpm exec wrangler secret put CLERK_AUTHORIZED_PARTIES`, and `pnpm exec wrangler secret put ALLOWED_ORIGINS`.
3. Add GitHub Actions repository secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. The token needs Worker deployment, D1 Write, and Workers R2 Storage Write access, scoped to the production Cloudflare account. Find the account ID in Cloudflare's Workers & Pages account details; create the token in Cloudflare's API Tokens page.
4. Set the GitHub Actions repository variable `CLOUDFLARE_DEPLOY_ENABLED` to `true`. The workflow checks pull requests and `main` pushes, then applies remote D1 migrations and deploys on `main`. Until this variable is set, it runs checks but skips deployment. You can also run it manually from the Actions tab after enabling deployment.
5. Attach the Worker to `api.ez-ielts.com` in Cloudflare and configure DNS. The workflow does not create a custom domain.

For a one-off manual deployment, run `pnpm run db:migrate:remote` followed by `pnpm run deploy` with Cloudflare authentication configured. Do not put Cloudflare or Clerk credentials in this repository.

The Clerk public verification key is a Worker secret so requests are verified without a per-request Clerk API call. Never use the Clerk secret key as the JWT public key. Authentication failures return 401; server failures return a generic 500 response and are logged by the Worker.
