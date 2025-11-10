# Auth Profile Loading Issue - Fix

**Issue:** Avatar not displaying in navbar, account page stuck on "Loading..."
**Date:** 2025-11-10
**Status:** 🔴 Identified - needs fix

## Root Cause

The `fetchProfile()` function in [AuthContext.tsx](packages/marketplace/lib/auth/AuthContext.tsx:18-36) returns `null` when there's ANY error, but doesn't distinguish between:
1. Profile doesn't exist (needs creation)
2. Network/timeout error (needs retry)
3. Permission error (needs investigation)
4. Soft-deleted profile (edge case)

When `profile` is `null`, the [account page](packages/marketplace/app/account/page.tsx:97-105) shows "Loading..." forever.

## Current Problem Code

```typescript
// AuthContext.tsx lines 18-36
const fetchProfile = useCallback(async (userId: string) => {
  try {
    const { data, error } = await (supabase as any)
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;  // ❌ Returns null - no distinction between error types
    }

    return data as UserProfile;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;  // ❌ Returns null - no distinction between error types
  }
}, []);
```

```typescript
// account/page.tsx lines 97-105
if (!user || !profile) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="text-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    </div>
  );
}
```

## Diagnosis Steps

### 1. Check Browser Console

When the issue occurs, check browser console for:
```
🔐 Auth state changed: SIGNED_IN
Error fetching profile: <error details>
```

Look for specific error codes:
- `PGRST116` - Profile not found (no row returned)
- `42501` - Permission denied (RLS policy blocking)
- Network error - Timeout or connectivity issue

### 2. Check Supabase Logs

Go to Supabase Dashboard → Logs → Check for:
- RLS policy violations
- Query errors on `user_profiles` table
- Auth token expiration

### 3. Verify Profile Exists

Run in Supabase SQL Editor:
```sql
-- Check if profile exists for your user
SELECT * FROM user_profiles WHERE id = '<your-user-id>';

-- Check if profile is soft-deleted
SELECT id, full_name, email, deleted_at
FROM user_profiles
WHERE email = 'your-email@example.com';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

### 4. Check Auth Token

In browser console:
```javascript
// Check if user is authenticated
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User ID:', session?.user?.id);
```

## Solution Options

### Option 1: Add Better Error Handling (Recommended)

Update AuthContext to distinguish between error types and add error state:

```typescript
// Add error state to AuthContext
const [profileError, setProfileError] = useState<string | null>(null);

const fetchProfile = useCallback(async (userId: string) => {
  try {
    setProfileError(null);

    const { data, error } = await (supabase as any)
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('❌ [Auth] Profile fetch error:', error);

      // Handle specific error types
      if (error.code === 'PGRST116') {
        setProfileError('profile_not_found');
        // Attempt to create profile
        await createProfile(userId);
        return null;
      } else if (error.code === '42501') {
        setProfileError('permission_denied');
        return null;
      } else {
        setProfileError('network_error');
        return null;
      }
    }

    return data as UserProfile;
  } catch (error: any) {
    console.error('❌ [Auth] Profile fetch exception:', error);
    setProfileError(error.message || 'unknown_error');
    return null;
  }
}, []);

// Add function to create missing profile
const createProfile = async (userId: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        full_name: user.user_metadata?.full_name || 'User',
        email: user.email!,
        phone: user.user_metadata?.phone || null,
        country: user.user_metadata?.country || null,
      });

    if (error) {
      console.error('❌ [Auth] Failed to create profile:', error);
      return;
    }

    console.log('✅ [Auth] Profile created successfully');

    // Retry fetch
    const profile = await fetchProfile(userId);
    setProfile(profile);
  } catch (error) {
    console.error('❌ [Auth] Profile creation failed:', error);
  }
};
```

Update account page to show error:

```typescript
// account/page.tsx
if (!user) {
  return <div>Not signed in</div>;
}

if (loading) {
  return <div>Loading...</div>;
}

if (!profile) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <Card padding="lg" className="max-w-md">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-aurora-red mx-auto" />
          <h2 className="text-xl font-semibold">Profile Error</h2>
          <p className="text-text-secondary">
            We couldn't load your profile. This might be due to a network issue or a problem with your account.
          </p>
          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()} variant="primary">
              Retry
            </Button>
            <Button onClick={handleSignOut} variant="secondary">
              Sign Out
            </Button>
          </div>
          <p className="text-xs text-text-muted">
            If this persists, contact support@secondturn.games
          </p>
        </div>
      </Card>
    </div>
  );
}
```

### Option 2: Run Fix in Production (Quick)

If profiles are missing for some users, run this in Supabase SQL Editor:

```sql
-- Create missing profiles for users without them
INSERT INTO user_profiles (id, full_name, email, created_at, updated_at)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', 'User') as full_name,
  au.email,
  au.created_at,
  NOW()
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL
  AND au.email IS NOT NULL;

-- Verify
SELECT COUNT(*) FROM auth.users;
SELECT COUNT(*) FROM user_profiles;
-- Both should match
```

### Option 3: Check RLS Policies

The policies might have been updated incorrectly. Verify in Supabase SQL Editor:

```sql
-- Check current policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- Should see:
-- 1. "Users can read their own profile" - SELECT - authenticated - auth.uid() = id
-- 2. "Public can read seller profiles" - SELECT - public - deleted_at IS NULL
-- 3. "Users can update their own profile" - UPDATE - authenticated
-- 4. "Users can insert their own profile" - INSERT - authenticated
```

If "Users can read their own profile" policy is missing or incorrect, recreate it:

```sql
DROP POLICY IF EXISTS "Users can read their own profile" ON user_profiles;

CREATE POLICY "Users can read their own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);
```

## Implementation Plan

1. ✅ Add console logging to see exact error
2. ⏳ Implement Option 1 (error handling improvements)
3. ⏳ Deploy to production
4. ⏳ Monitor for recurring issues
5. ⏳ Add Sentry/error tracking for better debugging

## Testing Checklist

After fix:
- [ ] Sign in → avatar appears in navbar
- [ ] Click avatar → dropdown opens
- [ ] Go to /account → page loads without "Loading..."
- [ ] Edit profile → saves successfully
- [ ] Sign out → clears avatar
- [ ] Sign in again → avatar reappears

## Files to Update

1. [packages/marketplace/lib/auth/AuthContext.tsx](packages/marketplace/lib/auth/AuthContext.tsx)
   - Add `profileError` state
   - Improve `fetchProfile` error handling
   - Add `createProfile` function
   - Export `profileError` in context

2. [packages/marketplace/app/account/page.tsx](packages/marketplace/app/account/page.tsx)
   - Add error state UI
   - Add retry button
   - Show helpful error messages

3. [packages/marketplace/components/layout/UserMenu.tsx](packages/marketplace/components/layout/UserMenu.tsx)
   - Handle case when profile is null but user exists
   - Show error indicator in avatar

## Prevention

To prevent this in the future:
1. Add automated tests for profile creation
2. Add monitoring/alerts for users with missing profiles
3. Add Sentry error tracking
4. Improve onboarding flow validation

---

**Priority:** High
**Impact:** Blocks users from accessing account settings
**Estimated Fix Time:** 1-2 hours
**Status:** Waiting for implementation
