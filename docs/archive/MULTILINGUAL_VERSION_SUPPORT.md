# Multilingual Version Support

## Overview

Board games often come in multilingual editions (e.g., "English/German/French" in one box). The version selection system now properly handles these by:

1. **Extracting ALL languages** from each version
2. **Showing each language in the dropdown** (not just the first one)
3. **Displaying all languages** when showing version info
4. **Smart filtering** - a multilingual version appears when ANY of its languages is selected

## How It Works

### Example: Wingspan Oceania Edition

**BGG Data:**
```
Version: "Wingspan: Oceania Expansion (English/French/German/Italian/Spanish edition)"
Languages: [English, French, German, Italian, Spanish]
```

**User Experience:**

1. **Language Dropdown Shows:**
   - English ✓
   - French ✓
   - German ✓
   - Italian ✓
   - Spanish ✓
   - ... (all other languages from all versions)

2. **User Selects "German"**
   - Version list shows ALL versions that include German
   - Including the multilingual "English/French/German/Italian/Spanish" version
   - And any German-only versions

3. **Version Card Displays:**
   ```
   Wingspan: Oceania Expansion (English/French/German/Italian/Spanish edition)
   Publisher: Stonemaier Games
   Languages: 🇬🇧 English / 🇫🇷 French / 🇩🇪 German / 🇮🇹 Italian / 🇪🇸 Spanish
   Year: 2020
   Product Code: STM910
   ```

## Technical Implementation

### 1. Type Updates (`bgg-types.ts`)

```typescript
export interface BGGVersion {
  id: number;
  name: string;
  publisher?: string;
  language?: string;      // Primary language (backward compatible)
  languages?: string[];   // All languages (NEW)
  languageId?: number;
  languageIds?: number[]; // All language IDs (NEW)
  // ... other fields
}
```

### 2. API Parsing (`bgg-api.ts`)

**Before:**
```typescript
const languageLink = versionLinks.find((l: any) => l['@_type'] === 'language');
// Only gets FIRST language ❌
```

**After:**
```typescript
const languageLinks = versionLinks.filter((l: any) => l['@_type'] === 'language');
const languages = languageLinks.map((l: any) => l['@_value']);
// Gets ALL languages ✅
```

### 3. Language Extraction (`LanguageVersionSelector.tsx`)

```typescript
// Extract all unique languages (including from multilingual versions)
const availableLanguages = useMemo(() => {
  const languages = new Set<string>();
  versions.forEach((version: BGGVersion) => {
    if (version.languages && version.languages.length > 0) {
      version.languages.forEach((lang) => languages.add(lang));
    }
  });
  return Array.from(languages).sort();
}, [versions]);
```

### 4. Smart Filtering

```typescript
// Filter versions by selected language (includes multilingual versions)
const filteredVersions = useMemo(() => {
  if (!selectedLanguage) return [];
  return versions.filter((version: BGGVersion) => {
    // Check if version INCLUDES the selected language
    if (version.languages && version.languages.length > 0) {
      return version.languages.includes(selectedLanguage);
    }
    return version.language === selectedLanguage;
  });
}, [versions, selectedLanguage]);
```

### 5. Display All Languages

**In Version Card:**
```typescript
{version.languages && version.languages.length > 0 ? (
  <div>
    <span className="text-text-muted">
      {version.languages.length > 1 ? 'Languages:' : 'Language:'}
    </span>
    {version.languages.map((lang, idx) => (
      <span key={idx}>
        {getLanguageFlag(lang)} {lang}
        {idx < version.languages.length - 1 && ' / '}
      </span>
    ))}
  </div>
) : null}
```

**In Listing Preview:**
```typescript
{formData.selectedVersion.languages && formData.selectedVersion.languages.length > 0
  ? formData.selectedVersion.languages.join('/')
  : formData.selectedVersion.language}
// Shows: "English/German/French"
```

## Real-World Examples

### Example 1: Catan (Multiple Editions)

**Versions Available:**
- Catan (English edition) - [English]
- Catan (German edition) - [German]
- Catan (English/French edition) - [English, French]
- Catan (Polish edition) - [Polish]

**User Selects "English":**
- Shows: English edition ✓
- Shows: English/French edition ✓
- Hides: German edition ✗
- Hides: Polish edition ✗

### Example 2: Wingspan Expansions

**Oceania Expansion:**
- Languages: [English, French, German, Italian, Spanish]

**User Selects "Italian":**
- Version appears because Italian is included
- Version card shows all 5 languages
- User knows they're getting a multilingual box

## Benefits

✅ **Accurate representation** - Shows all languages in the box
✅ **Better discoverability** - Multilingual versions appear for each language
✅ **Clear information** - Users know exactly what languages they're getting
✅ **Backward compatible** - Single-language versions still work perfectly
✅ **No data loss** - All BGG language information preserved

## Edge Cases Handled

1. **Version with no language data**: Falls back gracefully, shows "Continue without version" button
2. **Single-language version**: Shows "Language:" (singular) instead of "Languages:"
3. **Many languages**: Uses `/` separator for compact display (e.g., "EN/FR/DE/IT/ES")
4. **Language flags**: Uses `getLanguageFlag()` helper for visual recognition

## Database Schema Note

When storing to database, save both fields:
```sql
-- listings table
selected_version_id INTEGER,
version_languages TEXT[], -- Store as array: ['English', 'German', 'French']
```

This allows filtering like:
```sql
-- Find all listings with English versions
SELECT * FROM listings WHERE 'English' = ANY(version_languages);
```

## Future Enhancements

- [ ] Add badge showing "Multilingual" for versions with 3+ languages
- [ ] Allow users to search by multiple languages (e.g., "must have English AND German")
- [ ] Show language flags in dropdown for easier recognition
- [ ] Sort languages alphabetically vs by popularity
