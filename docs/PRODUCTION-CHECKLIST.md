# Production Deployment Checklist

## Pre-Deployment

### 1. Environment Variables
- [ ] All production environment variables set in Vercel
- [ ] `EVERYPAY_API_URL` points to production (`https://pay.every-pay.eu/api/v4`)
- [ ] `EVERYPAY_API_USERNAME` is production username
- [ ] `EVERYPAY_API_SECRET` is production secret
- [ ] `EVERYPAY_ACCOUNT_NAME` is production account
- [ ] `UNISEND_API_URL` points to production (`https://api-manosiuntos.post.lt`)
- [ ] `UNISEND_USERNAME` and `UNISEND_PASSWORD` are production credentials
- [ ] `NEXT_PUBLIC_APP_URL` is production domain
- [ ] `CRON_SECRET` is strong random value (32+ characters)
- [ ] `RESEND_FROM_EMAIL` is verified domain
- [ ] `NEXT_PUBLIC_SENTRY_DSN` is set (from Sentry project settings)
- [ ] `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` set for builds
- [ ] Supabase production keys configured
- [ ] Upstash Redis credentials configured

### 2. Database (Supabase)
- [ ] All migrations applied to production database
- [ ] RLS policies enabled and tested
- [ ] Service role key stored securely
- [ ] Database backups enabled
- [ ] Storage bucket `order-documents` created
- [ ] Storage policies configured for public read access
- [ ] Edge Function secrets set: `EVERYPAY_API_URL`, `EVERYPAY_API_USERNAME`, `EVERYPAY_API_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_URL`

### 3. Payment Configuration (EveryPay + Wallet)
- [ ] EveryPay production credentials obtained from Swedbank
- [ ] Callback URL configured: `https://yourdomain.com/api/webhooks/everypay/callback`
- [ ] Test a live payment (card + bank link)
- [ ] Test wallet-only purchase (no EveryPay needed)
- [ ] Test hybrid purchase (partial wallet + EveryPay)
- [ ] Verify 10% commission calculation on items
- [ ] Test wallet credit after order completion (2-day dispute window)
- [ ] Test seller withdrawal request and staff approval flow

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
  - [ ] Dispute opened (seller)
  - [ ] Dispute resolved (buyer/seller)
- [ ] Email sending limits sufficient for volume

### 6. Cron Jobs (Supabase pg_cron)
All cron jobs run via Supabase pg_cron (not Vercel — free plan has no cron support).
Verify with: `SELECT jobid, schedule, command, active FROM cron.job ORDER BY jobid;`

- [ ] `expire-reservations` — every 1 min — `SELECT cleanup_expired_cart_items()`
- [ ] `complete-delivered-orders` — daily 1 AM — `SELECT complete_delivered_orders()`
- [ ] `expire-seller-deadlines` — every 5 min — Edge Function (EveryPay refunds + wallet)
- [ ] `sync-tracking` — every 30 min — Edge Function (Unisend tracking)
- [ ] `cleanup-deleted-accounts` — daily 2 AM — Edge Function
- [ ] `refresh-game-pricing-stats` — hourly at :05 — `SELECT refresh_game_pricing_stats()`
- [ ] `cleanup-security-audit-logs` — weekly Sunday 3 AM — `SELECT cleanup_old_security_audit_logs()`
- [ ] `expire-wanted-listings` — daily midnight — `SELECT expire_wanted_listings()`
- [ ] Check recent run history: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;`

### 7. Security
- [ ] Security headers configured in `next.config.mjs`:
  - [ ] X-Content-Type-Options: nosniff
  - [ ] X-Frame-Options: DENY
  - [ ] Content-Security-Policy (Sentry, Supabase, Cloudflare — no Stripe)
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] CORS policies reviewed
- [ ] Rate limiting active (Upstash Redis)
- [ ] Service role keys not exposed in client code
- [ ] All secrets stored in environment variables (never in code)

### 8. Code Quality
- [ ] TypeScript compilation passes: `pnpm type-check`
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
  - [ ] EveryPay payment processes successfully
  - [ ] Order appears in buyer dashboard
  - [ ] Order appears in seller dashboard
  - [ ] Seller can accept order
  - [ ] Shipping label generated
  - [ ] Label emailed to seller
  - [ ] Tracking info sent to buyer
- [ ] Test wallet balance and withdrawal request
- [ ] Staff can approve withdrawal
- [ ] Verify pg_cron jobs running: check `cron.job_run_details`
- [ ] Error boundaries work (visit `/nonexistent-route`)

## Monitoring & Maintenance

### 1. Monitoring
- [ ] Vercel Analytics enabled
- [ ] Sentry error tracking active (`@sentry/nextjs`)
- [ ] Uptime monitoring configured
- [ ] Database performance monitoring
- [ ] Set up Sentry alerts for:
  - [ ] Failed EveryPay payments
  - [ ] Wallet transaction errors
  - [ ] pg_cron job failures (check `cron.job_run_details`)
  - [ ] Email delivery failures

### 2. Backups
- [ ] Database backups automated (Supabase handles this)
- [ ] Test database restoration process
- [ ] Document backup/restore procedures

### 3. Support
- [ ] Support email configured
- [ ] Customer support process documented
- [ ] Refund process documented (EveryPay + wallet dual refund)
- [ ] Dispute resolution process documented

## Launch Checklist

### Day Before Launch
- [ ] Final production test of complete buyer flow
- [ ] Final production test of complete seller flow
- [ ] Verify all pg_cron jobs working
- [ ] Check email deliverability
- [ ] Test wallet credit and withdrawal flow
- [ ] Review Sentry error logs

### Launch Day
- [ ] Monitor Sentry for errors
- [ ] Watch for EveryPay payment issues
- [ ] Monitor email delivery
- [ ] Check pg_cron job execution
- [ ] Be available for support

### Week After Launch
- [ ] Review Vercel and Sentry analytics
- [ ] Check for any recurring errors
- [ ] Monitor payment success rate
- [ ] Review withdrawal processing
- [ ] Gather user feedback
- [ ] Fix any critical issues immediately

## Rollback Plan

If critical issues occur:

1. **Immediate**: Revert to previous deployment in Vercel
2. **Database**: Restore from backup if needed
3. **Payments**: Refund via EveryPay merchant portal or `refundPayment()` API + `refundToWallet()` for wallet portion
4. **Communication**: Email affected users with status update

## Support Contacts

- **EveryPay Support**: https://every-pay.com/contact/
- **Sentry Support**: https://sentry.io/support/
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Resend Support**: https://resend.com/support
- **Unisend Support**: (Your contact)

## Notes

- Keep this checklist updated as new features are added
- Review and test disaster recovery procedures quarterly
- Update documentation after each deployment
