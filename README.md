# VSLs — Video Sales Letter Website

A fully responsive, conversion-focused VSL landing page hosted on Railway, with source code in GitHub.

## Website

- **Production:** https://vsls-web-production.up.railway.app
- **GitHub:** https://github.com/LouKang09/VSLs
- **Technology:** HTML, CSS, vanilla JavaScript, Node.js HTTP server (no paid framework required)
- **Port:** Railway's `PORT` environment variable is automatically honored
- **Health endpoint:** `/health`

## What's included

- VSL hero headline, video stage and play button
- Problem / solution storytelling, method cards, digital-product offer, FAQs, final CTA
- Responsive mobile design with sticky offer button
- Editable demo settings: brand, headlines, sales copy, video link, price, button label, accent color, checkout link
- YouTube, Vimeo and direct MP4 support
- Safe checkout URL handling and helpful prompts when video/checkout URLs are missing
- No fabricated testimonials, reviews or guarantees

## Customize

Open the website and choose **Edit demo** to preview your changes. Note: the edit panel uses the current browser's `localStorage` only; edits are not synchronized for visitors. For **permanent, public changes**, modify the defaults in `script.js` and the sales sections in `index.html`, then commit to `main`. Railway automatically deploys commits when the GitHub source is connected.

## Run locally

Requires Node.js 20+.

```bash
npm start
```

Open http://localhost:3000

## Production checklist

- Replace demo offer and example price with actual product/service information
- Add the final VSL video URL (YouTube/Vimeo/direct MP4)
- Connect a real checkout/booking link and customer support details
- Replace demo FAQ text, add privacy policy, terms and accurate refund/delivery policies
- Use only authentic customer testimonials and evidence-backed performance claims
- Verify on desktop and mobile before ad campaigns

Changes pushed to `main` can be redeployed through Railway.
