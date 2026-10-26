# Standalone Cloudflare Edge Stream Proxy

High-performance video segment and media proxy for Cloudflare Workers.
Runs on Cloudflare's global edge network on free `*.workers.dev` subdomains.

## Deployment Steps

1. In this directory, login to your Cloudflare account:
   ```bash
   npx wrangler login
   ```

2. Set your shared secret (must match `STREAM_PROXY_SECRET` in `.env.production`):
   ```bash
   npx wrangler secret put STREAM_PROXY_SECRET
   ```
   Paste the secret and hit Enter.

3. Deploy to `*.workers.dev`:
   ```bash
   npx wrangler deploy
   ```

4. Copy the deployed URL, e.g.:
   `https://cineby-stream-proxy.<your-subdomain>.workers.dev`

5. Repeat on 2–3 free Cloudflare accounts to get 200,000–300,000 requests/day free!
   Add the URLs to your Cineby `.env.production`:
   ```env
   STREAM_PROXY_URL_POOL=https://proxy1.sub1.workers.dev,https://proxy2.sub2.workers.dev,https://proxy3.sub3.workers.dev
   ```
