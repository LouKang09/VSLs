# VSLs — Live Video Sales Letter CMS

A public Video Sales Letter (VSL) landing page with a separate password-protected content studio for the owner.

**Live website:** https://vsls-web-production.up.railway.app  
**Admin dashboard:** https://vsls-web-production.up.railway.app/admin  
**Source:** https://github.com/LouKang09/VSLs  
**Hosting:** Railway project `vsls`, service `vsls-web`, auto-deployed from `main`.

## How it works

- **Public buyers** see only the published sales letter with a hero, video, problem/solution story, four method cards, offer, pricing, FAQ, and closing CTA.
- **Admin** signs in at `/admin`, edits headlines, text, benefits, FAQs, colors, video URL, offer pricing and external checkout link.
- **Save draft** stores a private, unpublished version. **Preview saved draft** is viewable only to an authenticated admin via `/?preview=draft`. **Publish changes** updates the public `/api/public` data instantly.
- If no checkout URL is set, the buyer CTA opens an inquiry form. Submissions are persisted, listed in the lead inbox, exportable to CSV, and individually deletable.
- No payment card details are collected by this server. Checkout links open third-party payment/booking websites in a new tab.

## Initial admin setup

On the first visit to `/admin`, create the owner account. Use the one-time setup token provisioned as the Railway service environment variable `ADMIN_SETUP_TOKEN` (provided privately to the owner), then choose a username and a password of at least 12 characters.

After setup, the token cannot create another account. All future sign-ins use the new username and password. The owner can change the password under **Brand & settings**.

### Security

- Passwords are hashed with Node.js scrypt and a random salt.
- Sessions use signed, expiring HttpOnly / Secure / SameSite=Strict cookies.
- Admin APIs require a valid session; mutation endpoints validate request origin.
- Login/setup and lead submission endpoints are rate-limited.
- Private content, credentials, and inquiry records are persisted in Railway's mounted volume at `/data`; they are **never committed to GitHub**.

### Railway environment variables

- `DATA_DIR=/data`
- `NODE_ENV=production`
- `SESSION_SECRET` — long random value, set securely in Railway
- `ADMIN_SETUP_TOKEN` — random one-time bootstrap token, set securely in Railway
- `PORT` — supplied automatically by Railway

**Persistent volume:** `vsls-content-storage`, mounted at `/data`.

The service exposes `/health` for Railway deployment health checks.

## Local development

Requires Node.js 20 or later. No npm dependencies are required.

```bash
npm start
```

Open `http://localhost:3000`. Locally, private data defaults to `.local-data/`. Do not check this folder into Git. For production, configure the required environment variables and persistent volume.

## Before launching a paid campaign

1. Sign in and replace the initial starter content with your actual product or service, price, contact details, and brand.
2. Add a real YouTube, Vimeo, or direct MP4 sales video. Without a URL, buyers see an unconfigured presentation placeholder.
3. Add a legitimate HTTPS checkout or booking URL. Without one, buyers can submit an inquiry.
4. Review the FAQ, business contact details, privacy notice, fulfillment, terms and refund policy.
5. Use only genuine testimonials, verifiable claims and accurate descriptions.
6. Test the entire checkout/order fulfillment outside this site before running ads.

The CMS currently manages one public VSL landing page with one administrator. It is not a built-in payment processor, membership platform, video hosting service, or multi-tenant website builder.
