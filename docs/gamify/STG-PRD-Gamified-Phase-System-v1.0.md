# PRD: Gamified User Journeys — Phase System

**Second Turn Games**

**Version:** 1.0
**Date:** March 2026
**Status:** Ready for Implementation Planning
**Target:** Pre-launch / MVP

---

## 1. Overview

### 1.1 What This Is

A gamification layer applied to core user journeys in Second Turn Games. Instead of generic progress indicators ("Step 1 of 4"), users experience marketplace flows structured as board game phases — Research Phase, Market Phase, Action Phase, Score Phase — with visual progress tracking, micro-celebrations on phase completion, and private achievement milestones.

This is not a superficial naming exercise. It is a full gamification system with progress tracking, phase completion rewards, and a visible game-turn metaphor that runs through the platform identity.

### 1.2 Why We're Doing This

Board gamers intuitively understand phases, rounds, and turns. By mapping our marketplace flows to this mental model, we accomplish three things:

1. **Differentiation.** No other marketplace structures user journeys as game turns. This becomes a signature brand element that reinforces "we're gamers who built a marketplace."
2. **Reduced friction.** User validation showed the original multi-step listing flow felt overwhelming. Reframing steps as game phases shifts the cognitive frame from "work I have to do" to "a turn I'm playing."
3. **Engagement.** Private celebrations and milestone tracking give returning sellers a reason to feel invested without turning the marketplace into a gamified loyalty app.

### 1.3 Guiding Principle

> The best board games use thematic names that hint at function. Spirit Island's "Invader Phase" tells you what's happening even if you've never played. That's the standard: a Curator should smile at the reference; a Newcomer should still know exactly what to do.

### 1.4 Scope

**In scope for this PRD:**
- Seller listing flow (4 phases)
- New user onboarding flow (4 phases)
- Phase tracker component (hybrid mobile/desktop)
- Micro-celebration system (inline, toast, dashboard)
- Achievement definitions (private, non-public)
- Translation keys for all 4 locales (EN, LV, LT, ET)

**Out of scope (future PRDs):**
- Buyer purchase-to-delivery journey
- Seller dashboard "Your Game" stats card
- Public profile badges or leaderboards
- ISO, auction, or community feature phase systems

---

## 2. User Journeys

### 2.1 Seller Listing Flow — "Your Turn"

The listing creation flow is structured as four sequential phases. Each phase maps to a clear functional purpose, uses a name recognizable to board gamers, and includes a plain-language subtitle for clarity.

#### Phase Definitions

| Phase | Name | Subtitle | Function | What the User Does |
|-------|------|----------|----------|-------------------|
| 1 | Research Phase | Find your game | Game identification | Search BGG database, select correct game/edition |
| 2 | Market Phase | Set your price & condition | Valuation | Set asking price, select condition grade, specify edition/language |
| 3 | Action Phase | Show off your game | Content creation | Upload photos, write optional description |
| 4 | Score Phase | Review & list | Confirmation | Review full listing preview, see fee breakdown, publish |

#### Phase Behavior Rules

- Phases are **sequential** — users cannot skip ahead.
- Users **can navigate back** to completed phases to edit.
- Phase state **persists** — if the user leaves mid-flow, they return to the phase they were on (see Section 5.3 for draft handling).
- Each phase completion triggers a **micro-celebration** (see Section 4).
- The final phase (Score) completion triggers the **listing published celebration** and, if applicable, the **First Turn achievement**.

#### Phase Completion Criteria

| Phase | Required to Advance |
|-------|-------------------|
| Research | A BGG game is selected and confirmed |
| Market | Price is set (> EUR 0), condition is selected |
| Action | At least one photo is uploaded |
| Score | User clicks "List your game" (publish action) |

#### Post-Completion States

- On successful publish: celebration screen with listing preview card, achievement badge (if first listing), and messaging: "Your game is now in play!"
- The listing preview card shown on the celebration screen should mirror the actual listing card component used on the marketplace browse page, so users see exactly what buyers will see.

### 2.2 Onboarding Flow — "Game Setup"

New user onboarding follows the metaphor of setting up a board game for the first time. This flow triggers after initial account creation (email verification complete).

#### Phase Definitions

| Phase | Name | Subtitle | Function | What the User Does |
|-------|------|----------|----------|-------------------|
| 1 | Unboxing | Welcome to the table | Account confirmation | Account created, email verified, welcome screen |
| 2 | Player Setup | Create your player | Profile creation | Display name, location (country), language preference, optional avatar |
| 3 | Read the Rules | How it works | Platform orientation | Interactive walkthrough: how listings work, buyer protection, shipping, fees |
| 4 | First Player | Choose your first move | Journey branching | Choose: "List a game" (enters seller listing flow) or "Find a game" (enters marketplace browse) |

#### Phase Behavior Rules

- Onboarding phases are **skippable after Phase 2** — users can dismiss the flow after completing profile setup. However, the remaining phases should be accessible from a "Complete your setup" prompt.
- Phase 3 ("Read the Rules") should be **interactive cards or a swipeable carousel**, not a wall of text. Each card covers one concept (listings, protection, shipping, fees). Keep to 4-6 cards maximum.
- Phase 4 branches into different experiences — "List a game" leads directly into the Seller Listing Flow (Section 2.1), inheriting the same phase tracker. "Find a game" navigates to the marketplace browse page.
- The onboarding flow uses the **same phase tracker component** as the listing flow, just with different phase data.

#### Onboarding Completion

When all 4 onboarding phases are complete, the user receives a "Setup Complete" micro-celebration: "Ready to play. Welcome to the community." This should feel warm, brief, and not block the user from their chosen next action.

---

## 3. Phase Tracker Component

### 3.1 Overview

A single, reusable React component that renders in two visual modes based on viewport width. Both modes communicate identical information and progress state. The component accepts phase definitions, current phase index, and completed phase IDs as props — making it reusable across different flows (onboarding, listing, future buyer journey).

### 3.2 Mobile Layout (< lg breakpoint)

**Design intent:** Compact, functional, stays out of the way. Should feel like a well-designed progress bar that happens to have phase names.

**Structure:**
- **Sticky header** pinned to top of flow content area, positioned below the main app navigation.
- **Segmented progress bar** — one segment per phase. Active segment is highlighted in the CTA/accent color, completed segments in a secondary/trust color, upcoming segments in a muted/border color.
- **Active segment** should have a subtle animation (shimmer, pulse, or glow) to indicate "you are here."
- **Phase label area** below the bar showing: phase name (display font, bold, small), subtitle (body font, smaller, muted), and a compact counter (e.g., "2 / 4") as a pill/badge aligned right.
- **Target height:** approximately 48-56px total, including padding. It must not consume significant screen real estate.

### 3.3 Desktop Layout (>= lg breakpoint)

**Design intent:** A game-board round track. This is where the board game metaphor comes alive visually.

**Structure:**
- **Header line** above the track: "Your Turn — List a Game" (or equivalent per flow) in uppercase overline style.
- **Horizontal node-path layout** — each phase is a "node" (rounded square, approximately 44px) connected by horizontal "paths" (3px lines).
- **Node states:**
  - *Completed:* filled with secondary/trust color, checkmark icon, label in secondary color.
  - *Active:* outlined with accent color, glow/ring effect, phase icon displayed, label in accent color, subtitle visible.
  - *Upcoming:* muted background, muted border, phase icon grayed out, label muted, no subtitle.
- **Die token marker:** A small representation of the STG die logo (the "2" die) positioned above the active node. This token should have a gentle idle animation (subtle bounce or float). When the user advances to the next phase, the token animates from one node to the next.
- **Connector paths:** Lines between nodes. Completed paths filled in secondary/trust color, upcoming paths in muted color. The active connector (between current and next) can have a subtle pulse animation.
- **Decorative details:** Small dots at the midpoint of each connector path, evoking euro-game scoring track aesthetics. Keep these very subtle.
- **Phase labels** sit below each node. Only the active phase shows its subtitle; completed and upcoming phases show only the phase name (with "Phase" suffix dropped for compactness — i.e., "Research" not "Research Phase").

### 3.4 Component Architecture

**Implementation note for Claude Code:** Audit the existing codebase for any current progress/stepper components before building. If a stepper or progress component exists, evaluate whether to extend or replace it.

```
Props:
- phases: Array<{ id: string, name: string, subtitle: string, icon: string }>
- currentPhaseIndex: number
- completedPhaseIds: string[]
- flowTitle: string (e.g., "Your Turn — List a Game")
- onPhaseClick?: (index: number) => void (for navigating back to completed phases)

Internal state:
- sparkle/celebration animation triggers
- Viewport detection for mobile vs desktop rendering
```

The component should be built as a single component that internally renders either mobile or desktop layout based on viewport width. Use the project's existing responsive breakpoint system.

### 3.5 Returning User Behavior

After a user has created 5+ listings, the desktop tracker should **default to the compact (mobile-style) bar** even on desktop viewports. This prevents the richer track from feeling tiresome for power users. Consider implementing this as a simple conditional based on user listing count, or storing a preference. This is a nice-to-have for initial implementation — the default behavior can be the full tracker for all users at first.

### 3.6 Visual Reference

An interactive React prototype is available as `stg-phase-tracker-prototype.jsx`. This shows both the mobile and desktop tracker variants with celebration animations, using the STG design system's color palette and typography. **Use as visual reference only, not production code** — the prototype hardcodes values and does not use the project's actual Tailwind configuration, component library, or i18n system.

---

## 4. Celebration System

### 4.1 Design Philosophy

All celebrations are **private** — visible only to the user, never on public profiles or visible to other users. The goal is personal satisfaction, not social competition. Think "the satisfying click of placing a worker on a board" — quick, tactile, done.

The brand voice guide states: "Celebrate small wins and milestones" and "Never joke during problems or payment issues." Follow both.

### 4.2 Micro-Celebrations (Inline)

**Trigger:** Completing any phase within a flow.

**Behavior:**
- The phase tracker advances with a smooth animation.
- On desktop, a brief particle burst (sparkle) fires from the completed node. Particles should use accent palette colors. Duration: approximately 600ms.
- A brief text appears near the tracker (or as a subtle inline element): the phase's completion message (e.g., "Game found! Moving to market."). This text should fade in and auto-dismiss after approximately 2 seconds, or be replaced by the next phase's content loading.
- On mobile, the segmented bar advances with a smooth fill animation. No particle burst (too busy on small screens). The phase name area updates to the new phase with a fade transition.

**Do not** use modals, full-screen overlays, or anything that interrupts the flow. The celebration is ambient — it rewards progress without demanding attention.

### 4.3 Milestone Toasts

**Trigger:** Significant user milestones (see Section 4.5).

**Behavior:**
- Use the existing toast/notification system in the codebase. If none exists, create a toast component following the design system's toast pattern (fixed bottom-center, slides up, auto-dismisses).
- Toast includes: an icon area (Turni mascot placeholder or die symbol), a bold title line, and an optional subtitle.
- Green/success left border accent.
- Auto-dismiss after 4-5 seconds. User can also dismiss by clicking/tapping.
- Toast should appear **after** the triggering action's UI has updated — don't race the milestone toast against the flow transition.

**Example toasts:**
- First listing published: "First Turn complete!" / "You're officially a player."
- Listing published (celebration screen): "Your game is now in play!" / "We'll notify you when someone makes a move."

### 4.4 Celebration Screen

**Trigger:** Successfully publishing a listing (completing Score Phase).

**Behavior:**
- Replaces the phase flow content area (not a modal or overlay).
- Displays:
  - Animated die symbol (scale/bounce entrance animation)
  - Headline: "Your game is now in play!"
  - If first listing: achievement badge inline (see Section 4.5)
  - Listing summary text (game name, price, condition)
  - Listing preview card — should use the same listing card component from marketplace browse, or a close mirror of it
  - CTA buttons: "List another game" (primary) and "View your listings" (secondary)
- The overall entrance should feel celebratory but brief — staggered fade-in, not a 3-second animation sequence.

### 4.5 Achievement Definitions (MVP)

These are private milestones tracked per user. They appear as toast notifications when earned and are viewable in a future "Your Game" dashboard section (not part of this PRD).

| Achievement ID | Name | Trigger | Toast Message | Toast Subtitle |
|---------------|------|---------|---------------|----------------|
| first_turn | First Turn | First listing published | First Turn complete! | You're officially a player. |
| game_night | Game Night | 5 listings active simultaneously | Game Night! | 5 games on the table at once. |
| speed_round | Speed Round | Listing completed in under 60 seconds | Speed Round! | Listed in under a minute. |
| score_phase | Score Phase | First sale completed | Score Phase! | Your first sale is in the books. |
| income_phase | Income Phase | First payout withdrawn | Income Phase! | Funds are heading your way. |

**Storage:** Achievements should be stored per user in the database. A simple `user_achievements` table with `user_id`, `achievement_id`, `earned_at` timestamp is sufficient. Check achievements on relevant triggers (listing creation, sale completion, payout request).

**Important:** Achievement checking should not block or slow down the primary user action. Check and award asynchronously or after the primary operation succeeds.

---

## 5. Edge Cases & Behavior Rules

### 5.1 Error States During Phases

When an error occurs within a phase (e.g., photo upload fails, BGG search times out, payment processing error):

- The phase **frame stays** — the user is still "in" the Action Phase, the tracker doesn't change.
- The **error message drops all game language** and follows the brand voice guide's Straightforward/Trustworthy tone: "We couldn't upload that photo. Check your connection and try again."
- No Turni, no playful copy, no game references in error states. This is consistent with the brand voice guide: "Never joke during problems or payment issues."

### 5.2 Abandoned Flows / Drafts

- If a user starts listing and leaves mid-flow, their progress is saved as a draft.
- When they return to the listing flow, they resume at the phase they were on: "Resume your turn" rather than "Continue editing draft."
- **Only the most recent draft** shows the active-turn treatment in the dashboard. Older drafts display as "Saved drafts" without phase language, to avoid conceptual clutter.
- Draft auto-save should happen on phase completion at minimum. Within-phase auto-save (e.g., saving partially filled form data) is a nice-to-have.

### 5.3 Multiple Concurrent Drafts

- Users can have multiple drafts. Only the most recent is surfaced with phase language.
- If a user starts a new listing while a draft exists, the previous draft becomes a regular "Saved draft" and the new one becomes the active turn.

### 5.4 Returning Power Users

- For users who have completed 5+ listings, celebrations scale down:
  - Micro-celebrations (inline sparkle, tracker animation) still fire — they're ambient and non-intrusive.
  - Milestone toasts for repeat events (e.g., 10th listing, 20th listing) do NOT fire. Only new milestone types trigger toasts.
  - The celebration screen after publishing can be simplified — shorter animation, quicker transition, or a "quick publish" toast instead of the full celebration screen. Implementation-wise, a flag like `showFullCelebration: listingCount < 5` is sufficient.

---

## 6. Internationalization

### 6.1 Translation Approach

All phase names, subtitles, completion messages, achievement text, and UI microcopy must be translated into all 4 supported locales (EN, LV, LT, ET). Phase names are **fully translated** — we do not keep English phase names with translated subtitles. The experience should feel fully native in each language.

### 6.2 Translation Keys Structure

Add a new namespace for the phase system. Suggested structure:

```json
{
  "Phases": {
    "listing": {
      "flowTitle": "Your Turn — List a Game",
      "research": {
        "name": "Research Phase",
        "subtitle": "Find your game",
        "completionMsg": "Game found! Moving to market.",
        "shortName": "Research"
      },
      "market": {
        "name": "Market Phase",
        "subtitle": "Set your price & condition",
        "completionMsg": "Price set! Time for action.",
        "shortName": "Market"
      },
      "action": {
        "name": "Action Phase",
        "subtitle": "Show off your game",
        "completionMsg": "Looking good! Final review.",
        "shortName": "Action"
      },
      "score": {
        "name": "Score Phase",
        "subtitle": "Review & list",
        "completionMsg": "Your game is now in play!",
        "shortName": "Score"
      }
    },
    "onboarding": {
      "flowTitle": "Game Setup",
      "unboxing": {
        "name": "Unboxing",
        "subtitle": "Welcome to the table",
        "shortName": "Unboxing"
      },
      "playerSetup": {
        "name": "Player Setup",
        "subtitle": "Create your player",
        "shortName": "Player"
      },
      "readTheRules": {
        "name": "Read the Rules",
        "subtitle": "How it works",
        "shortName": "Rules"
      },
      "firstPlayer": {
        "name": "First Player",
        "subtitle": "Choose your first move",
        "shortName": "First Move"
      }
    },
    "celebrations": {
      "listingPublished": "Your game is now in play!",
      "listingPublishedSubtext": "We'll notify you when someone makes a move.",
      "setupComplete": "Ready to play. Welcome to the community.",
      "resumeTurn": "Resume your turn"
    },
    "achievements": {
      "firstTurn": {
        "name": "First Turn",
        "toast": "First Turn complete!",
        "subtitle": "You're officially a player."
      },
      "gameNight": {
        "name": "Game Night",
        "toast": "Game Night!",
        "subtitle": "5 games on the table at once."
      },
      "speedRound": {
        "name": "Speed Round",
        "toast": "Speed Round!",
        "subtitle": "Listed in under a minute."
      },
      "scorePhase": {
        "name": "Score Phase",
        "toast": "Score Phase!",
        "subtitle": "Your first sale is in the books."
      },
      "incomePhase": {
        "name": "Income Phase",
        "toast": "Income Phase!",
        "subtitle": "Funds are heading your way."
      }
    }
  }
}
```

### 6.3 Latvian, Lithuanian, Estonian Translations

Translations for LV, LT, and ET should be provided by a native speaker or professional translator. For initial implementation, the EN keys can be duplicated as placeholders with a TODO comment marking them for translation. The key requirement is that the translation key structure is established correctly so translations can be dropped in without code changes.

**Translation notes for translators:**
- Phase names should feel natural in each language, not literal translations. "Research Phase" might become something more idiomatic if "Research" doesn't carry the right connotation.
- Board game terminology is often used in English in Baltic gaming communities. If a translated phase name feels awkward, the translator should consider whether the English term is more natural in gaming context — but the default decision is to translate.
- Achievement names can be more playful — they're celebration moments, not UI labels.

---

## 7. Database Changes

### 7.1 New Tables

**user_achievements**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid, PK | Default gen_random_uuid() |
| user_id | uuid, FK -> auth.users | NOT NULL |
| achievement_id | text | NOT NULL, e.g., 'first_turn' |
| earned_at | timestamptz | NOT NULL, default now() |
| | | UNIQUE(user_id, achievement_id) |

**RLS:** Users can read only their own achievements. Insert via server-side only (not client-callable).

### 7.2 Existing Table Modifications

**listings table (if not already present):**
- Ensure there's a `draft_phase` or equivalent column (text, nullable) that stores the current phase ID when a listing is in draft state. This enables "resume your turn" functionality. If listing drafts are already handled differently (e.g., a status column with a 'draft' value), the phase can be inferred from which fields are populated.
- Ensure there's a `created_at` timestamp for speed-round achievement calculation.

**profiles table:**
- Consider adding a `listing_count` integer (or derive it from a query) for the power-user threshold check (Section 5.4). A materialized count may be preferable to a query for performance, but this is an implementation decision.

---

## 8. Technical Considerations

### 8.1 Codebase Audit Notes

**Important:** The actual codebase may differ from the brand documentation in the project knowledge. Before implementing, Claude Code should audit and note:

- **Current font stack.** The codebase currently uses Inter, not the Comfortaa/Lato pairing described in the design system v2.5. The phase tracker should use whatever font stack is actually in use. The PRD's references to "display font" and "body font" should map to whatever the codebase's current display and body fonts are.
- **Current color tokens.** Verify which CSS variables or Tailwind classes are actually defined. The PRD references semantic concepts (accent color, trust color, muted color) — map these to actual implemented tokens.
- **Current component library.** Check if shadcn/ui components are installed and which ones. The phase tracker may be able to extend existing primitives (e.g., a Progress component, Tabs, or similar).
- **Current progress/stepper patterns.** Check if any multi-step flow already exists in the codebase (listing creation, onboarding, checkout). If so, the phase system should replace or wrap it, not duplicate it.
- **Current toast/notification system.** Check if a toast component exists. If so, milestone toasts should use it. If not, implement one following the design system patterns.
- **Payment system.** The payment system has pivoted to EveryPay + Swedbank (10% seller commission, platform absorbs processing fees). The skill file may still reference Stripe Connect Express. The Score Phase fee breakdown should reflect the actual payment structure in the codebase.
- **Animation approach.** Check if the project uses any animation library (Framer Motion, etc.) or relies on CSS transitions. The celebration animations should use whatever approach is established, or CSS-only if no library exists.

### 8.2 Performance Requirements

- The phase tracker component must not cause layout shift (CLS). Reserve its space in the layout even before data loads.
- Phase transitions (advancing from one phase to the next) should feel instant — the animation is cosmetic, not blocking. The form content for the next phase should begin loading/rendering immediately; the tracker animation plays concurrently.
- Achievement checks must be asynchronous and non-blocking. A failed achievement check should never prevent a listing from being published or a transaction from completing.
- Sparkle/particle animations on desktop should be CSS-only or very lightweight. Do not import a heavy animation library solely for particles.

### 8.3 Accessibility

- The phase tracker must be navigable by keyboard. Active phase should have visible focus state.
- Screen readers should announce: "Research Phase, step 1 of 4, current" or equivalent. Use `aria-current="step"` on the active phase, and `aria-label` on the tracker container.
- Celebration animations should respect `prefers-reduced-motion`. If reduced motion is preferred, skip particle bursts and use instant state transitions instead of animated ones. Toasts should still appear but without slide-in animation.
- Color should not be the sole indicator of phase state. Completed phases must have a checkmark (or equivalent non-color indicator) in addition to their color change.

---

## 9. Implementation Phases

### 9.1 Suggested Implementation Order

This is a suggested phasing for Claude Code, not a strict requirement. Adjust based on codebase assessment.

**Phase A: Foundation**
1. Create the PhaseTracker component (mobile + desktop hybrid)
2. Create the MilestoneToast component (or extend existing toast)
3. Create the user_achievements database table + RLS policies
4. Add Phases translation namespace with EN keys (placeholder for LV/LT/ET)

**Phase B: Seller Listing Flow**
1. Integrate PhaseTracker into the listing creation flow
2. Wire phase completion logic to existing form validation
3. Add micro-celebrations (tracker animations, inline completion messages)
4. Build the celebration screen (post-publish)
5. Implement first_turn and speed_round achievement checks

**Phase C: Onboarding Flow**
1. Build or refactor the post-signup onboarding experience
2. Integrate PhaseTracker with onboarding phase definitions
3. Build the "Read the Rules" interactive walkthrough
4. Implement the "First Player" branching step
5. Wire onboarding completion celebration

**Phase D: Polish & Edge Cases**
1. Draft resume ("Resume your turn") logic
2. Power-user threshold (simplified celebrations after 5+ listings)
3. Accessibility audit (keyboard nav, screen reader, reduced motion)
4. Remaining achievement triggers (game_night, score_phase, income_phase)

---

## 10. Success Metrics

After implementation, we should track:

| Metric | Baseline | Target | How to Measure |
|--------|----------|--------|----------------|
| Listing completion rate | Current drop-off rate per step | 15% improvement | Funnel analytics: phase entry vs. phase completion |
| Time to first listing | Current median | No increase (gamification should not slow users down) | Timestamp: account creation -> first listing published |
| Onboarding completion rate | Current (if applicable) | 70%+ complete all 4 phases | Phase completion events |
| Repeat listing rate | Current | 10% improvement | Users who create 2+ listings within 30 days |

---

## 11. Open Questions

These do not block implementation but should be resolved during or after initial build:

1. **Celebration screen vs. quick toast for power users.** The PRD suggests simplifying after 5+ listings, but the threshold and exact behavior should be validated with user feedback post-launch.
2. **Onboarding skippability.** How aggressively should we prompt users to complete skipped onboarding phases? A persistent but dismissible banner? A dashboard nudge? To be determined based on completion rate data.
3. **Achievement expansion.** The MVP set is intentionally small (5 achievements). Post-launch, we may want achievements tied to buyer journeys, community participation, or seasonal events. The database structure supports unlimited additions.
4. **Phase names in Baltic languages.** Professional translation needed. The translator should be briefed on the board game context and given freedom to choose idiomatic equivalents rather than literal translations.

---

## 12. Reference Materials

| Document | Relevance |
|----------|-----------|
| STG Brand Voice Guide v2.0 | Tone calibration, celebration copy, error message guidelines |
| STG Design System v2.5 | Color tokens, typography, component patterns, animation principles |
| STG Target Audience Personas v1.0 | Persona-specific behavior expectations (Curator vs. Casual vs. Newcomer) |
| STG Messaging Framework v1.0 | Platform terminology, preferred words |
| Board Game Phase Names Catalogue (uploaded document) | Source research for phase naming conventions |
| Phase Tracker Prototype (stg-phase-tracker-prototype.jsx) | Interactive React prototype showing both mobile and desktop tracker variants with celebrations — use as visual reference, not production code |

---

*Every game deserves a second turn. Every user journey should feel like playing one.*
