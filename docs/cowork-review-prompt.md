# Cowork Review Prompt — Help & Legal Content

Copy everything below the line into Claude Cowork.

---

## Your Role

You are reviewing the help and legal content of Second Turn Games — a peer-to-peer board game marketplace for the Baltic region (Latvia, Lithuania, Estonia). The brand voice is welcoming, straightforward, playful, and trustworthy. We say "pre-loved" not "used." No exclamation marks in UI copy.

## Scope

You have access to the full codebase for context. **Focus your review on these directories:**

- `packages/marketplace/content/help/en/` — Help centre markdown files
- `packages/marketplace/content/legal/` — Legal hub markdown files
- `packages/marketplace/components/help/` — Help UI components
- `packages/marketplace/components/legal/` — Legal UI components
- `packages/marketplace/app/[locale]/help/` — Help route pages
- `packages/marketplace/app/[locale]/legal/` — Legal route pages

**Use these for cross-referencing context (do not review them for issues):**

- `packages/marketplace/messages/en.json` and `messages/lv.json` — Translation files (check for consistency with content)
- `packages/marketplace/lib/legal.ts` — Document loading utility
- `packages/marketplace/lib/pricing/constants.ts` — Pricing constants (verify fees/pricing references are accurate)
- `packages/marketplace/lib/services/` — Service layer (verify business logic claims in docs)
- `packages/marketplace/components/layout/` — Footer, navigation (verify all legal/help links work)
- `docs/STG-Brand-Voice-Guide.md` — Brand voice reference
- `docs/STG-Brand-Strategy.md` — Brand strategy reference
- `docs/legal/` and `docs/help/` — Original drafts (compare with live content)
- `CLAUDE.md` — Project conventions and architecture

## What to Review

### 1. Content Accuracy
- Do pricing, fees, and commission references in help/legal docs match the actual constants in `lib/pricing/constants.ts`?
- Do described workflows (selling, shipping, payments, refunds) match the actual service implementations?
- Are order status descriptions consistent with the real state machine (`pending_seller → confirmed → shipped → delivered → completed`)?
- Is the shipping information (flat rate, Unisend parcel lockers, Latvia-only) accurate?

### 2. Cross-Document Consistency
- Are the same concepts described identically across help and legal docs? (e.g., refund policy in terms vs. buyer guide vs. help)
- Do section names, labels, and navigation match between components, section definitions, and translation files?
- Are internal cross-references and links between help/legal sections correct and pointing to valid anchors?

### 3. Brand Voice Compliance
- Does all content follow the brand voice guide? Look for: exclamation marks, "used" instead of "pre-loved," overly formal legal jargon without plain-terms explanations, inconsistent tone
- Do the "plain terms" blocks (`::: plain-terms ... :::`) genuinely simplify the legal text above them?

### 4. Completeness & Gaps
- Are there business features or flows in the codebase that lack help documentation?
- Are there legal obligations (GDPR, DAC7, consumer rights) that are insufficiently covered?
- Are there FAQ questions in translation files (`Help.faq.*`) that aren't addressed in the help content?
- Does the listing types guide (`/help/listing-types`) align with the main help content?

### 5. Translation Readiness
- Is help content only in `content/help/en/`? Is there a plan or structure for other locales?
- Are there hardcoded English strings in components that should use translation keys?
- Do all UI labels in help/legal components use `next-intl` translations?

### 6. Technical/UX Issues
- Are there broken or potentially broken internal links (anchors, query params)?
- Is the section navigation structure logical and easy to follow?
- Does the SEO metadata (schema.org, page titles, descriptions) accurately reflect the content?

## Rules

**DO NOT modify any existing files.** This is a read-only review.

**DO create the following new files with your findings:**

1. `docs/reviews/help-legal-review-findings.md` — Main findings document with:
   - Executive summary
   - Categorised issues (Critical / Important / Minor / Suggestion)
   - Specific file paths and line references for each issue
   - Recommended fix for each issue

2. `docs/reviews/help-legal-content-inconsistencies.md` — Detailed list of any factual inconsistencies between docs and code, with exact quotes from both sides

3. `docs/reviews/help-legal-suggested-rewrites.md` — Suggested rewritten passages (show original vs. suggested, with rationale)

## Output Format

For each finding, use this structure:

```
### [Category] Issue title

**Severity:** Critical | Important | Minor | Suggestion
**Location:** `file/path.md` (line or section reference)
**Cross-ref:** `other/file.ts` (if applicable)

**Current:** What it says now (quote)
**Problem:** Why this is an issue
**Suggested:** What it should say or how to fix it
```

Start by reading the brand voice guide and pricing constants, then work through each content file systematically.
