# VSLs — Video Sales Letter Website & CMS

A responsive, conversion-focused website and admin publishing studio, deployed from GitHub to Railway. **No Floot dependency.**

**Public buyer site:** https://vsls-web-production.up.railway.app  
**Admin:** https://vsls-web-production.up.railway.app/admin  
**GitHub:** https://github.com/LouKang09/VSLs  
**Railway:** Project "vsls" → service "vsls-web" → \`main\`

## What's new in v2

- Entirely redesigned buyer website: high-contrast dark hero, featured-video theater, responsive video library with category filters, streamlined sales story, process, offer, FAQ and call-to-action.
- Redesigned admin dashboard: page content, video library, process, offers, FAQs, buyer inquiries, brand settings and password change.
- **Multiple videos:** add up to 36 YouTube/Vimeo/MP4/WebM videos to one library; title, description, category and optional custom cover for each video.
- **Direct file uploads:** upload MP4/WebM files (up to 120 MB each) and JPG/PNG/WebP cover images (up to 8 MB each). Files persist on Railway at \`/data/media\`, not in GitHub.
- **Per-video controls:** mark videos visible or hidden from buyers, choose the hero featured video, change order with up/down buttons, edit or remove from the library.
- **Staged publishing:** Save draft stores changes privately. Preview at \`/?preview=draft\` requires a logged-in admin. Publish site replaces public content and video selection immediately, with no redeploy.
- **Buyer conversion:** a real checkout/booking link can open in a separate tab. Without checkout configured, calls-to-action open an inquiry form. Inquiries are saved to persistent storage and listed in admin, with CSV export and deletion.

## Publishing your first videos

1. Sign in at \`/admin\`.
2. Select **Video library** → **Add video**.
3. Provide a title and description and either paste a YouTube/Vimeo/direct video URL or upload a video file.
4. Optionally provide a cover image (URL or upload).
5. Check **Show to buyers**. Optionally check **Feature this video** to place it in the large video theater at the top of the website.
6. Save video to library. Repeat for more videos and reorder as needed.
7. Click **Save draft** for a private preview, or **Publish site** to update the live buyer website. Only visible videos appear in the public video collection.

**Important:** Saving a video to the library changes the admin's working copy. A video is not published to buyers until the site is published. Existing published videos remain visible until a new version replaces them.

## Architecture

- **Node.js 20+** built-in HTTP server, static HTML/CSS/JavaScript; no npm packages.
- Backend routes: \`/api/public\`, \`/api/leads\`, \`/api/admin/content\`, \`/api/admin/draft\`, \`/api/admin/publish\`, \`/api/admin/media\`, \`/api/admin/leads\`, \`/api/admin/leads.csv\`, \`/api/admin/password\`; file streaming via \`/media/<uuid>.<ext>\`.
- Persistent Railway volume \`vsls-content-storage\` mounted on \`/data\`, holding \`content.json\`, \`leads.json\`, \`admin.json\`, and uploaded media.
- Previously published content and account credentials are retained across code deploys. Legacy single-video content is automatically adapted to the new multi-video format.
- Passwords are stored as salted scrypt hashes, with signed HttpOnly Secure SameSite sessions. Admin writes and uploads require authentication plus same-origin checks. Upload content is validated with file signatures and subject to size limits.

## Administrator credentials

Existing admin usernames and passwords remain valid. For an entirely new installation, the first visit to \`/admin\` prompts a one-time setup with \`ADMIN_SETUP_TOKEN\` from Railway plus a chosen username and password (12+ characters). Once created, the account cannot be reinitialized using the setup token. Passwords can be changed under **Settings**.

Required production variables:
- \`SESSION_SECRET\` — long secret used to sign sessions
- \`ADMIN_SETUP_TOKEN\` — strong first-time setup key
- \`DATA_DIR=/data\`
- \`NODE_ENV=production\`

Railway sets \`PORT\` automatically. Service health endpoint is \`/health\`.

## Run locally

\`\`\`bash
npm start
\`\`\`

Open http://localhost:3000. Local persistence defaults to \`.local-data/\` (gitignored).

## Before selling a product

The website is a fully functioning public landing page and CMS, **not** a built-in payment processor or hosted checkout. Provide real video content, accurate product/service copy, pricing, an external checkout/booking URL, contact details, and business-specific privacy/fulfillment/refund/terms information before running paid campaigns.

Avoid unverified testimonials, guaranteed earnings, and misleading urgency claims. Video uploads are stored on the Railway volume and consume available storage; deleting an entry from the video list currently removes it from site content but does not erase the original uploaded file from disk.
