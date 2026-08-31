# Dogecoin Casino — static site (Cloudflare Pages ready)

Fully static, zero-JavaScript site. Critical CSS is inlined, fonts are self-hosted
(subset WOFF2) and preloaded — no third-party requests.

## Deploy to Cloudflare Pages

**Direct upload (fastest):**
1. Cloudflare dashboard → *Workers & Pages* → *Create* → *Pages* → *Upload assets*.
2. Drag the **contents of this folder** in (not the folder itself).
3. Deploy — you get a `*.pages.dev` URL immediately.

**Git-connected (CI):**
1. Commit this folder to a repository.
2. Pages → *Connect to Git*. Framework preset: **None**. Build command: **(leave empty)**.
   Build output directory: **/** (this folder is already the build output).

## Custom domain & TLS
Pages → project → *Custom domains* → add `https://example.com`.
Cloudflare provisions and renews TLS automatically.

## Included / optimized for CF Pages
- `_headers` — 1-year immutable cache on `/assets/*` and fonts; `must-revalidate` HTML;
  security headers (nosniff, Referrer-Policy, X-Frame-Options, Permissions-Policy, HSTS).
- `_redirects` — 404 fallback.
- `sitemap.xml`, `robots.txt`, `site.webmanifest`, favicon.
- Canonical / OG / sitemap URLs are baked to `https://example.com` — rebuild if the domain changes.

## Post-launch
- Submit `https://example.com/sitemap.xml` in Google Search Console.

## Notes for DevOps
- `.htaccess` and `nginx.conf.example` are Apache/nginx fallbacks only — **ignored by
  Cloudflare Pages**; safe to delete if deploying solely to Pages.
