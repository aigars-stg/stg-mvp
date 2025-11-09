# Deployment Guide

## Coming Soon Mode

The site includes a "Coming Soon" mode that allows you to deploy a preview version to production while keeping signup functionality disabled. This is perfect for showing stakeholders what's coming without allowing new user registrations.

### What Coming Soon Mode Does

When enabled, the site will:
- ✅ Display a "launching soon" banner on the homepage
- ✅ Show the full homepage preview with all content and design
- ✅ Disable signup functionality (shows "We're launching soon" message)
- ✅ Hide signup links throughout the site
- ✅ Disable CTA buttons on homepage (shows "Coming Soon" instead)
- ✅ Keep signin functional for existing users/testers
- ✅ Keep all other pages accessible (for testing)

### How to Enable Coming Soon Mode in Vercel

#### Option 1: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Key**: `NEXT_PUBLIC_COMING_SOON`
   - **Value**: `true`
   - **Environments**: Select **Production** only (not Preview or Development)
4. Click **Save**
5. Redeploy your site (or trigger a new deployment by pushing to your main branch)

#### Option 2: Via Vercel CLI

```bash
# Add the environment variable to production
vercel env add NEXT_PUBLIC_COMING_SOON production

# When prompted, enter: true

# Redeploy
vercel --prod
```

### How to Disable Coming Soon Mode (Go Live!)

When you're ready to launch for real:

1. Go to **Settings** → **Environment Variables** in Vercel
2. Find `NEXT_PUBLIC_COMING_SOON`
3. Either:
   - Delete the variable entirely, OR
   - Change the value to `false`
4. Redeploy your site

### Local Development

By default, Coming Soon mode is **disabled** in local development. Your `.env.local` file has the variable commented out:

```bash
# NEXT_PUBLIC_COMING_SOON=true
```

To test Coming Soon mode locally:

1. Uncomment the line in `.env.local`:
   ```bash
   NEXT_PUBLIC_COMING_SOON=true
   ```
2. Restart your dev server:
   ```bash
   pnpm dev
   ```

3. When done testing, comment it back out or set to `false`

### Important Notes

- ⚠️ **Only set this to `true` in production environments** - keep it `false` or unset during development
- ⚠️ Existing users can still sign in even in Coming Soon mode
- ⚠️ All pages remain accessible via direct URL - Coming Soon mode only affects signup and homepage CTAs
- ⚠️ Remember to redeploy after changing environment variables in Vercel

### Vercel Deployment Settings

Make sure your Vercel project is configured with:

- **Framework Preset**: Next.js
- **Root Directory**: `packages/marketplace`
- **Build Command**: `pnpm build` or `cd ../.. && pnpm build:marketplace`
- **Install Command**: `pnpm install` (at workspace root)
- **Output Directory**: `.next` (default)
- **Node Version**: 18.x or later

### Environment Variables Checklist

Before deploying to production, ensure all these environment variables are set in Vercel:

- [ ] `NEXT_PUBLIC_COMING_SOON` (set to `true` for preview mode, `false` or unset for live)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `BGG_API_TOKEN`
- [ ] `BGG_API_RATE_LIMIT_MS`
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- [ ] `TURNSTILE_SECRET_KEY`
- [ ] `CRON_SECRET`
- [ ] `RESEND_API_KEY`

Refer to `.env.example` for a complete list of required environment variables.
