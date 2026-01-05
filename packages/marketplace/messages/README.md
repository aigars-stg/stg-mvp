# Translation Files

This directory contains translation files for Second Turn Games internationalization (i18n).

## Structure

- `en.json` - English translations (default locale)
- `lv.json` - Latvian translations

## Namespace Organization

Translations are organized by feature/component for maintainability:

- **Common**: Shared UI elements (buttons, modals, loading states)
- **Navigation**: Navigation bar, menus, links
- **Auth**: Authentication flows (login, signup, password reset)
- **Listings**: Listing-related content (cards, details, creation)
- **Checkout**: Checkout process
- **Emails**: Email templates
- **metadata**: SEO metadata (titles, descriptions)

## Adding New Translations

1. Add the key to **both** `en.json` and `lv.json`
2. Use nested structure for organization:
   ```json
   {
     "FeatureName": {
       "componentName": {
         "key": "Translation"
       }
     }
   }
   ```
3. Keep keys semantic, not literal
4. Use `camelCase` for keys

## Translation Guidelines

### English (en.json)
- Use clear, concise language
- Follow STG brand voice: welcoming, straightforward, trustworthy
- Write for non-native English speakers (clear, simple)

### Latvian (lv.json)
- Use formal address (Kungs/Kundze) by default
- Direct communication style
- Avoid over-explanation
- Maintain brand personality: warm, community-focused

### Brand Elements (DO NOT TRANSLATE)
- "Second Turn Games" (brand name)
- BoardGameGeek game titles (use original or established local names)

### Latvian Brand Tagline
- English: "Every game deserves a second turn"
- Latvian: "Katrai spēlei pienākas otrā iespēja"

## Validation

Run this script to check translation files are in sync:

```bash
node scripts/validate-translations.js
```

## Professional Translation

For major updates, use professional translation services:
- Estimated cost: €0.08/word
- Provide context screenshots
- Include character limits for UI elements
- Review with native Latvian speaker
