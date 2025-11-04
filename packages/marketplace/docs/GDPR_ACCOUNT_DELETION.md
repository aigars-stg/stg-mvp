# GDPR-Compliant Account Deletion

This document explains the account deletion strategy with email anonymization and account recovery features.

## Overview

Our platform implements a **soft delete strategy with email anonymization** that balances user privacy rights (GDPR Article 17 - Right to Erasure) with legitimate business and legal needs (GDPR Article 17.3.e - legal claims defense).

### Key Principles

1. **Immediate Actions**: When a user deletes their account, personal data is immediately anonymized
2. **Email Reusability**: Email is anonymized immediately, allowing users to reuse their email for new accounts
3. **Recovery Period**: Users can recover their account within **14 days** of deletion
4. **Retention Period**: Transaction and business data is retained for **90 days** for dispute resolution
5. **Permanent Deletion**: After 90 days, all data is permanently deleted via automated cleanup job

## How It Works

### User Initiates Deletion

When a user deletes their account (via Account Settings → Danger Zone):

#### ✅ Immediate Actions (Day 0)
- `deleted_at` timestamp is set on their profile
- `recovery_deadline` set to 14 days from deletion
- Personal information is anonymized:
  - `full_name` → "Deleted User"
  - `email` in `auth.users` → `deleted-{user_id}@internal.local` (anonymized)
  - `original_email` stored in `user_profiles` for recovery
  - `phone` → null
  - `avatar_url` → null
- Avatar photo is deleted from storage
- User is signed out from all devices (all refresh tokens revoked)
- Profile is hidden from public view (RLS policies exclude `deleted_at IS NOT NULL`)
- **Email becomes immediately available for new account signups**

#### 🔄 Recovery Period (Days 1-14)
- User can visit `/account/recover` to restore their account
- Original email is restored from `user_profiles.original_email`
- `deleted_at`, `recovery_deadline`, and `deletion_reason` are cleared
- Profile information (name, phone, avatar) remains anonymized and must be updated by user
- After 14 days, recovery is **no longer possible**

#### 🕐 Retained for 90 Days (Days 1-90)
- Auth user record (email anonymized to prevent reuse conflicts)
- User profile record (soft deleted with original_email for recovery)
- Listings (hidden from public, retained for transaction history)
- Transaction/purchase history
- Listing photos (for dispute evidence)

#### 🗑️ Permanently Deleted After 90 Days
- Auth user account (via `supabaseAdmin.auth.admin.deleteUser`)
- User profile (CASCADE)
- All related database records (via CASCADE constraints)
- All storage files

## Database Schema

### Migration: `011_add_soft_delete_to_profiles.sql`

```sql
-- Adds soft delete support with email anonymization and recovery
ALTER TABLE user_profiles
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE user_profiles
ADD COLUMN deletion_reason TEXT DEFAULT NULL;

ALTER TABLE user_profiles
ADD COLUMN recovery_deadline TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE user_profiles
ADD COLUMN original_email TEXT DEFAULT NULL;

-- Indexes for efficient queries
CREATE INDEX idx_user_profiles_deleted_at
ON user_profiles(deleted_at)
WHERE deleted_at IS NULL;

CREATE INDEX idx_user_profiles_recovery
ON user_profiles(recovery_deadline)
WHERE recovery_deadline IS NOT NULL;
```

**Column Purposes:**
- `deleted_at`: Timestamp when account was deleted (soft delete flag)
- `deletion_reason`: Audit trail (user_request, admin_action, gdpr_request, etc.)
- `recovery_deadline`: Timestamp until which account can be recovered (14 days from deletion)
- `original_email`: Stores original email for recovery (cleared after permanent deletion)

### RLS Policies

- **Public access**: Excludes soft-deleted profiles (`WHERE deleted_at IS NULL`)
- **User access**: Users can still read their own deleted profile (for data download)
- **Service role**: Full access for cleanup jobs

## Automated Cleanup Job

### API Endpoint

**Route**: `POST /api/auth/cleanup-deleted-accounts`

**Purpose**: Permanently delete accounts past 90-day retention period

**Security**: Protected by `CRON_SECRET` environment variable

### Setup Options

#### Option 1: Vercel Cron (Recommended for Vercel Deployment)

1. **Create `vercel.json`** in project root:

```json
{
  "crons": [
    {
      "path": "/api/auth/cleanup-deleted-accounts",
      "schedule": "0 2 * * *"
    }
  ]
}
```

- Runs daily at 2:00 AM UTC
- Vercel automatically adds `x-vercel-cron` header
- Free on Pro plan, limited on Hobby plan

2. **Add Environment Variable**:

```bash
CRON_SECRET=your-secure-random-secret
```

3. **Update API route** to check Vercel cron header:

```typescript
const vercelCronSecret = request.headers.get('x-vercel-cron');
if (vercelCronSecret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

#### Option 2: GitHub Actions

1. **Create `.github/workflows/cleanup-accounts.yml`**:

```yaml
name: Cleanup Deleted Accounts

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X POST https://your-domain.com/api/auth/cleanup-deleted-accounts \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
```

2. **Add GitHub Secret**: `CRON_SECRET`

#### Option 3: External Cron Service (cron-job.org, EasyCron, etc.)

1. Configure service to call:
   ```
   POST https://your-domain.com/api/auth/cleanup-deleted-accounts
   Authorization: Bearer YOUR_CRON_SECRET
   ```

2. Schedule: Daily at 2:00 AM UTC

3. Add `CRON_SECRET` to your environment variables

## Environment Variables

Add to your `.env.local` and production environment:

```bash
# Cron job authentication
CRON_SECRET=generate-a-secure-random-string-here

# Supabase (should already exist)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Generate a secure CRON_SECRET:
```bash
openssl rand -base64 32
```

## Testing

### Manual Testing

#### 1. Test Account Deletion with Email Anonymization

**Delete a test account:**
- Sign up with test email `test@example.com`
- Go to Account Settings → Danger Zone
- Delete account with password confirmation

**Verify email anonymization:**
```sql
-- Check auth.users email was anonymized
SELECT id, email FROM auth.users WHERE email LIKE 'deleted-%@internal.local';

-- Check user_profiles has original_email and recovery_deadline
SELECT id, email, original_email, deleted_at, recovery_deadline, deletion_reason
FROM user_profiles
WHERE deleted_at IS NOT NULL;
```

**Expected results:**
- `auth.users.email` = `deleted-{user_id}@internal.local`
- `user_profiles.original_email` = `test@example.com`
- `user_profiles.recovery_deadline` = `deleted_at` + 14 days
- `user_profiles.full_name` = "Deleted User"

#### 2. Test Email Reusability

**Immediately after deletion:**
- Try to sign up with same email `test@example.com`
- **Expected:** Sign-up succeeds (creates new account)
- **Old behavior:** Would fail with "Email already exists"

#### 3. Test Account Recovery

**Within 14-day grace period:**
1. Visit `/account/recover`
2. Enter original email and password
3. **Expected:** Account is restored
   - Email restored in `auth.users`
   - `deleted_at`, `recovery_deadline`, `original_email` cleared
   - Profile information still anonymized (must be updated by user)

**After 14-day grace period:**
1. Manually update `recovery_deadline` to past date:
```sql
UPDATE user_profiles
SET recovery_deadline = NOW() - INTERVAL '1 day'
WHERE original_email = 'test@example.com';
```
2. Try to recover account
3. **Expected:** Error "Recovery period has expired"

#### 4. Test Cleanup Job

**Manual cleanup test:**
```bash
curl -X POST http://localhost:3000/api/auth/cleanup-deleted-accounts \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

**For testing, temporarily change retention period** in cleanup route:
```typescript
// Change from 90 to 0 for testing immediate deletion
retentionDate.setDate(retentionDate.getDate() - 0);
```

**Verify permanent deletion:**
```sql
-- Should return no results after cleanup
SELECT * FROM user_profiles WHERE original_email = 'test@example.com';
SELECT * FROM auth.users WHERE email LIKE 'deleted-%@internal.local';
```

### Monitoring

Check cleanup job logs:
- **Vercel**: Functions logs in dashboard
- **GitHub Actions**: Workflow run logs
- **External service**: Service provider logs

Expected output:
```json
{
  "success": true,
  "total": 5,
  "deleted": 5,
  "failed": 0,
  "errors": [],
  "message": "Cleanup completed: 5 accounts permanently deleted"
}
```

## Legal Compliance

### GDPR Article 17 - Right to Erasure

✅ **User Rights Respected**:
- Users can request deletion at any time
- Personal data is immediately anonymized
- Profile is hidden from public view

✅ **Legitimate Exceptions Applied**:
- Article 17.3.e: Legal claims defense (90-day retention)
- Article 17.3.b: Legal obligations (tax/financial records if applicable)

### Retention Period Justification

**90 days** is chosen because:
1. **Chargeback window**: Most payment processors allow 90-120 days
2. **Dispute resolution**: Reasonable time for transaction disputes
3. **Fraud prevention**: Identify patterns and prevent abuse
4. **Industry standard**: Common practice for marketplaces

### User Communication

Users are clearly informed via the Account Deletion dialog:
- What happens immediately (anonymization, sign out)
- What is retained and why (dispute resolution)
- How long data is retained (90 days)
- When permanent deletion occurs

## Troubleshooting

### Cleanup Job Fails

1. **Check environment variables** are set correctly
2. **Verify service role key** has admin permissions
3. **Check Supabase logs** for database errors
4. **Review API route logs** for specific errors

### Accounts Not Being Deleted

1. **Check retention period calculation**:
```sql
SELECT id, deleted_at,
       NOW() - deleted_at as age,
       (NOW() - deleted_at) > interval '90 days' as should_delete
FROM user_profiles
WHERE deleted_at IS NOT NULL;
```

2. **Verify cron job is running** (check service logs)

3. **Test cleanup endpoint manually** with recent timestamp

### RLS Policy Issues

If users can still see deleted profiles:

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'user_profiles';

-- Check policy
\d+ user_profiles
```

## Email Reuse Issue & Solution

### The Problem (Before Email Anonymization)

When implementing soft delete with 90-day retention, a critical UX issue emerges:
- User deletes account on Day 0
- `auth.users` record retained for 90 days (GDPR compliance)
- User tries to create new account with same email on Day 1
- **Supabase returns error:** "Email already exists"
- User blocked from reusing email for 90 days

### The Solution (Email Anonymization)

**Immediate email anonymization** upon account deletion:
1. Update `auth.users.email` to `deleted-{user_id}@internal.local`
2. Store original email in `user_profiles.original_email` for recovery
3. Email becomes immediately available for new signups
4. User can still recover account within 14-day grace period
5. GDPR compliance maintained with 90-day data retention

**Benefits:**
- ✅ Email reusable immediately after deletion
- ✅ GDPR-compliant 90-day retention
- ✅ User recovery option (14-day grace period)
- ✅ Better user experience

## Migration Checklist

- [ ] Run migration `011_add_soft_delete_to_profiles.sql`
- [ ] Update delete-account API route (email anonymization)
- [ ] Create recover-account API route
- [ ] Update AccountDeletion component messaging
- [ ] Create account recovery page (`/account/recover`)
- [ ] Create cleanup API route
- [ ] Set up scheduled cron job (Vercel/GitHub/External)
- [ ] Add `CRON_SECRET` environment variable
- [ ] Test soft delete flow with email anonymization
- [ ] Test email reusability (sign up with deleted email)
- [ ] Test account recovery within 14 days
- [ ] Test recovery failure after 14 days
- [ ] Test cleanup job manually
- [ ] Monitor logs for first week
- [ ] Update Privacy Policy to reflect retention period and recovery
- [ ] Update Terms of Service if needed

## Privacy Policy Updates

Add to your Privacy Policy:

> **Account Deletion and Data Retention**
>
> When you delete your account:
> - Your personal information is immediately anonymized
> - Your profile is hidden from public view
> - You are signed out from all devices
> - Your email address becomes available for reuse immediately
>
> **Account Recovery:**
> You can recover your deleted account within **14 days** by visiting the account recovery page. After 14 days, account recovery is no longer possible.
>
> **Data Retention:**
> For legal compliance and dispute resolution, we retain transaction records and listing information for 90 days after account deletion. After this period, all data is permanently deleted from our systems.
>
> This retention period allows us to:
> - Resolve transaction disputes
> - Prevent fraud and abuse
> - Comply with legal obligations
> - Defend against legal claims (GDPR Article 17.3.e)
>
> **Email Reusability:**
> Your email address is anonymized immediately upon deletion, allowing you to create a new account with the same email if desired. However, if you recover your account within 14 days, your original email will be restored.

## Support

For questions or issues:
1. Check Supabase logs
2. Review API route error messages
3. Check cron job execution logs
4. Contact your development team
