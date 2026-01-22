# PRD: User Feedback & Bug Reporting

**Project:** Second Turn Games  
**Feature:** In-app feedback form with floating button and Staff Dashboard management  
**Priority:** Pre-launch (critical for gathering early feedback)  
**Estimated Effort:** 2-3 days

---

## Overview

Add a floating feedback button across the marketplace that allows users to submit feature requests, bug reports, and general feedback. Submissions are collected in a new Staff Dashboard tab for review and management.

### Goals

1. Make it effortless for users to submit feedback from anywhere in the app
2. Capture context automatically (page URL, user info, browser details)
3. Provide a unified view for staff to review and manage all feedback
4. Enable basic workflow (new → reviewed → resolved/closed)
5. Launch-ready for collecting early user feedback

### Non-Goals

- Public feedback board/roadmap (future consideration)
- Voting on feature requests
- Automated responses or chatbot
- Integration with external tools (Linear, Notion, etc.) — manual for now
- Email notifications to submitters about status changes

---

## User Stories

### US-1: User submits feedback via floating button
**As a** marketplace user  
**I want to** click a feedback button and describe my issue or idea  
**So that** I can quickly share feedback without searching for a contact form

**Acceptance Criteria:**
- Floating button visible on all pages (except checkout flow)
- Opens a modal/drawer with a simple form
- Type selector: Feature Request, Bug Report, Other
- Text area for description (required, min 10 characters)
- Optional email field (pre-filled if logged in)
- Screenshot attachment option (optional, max 5MB)
- Auto-captures: current URL, user ID (if logged in), browser/device info
- Success confirmation after submission
- Works for both authenticated and anonymous users

### US-2: Staff views all feedback submissions
**As a** staff member  
**I want to** see all user feedback in one place  
**So that** I can review and prioritize what users are asking for

**Acceptance Criteria:**
- New "Feedback" tab in Staff Dashboard
- Table view with columns: Type, Summary, Status, Submitted, User
- Filterable by type (Feature Request, Bug, Other)
- Filterable by status (New, Reviewed, In Progress, Resolved, Closed)
- Sortable by date (newest first by default)
- Click to view full details

### US-3: Staff reviews and manages feedback
**As a** staff member  
**I want to** mark feedback as reviewed and add internal notes  
**So that** I can track what's been addressed and share context with the team

**Acceptance Criteria:**
- Detail view shows full submission with context
- Status dropdown to change status
- Internal notes field (not visible to users)
- View attached screenshot if present
- Link to user profile if authenticated submission
- One-click copy of technical details for debugging

### US-4: User receives confirmation after submission
**As a** user who submitted feedback  
**I want to** see a confirmation that my feedback was received  
**So that** I know it didn't disappear into the void

**Acceptance Criteria:**
- Success message in modal: "Thanks for your feedback"
- Brief note that we review all submissions
- Modal closes automatically after 3 seconds or on click
- No email confirmation (keeping it simple)

---

## Technical Specification

### Database Schema

Create `user_feedback` table:

```sql
CREATE TABLE user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Submission content
  type TEXT NOT NULL CHECK (type IN ('feature_request', 'bug_report', 'other')),
  description TEXT NOT NULL,
  email TEXT,  -- For anonymous users or if they want a different contact
  
  -- Attachments
  screenshot_url TEXT,  -- Stored in Supabase Storage
  
  -- Auto-captured context
  page_url TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_agent TEXT,
  viewport_size TEXT,  -- e.g., "1920x1080"
  locale TEXT,
  
  -- Staff management
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'in_progress', 'resolved', 'closed')),
  internal_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_feedback_status ON user_feedback(status);
CREATE INDEX idx_feedback_type ON user_feedback(type);
CREATE INDEX idx_feedback_created ON user_feedback(created_at DESC);
CREATE INDEX idx_feedback_user ON user_feedback(user_id) WHERE user_id IS NOT NULL;
```

### RLS Policies

```sql
-- Anyone can insert feedback
CREATE POLICY "Anyone can submit feedback"
  ON user_feedback FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can view their own feedback (optional, for future "my submissions" feature)
CREATE POLICY "Users can view own feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Staff can view and update all feedback
-- Note: Requires is_staff column on profiles or separate staff check
CREATE POLICY "Staff can view all feedback"
  ON user_feedback FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_staff = true
    )
  );

CREATE POLICY "Staff can update feedback"
  ON user_feedback FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_staff = true
    )
  );
```

**Note:** If `is_staff` column doesn't exist on profiles, add it:

```sql
ALTER TABLE profiles ADD COLUMN is_staff BOOLEAN DEFAULT FALSE;
```

### Supabase Storage

Create bucket for screenshot uploads:

```sql
-- Create bucket (via Supabase dashboard or SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', false);

-- RLS: Anyone can upload
CREATE POLICY "Anyone can upload feedback screenshots"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'feedback-screenshots');

-- RLS: Only staff can view
CREATE POLICY "Staff can view feedback screenshots"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'feedback-screenshots'
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_staff = true
    )
  );
```

### API Routes

#### POST `/api/feedback`

**Request:**
```json
{
  "type": "bug_report",
  "description": "The search results don't load when I filter by condition...",
  "email": "user@example.com",  // Optional
  "screenshotBase64": "data:image/png;base64,...",  // Optional
  "context": {
    "pageUrl": "/en/browse?condition=4",
    "userAgent": "Mozilla/5.0...",
    "viewportSize": "1920x1080",
    "locale": "en"
  }
}
```

**Response:**
```json
{ 
  "success": true, 
  "id": "uuid-of-feedback"
}
```

**Logic:**
1. Validate required fields (type, description)
2. Validate description length (min 10, max 5000 characters)
3. If screenshot provided:
   - Validate file size (max 5MB)
   - Validate mime type (image/png, image/jpeg, image/webp)
   - Upload to Supabase Storage
   - Get signed URL
4. Get user_id if authenticated
5. Insert feedback record
6. Return success

#### GET `/api/admin/feedback`

**Auth:** Staff only

**Query params:**
- `status`: Filter by status
- `type`: Filter by type
- `page`: Pagination (default 1)
- `limit`: Items per page (default 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "bug_report",
      "description": "The search results...",
      "status": "new",
      "created_at": "2025-01-22T...",
      "user": {
        "id": "uuid",
        "display_name": "John",
        "email": "john@example.com"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### PATCH `/api/admin/feedback/[id]`

**Auth:** Staff only

**Request:**
```json
{
  "status": "reviewed",
  "internal_notes": "This is a known issue with the BGG API timeout..."
}
```

**Response:**
```json
{ "success": true }
```

---

## Components

### `FeedbackButton` (Client Component)

Location: `src/components/feedback/feedback-button.tsx`

Floating button in bottom-right corner:

```tsx
// Position: fixed, bottom-6, right-6
// Icon: MessageSquarePlus or similar
// Hover: Expand to show "Feedback" label
// Click: Opens FeedbackModal
// Hide on: /checkout/* routes
```

**Styling:**
- Subtle but discoverable
- Uses Aurora teal accent
- Doesn't obscure important UI elements
- Mobile: slightly smaller, same position

### `FeedbackModal` (Client Component)

Location: `src/components/feedback/feedback-modal.tsx`

Modal/drawer form:

```tsx
interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

// Form fields:
// - Type selector (radio or segmented control)
// - Description textarea
// - Email input (optional, pre-filled if logged in)
// - Screenshot upload (optional)
// 
// Auto-captured (hidden):
// - window.location.href
// - navigator.userAgent
// - window.innerWidth + 'x' + window.innerHeight
// - current locale
```

**UX Details:**
- Type defaults to "Feature Request" (most common expected use)
- Placeholder text changes based on type selected:
  - Feature Request: "Describe the feature you'd like to see..."
  - Bug Report: "What happened? What did you expect to happen?"
  - Other: "Tell us what's on your mind..."
- Screenshot upload shows preview thumbnail
- Submit button shows loading state
- Success state shows checkmark + message for 3 seconds

### `FeedbackDashboard` (Server Component)

Location: `src/app/[locale]/admin/feedback/page.tsx`

Staff dashboard tab:

```tsx
// Header with title + stats (X new, Y total)
// Filter bar: Type dropdown, Status dropdown
// Table with columns:
//   - Type (with icon)
//   - Description (truncated)
//   - Status (badge)
//   - User (name or "Anonymous")
//   - Submitted (relative time)
//   - Actions (view button)
// Pagination at bottom
```

### `FeedbackDetail` (Server Component)

Location: `src/app/[locale]/admin/feedback/[id]/page.tsx`

Detail view for single feedback:

```tsx
// Back button
// Header: Type badge + Status dropdown
// Main content:
//   - Description (full text)
//   - Screenshot (if present, clickable to enlarge)
// Context section:
//   - Page URL (clickable link)
//   - User info (link to profile if logged in)
//   - Browser/device details
//   - Submitted timestamp
// Staff section:
//   - Internal notes textarea
//   - Save button
// Technical details (collapsible):
//   - User agent
//   - Viewport
//   - Locale
//   - Copy all as JSON button
```

---

## Translations

Add to `messages/[locale].json` under `Feedback` namespace:

| Key | EN | Purpose |
|-----|-----|---------|
| `button` | "Feedback" | Floating button label |
| `title` | "Share your feedback" | Modal title |
| `typeLabel` | "What's this about?" | Type selector label |
| `typeFeature` | "Feature request" | Type option |
| `typeBug` | "Bug report" | Type option |
| `typeOther` | "Something else" | Type option |
| `descriptionLabel` | "Tell us more" | Description label |
| `descriptionPlaceholderFeature` | "Describe the feature you'd like to see..." | Placeholder |
| `descriptionPlaceholderBug` | "What happened? What did you expect?" | Placeholder |
| `descriptionPlaceholderOther` | "Tell us what's on your mind..." | Placeholder |
| `emailLabel` | "Email (optional)" | Email label |
| `emailHelper` | "In case we need to follow up" | Email helper |
| `screenshotLabel` | "Add a screenshot" | Screenshot label |
| `screenshotHelper` | "Helpful for bug reports" | Screenshot helper |
| `submit` | "Send feedback" | Submit button |
| `sending` | "Sending..." | Loading state |
| `successTitle` | "Thanks for your feedback" | Success title |
| `successMessage` | "We read every submission." | Success message |
| `errorGeneric` | "Something went wrong. Try again?" | Error message |
| `errorTooShort` | "Please add a bit more detail" | Validation error |

Full translations needed for: EN, LV, LT, ET

Refer to brand voice guide:
- Warm, friendly tone
- "Feedback" not "Submit a ticket"
- "Tell us more" not "Description"
- Sentence case

---

## Staff Dashboard Integration

### Navigation

Add "Feedback" tab to existing Staff Dashboard navigation, after existing tabs (Bookkeeping, DAC7, etc.):

```tsx
// In staff dashboard nav
<NavItem href="/admin/feedback" icon={MessageSquare}>
  Feedback
  {newFeedbackCount > 0 && (
    <Badge variant="destructive">{newFeedbackCount}</Badge>
  )}
</NavItem>
```

### Permissions

Ensure staff dashboard routes check for `is_staff` flag:

```tsx
// In layout or middleware
const { data: profile } = await supabase
  .from('profiles')
  .select('is_staff')
  .eq('id', user.id)
  .single()

if (!profile?.is_staff) {
  redirect('/') // or 403 page
}
```

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   ├── feedback/
│   │   │   └── route.ts
│   │   └── admin/
│   │       └── feedback/
│   │           ├── route.ts
│   │           └── [id]/
│   │               └── route.ts
│   └── [locale]/
│       └── admin/
│           └── feedback/
│               ├── page.tsx
│               └── [id]/
│                   └── page.tsx
├── components/
│   └── feedback/
│       ├── feedback-button.tsx
│       ├── feedback-modal.tsx
│       ├── feedback-form.tsx
│       └── feedback-success.tsx
└── lib/
    └── feedback.ts  # Types, validation, utilities
```

---

## UI/UX Details

### Floating Button Behavior

```
Position: Fixed, bottom-24px, right-24px
Size: 48px circle (mobile: 44px)
Icon: MessageSquarePlus (lucide-react)
Background: White with subtle shadow
Border: 1px gray-200
Hover: Teal-50 background, expand to show "Feedback" label
Active: Teal-100 background

Z-index: 40 (below modals, above content)

Hide when:
- On /checkout/* pages
- When modal is open
- On admin pages
```

### Modal Design

```
Desktop: Centered modal, max-width 480px
Mobile: Bottom sheet, full width

Header: Title + close button
Body: Form fields with consistent spacing
Footer: Submit button (full width on mobile)

Animation: Fade in + slide up (mobile: slide up from bottom)
Backdrop: Semi-transparent black, click to close
```

### Type Selector

Use segmented control or large radio buttons:

```
┌─────────────┬─────────────┬─────────────┐
│   Feature   │     Bug     │    Other    │
│   Request   │   Report    │             │
└─────────────┴─────────────┴─────────────┘
```

### Screenshot Upload

```
┌─────────────────────────────────────────┐
│  ┌───────┐                              │
│  │  📷   │  Add a screenshot            │
│  │       │  Helpful for bug reports     │
│  └───────┘                              │
└─────────────────────────────────────────┘

After upload:
┌─────────────────────────────────────────┐
│  ┌───────┐                              │
│  │ thumb │  screenshot.png         ✕    │
│  │       │  245 KB                      │
│  └───────┘                              │
└─────────────────────────────────────────┘
```

---

## Testing Checklist

### Feedback Submission
- [ ] Submit feature request (anonymous)
- [ ] Submit bug report (authenticated)
- [ ] Submit with screenshot attachment
- [ ] Submit without optional email
- [ ] Validation: description too short
- [ ] Validation: screenshot too large
- [ ] Context captured correctly (URL, user agent, etc.)
- [ ] Success message displays
- [ ] Modal closes after success

### Floating Button
- [ ] Visible on marketplace pages
- [ ] Hidden on checkout pages
- [ ] Hidden on admin pages
- [ ] Responsive positioning on mobile
- [ ] Hover state shows label
- [ ] Opens modal on click

### Staff Dashboard
- [ ] Feedback tab visible for staff
- [ ] Feedback tab hidden for non-staff
- [ ] Table loads with pagination
- [ ] Filter by type works
- [ ] Filter by status works
- [ ] Sort by date works
- [ ] Click opens detail view

### Staff Detail View
- [ ] Full description displays
- [ ] Screenshot displays (if present)
- [ ] Context info displays
- [ ] User link works (if authenticated submission)
- [ ] Status change saves
- [ ] Internal notes save
- [ ] Copy technical details works

### Localization
- [ ] All strings translated (EN, LV, LT, ET)
- [ ] Placeholder text changes with type selection
- [ ] Form works in all locales

---

## Future Enhancements (Out of Scope)

- Email notifications to staff on new feedback
- Email notifications to users on status changes
- Public roadmap/feature voting
- Export feedback to CSV
- Integration with Linear/Notion
- Feedback widget embedded in specific pages
- "Was this helpful?" follow-up

---

## Success Metrics

- Number of feedback submissions per week
- Distribution by type (feature vs bug vs other)
- Time from submission to "reviewed" status
- Conversion from feedback to implemented features

---

## Open Questions

None - ready for implementation.
