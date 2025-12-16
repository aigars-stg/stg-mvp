# Production Deployment Checklist

## Pre-Deployment

### 1. Environment Variables
- [ ] All production environment variables set in Vercel
- [ ] `STRIPE_SECRET_KEY` uses live key (starts with `sk_live_`)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` uses live key (starts with `pk_live_`)
- [ ] `UNISEND_API_URL` points to production (`https://api-manosiuntos.post.lt`)
- [ ] `UNISEND_USERNAME` and `UNISEND_PASSWORD` are production credentials
- [ ] `NEXT_PUBLIC_APP_URL` is production domain
- [ ] `CRON_SECRET` is strong random value (32+ characters)
- [ ] `RESEND_FROM_EMAIL` is verified domain
- [ ] Supabase production keys configured

### 2. Database (Supabase)
- [ ] All migrations applied to production database
- [ ] RLS policies enabled and tested
- [ ] Service role key stored securely
- [ ] Database backups enabled
- [ ] Connection pooling configured (if using Prisma/Drizzle)
- [ ] Storage bucket `order-documents` created
- [ ] Storage policies configured for public read access

### 3. Stripe Configuration
- [ ] Live mode enabled in Stripe Dashboard
- [ ] Webhook endpoint configured: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Webhook secret stored in environment variables
- [ ] Test a live payment to verify
- [ ] Stripe Connect Express onboarding flow tested
- [ ] Platform fees configured correctly
- [ ] Payout schedule configured (daily auto-transfer)

### 4. Unisend Configuration
- [ ] Production API credentials obtained
- [ ] Terminal list cache working
- [ ] Test label generation in production
- [ ] Verify tracking sync works
- [ ] Check label PDF upload to storage

### 5. Email (Resend)
- [ ] Domain verified in Resend
- [ ] SPF/DKIM records configured
- [ ] Test all email templates:
  - [ ] Order placed (seller)
  - [ ] Order confirmation (buyer)
  - [ ] Order accepted (buyer)
  - [ ] Shipping label (seller)
  - [ ] Package delivered (buyer)
  - [ ] Order cancelled (buyer)
- [ ] Email sending limits sufficient for volume

### 6. Cron Jobs (Vercel)
- [ ] All cron jobs configured in `vercel.json`
- [ ] Cron secret configured
- [ ] Test each cron endpoint manually:
  - [ ] `/api/cron/expire-reservations` (every 1 min)
  - [ ] `/api/cron/expire-seller-deadlines` (every 5 min)
  - [ ] `/api/cron/sync-tracking` (every 30 min)
  - [ ] `/api/cron/complete-delivered-orders` (daily 1 AM)
  - [ ] `/api/cron/process-payouts` (daily 4 AM)
  - [ ] `/api/cron/expire-wanted-listings` (daily 3 AM)
  - [ ] `/api/auth/cleanup-deleted-accounts` (daily 2 AM)

### 7. Security
- [ ] Security headers configured in `vercel.json`:
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY
  - [ ] X-XSS-Protection: 1; mode=block
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] CORS policies reviewed
- [ ] Rate limiting considered for API routes
- [ ] Service role keys not exposed in client code
- [ ] All secrets stored in environment variables (never in code)

### 8. Code Quality
- [ ] TypeScript compilation passes: `npx tsc --noEmit`
- [ ] No console.errors in production code
- [ ] Unused imports removed
- [ ] No TODO comments in critical paths
- [ ] Environment validation at startup

## Deployment

### 1. Vercel Deployment
- [ ] Connect GitHub repository
- [ ] Configure build settings:
  - Build Command: `pnpm build`
  - Output Directory: `.next`
  - Install Command: `pnpm install`
- [ ] Set environment variables in Vercel dashboard
- [ ] Configure custom domain
- [ ] Enable automatic deployments from `main` branch

### 2. DNS Configuration
- [ ] Point domain to Vercel
- [ ] Configure email DNS records (SPF, DKIM for Resend)
- [ ] Verify SSL certificate issued

### 3. Post-Deployment Verification
- [ ] Homepage loads correctly
- [ ] User signup works
- [ ] User login works
- [ ] Browse listings works
- [ ] Complete a test purchase:
  - [ ] Add item to cart
  - [ ] Checkout with T2T shipping
  - [ ] Payment processes successfully
  - [ ] Order appears in buyer dashboard
  - [ ] Order appears in seller dashboard
  - [ ] Seller can accept order
  - [ ] Shipping label generated
  - [ ] Label emailed to seller
  - [ ] Tracking info sent to buyer
- [ ] Test seller Connect onboarding
- [ ] Verify cron jobs running (check logs)

## Monitoring & Maintenance

### 1. Monitoring
- [ ] Vercel Analytics enabled
- [ ] Error tracking set up (Sentry recommended)
- [ ] Uptime monitoring configured
- [ ] Database performance monitoring
- [ ] Set up alerts for:
  - [ ] Failed payments
  - [ ] Failed payouts
  - [ ] Cron job failures
  - [ ] Email delivery failures

### 2. Backups
- [ ] Database backups automated (Supabase handles this)
- [ ] Test database restoration process
- [ ] Document backup/restore procedures

### 3. Support
- [ ] Support email configured
- [ ] Customer support process documented
- [ ] Refund process documented
- [ ] Dispute resolution process documented

## Launch Checklist

### Day Before Launch
- [ ] Final production test of complete buyer flow
- [ ] Final production test of complete seller flow
- [ ] Verify all cron jobs working
- [ ] Check email deliverability
- [ ] Test Stripe Connect onboarding
- [ ] Review error logs

### Launch Day
- [ ] Monitor error logs closely
- [ ] Watch for payment issues
- [ ] Monitor email delivery
- [ ] Check cron job execution
- [ ] Be available for support

### Week After Launch
- [ ] Review analytics
- [ ] Check for any recurring errors
- [ ] Monitor payment success rate
- [ ] Review payout processing
- [ ] Gather user feedback
- [ ] Fix any critical issues immediately

## Rollback Plan

If critical issues occur:

1. **Immediate**: Revert to previous deployment in Vercel
2. **Database**: Restore from backup if needed
3. **Payments**: Manually refund if necessary via Stripe Dashboard
4. **Communication**: Email affected users with status update

## Support Contacts

- **Stripe Support**: https://support.stripe.com
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Resend Support**: https://resend.com/support
- **Unisend Support**: (Your contact)

## Notes

- Keep this checklist updated as new features are added
- Review and test disaster recovery procedures quarterly
- Update documentation after each deployment
