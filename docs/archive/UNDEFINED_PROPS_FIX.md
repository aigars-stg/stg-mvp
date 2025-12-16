# Fix: Undefined String Props in Form Components

## Issue

**Error**: `TypeError: Cannot read properties of undefined (reading 'length')`
**Location**: `components/sell/PricingShipping.tsx` line 194
**Trigger**: Clicking "Continue" from Step 1 to Step 2

## Root Cause

The listing form uses localStorage to save and restore drafts. When old drafts (created before certain form fields were added) are loaded, new fields like `shippingNotes` and `whySelling` are undefined instead of empty strings.

```typescript
// Old draft might be missing these fields:
{
  selectedGame: {...},
  price: "25",
  // shippingNotes is missing! ❌
  // whySelling is missing! ❌
}
```

When these undefined values reach components that expect strings, calling `.length` on them causes a TypeError.

## Solution

Implemented a two-part fix:

### 1. Draft Merging (Prevention)

Updated [app/sell/page.tsx:94](packages/marketplace/app/sell/page.tsx#L94) to merge loaded drafts with `INITIAL_FORM_DATA`:

```typescript
// Before
setFormData(parsed.formData);

// After
setFormData({ ...INITIAL_FORM_DATA, ...parsed.formData });
```

**Benefits**:
- Ensures all fields have default values
- Future-proof against new fields
- Preserves saved draft data

### 2. Defensive Coding (Protection)

Added `|| ''` fallback to all string form fields throughout components.

## Files Modified

### PricingShipping.tsx

**Text Inputs**:
```typescript
// Before
value={shippingNotes}
value={whySelling}

// After
value={shippingNotes || ''}
value={whySelling || ''}
```

**Character Counts**:
```typescript
// Before
{shippingNotes.length}/300 characters
{whySelling.length}/300 characters

// After
{(shippingNotes || '').length}/300 characters
{(whySelling || '').length}/300 characters
```

**Input Components**:
```typescript
// Before
value={price}
value={minimumOffer}
value={pickupCity}

// After
value={price || ''}
value={minimumOffer || ''}
value={pickupCity || ''}
```

**Lines Changed**: 54, 89, 168, 186, 194, 207, 215

### ConditionSelector.tsx

**Text Inputs**:
```typescript
// Before
value={conditionNotes}
value={missingComponents}
value={extras.other}

// After
value={conditionNotes || ''}
value={missingComponents || ''}
value={extras.other || ''}
```

**Character Count**:
```typescript
// Before
{conditionNotes.length}/500 characters

// After
{(conditionNotes || '').length}/500 characters
```

**Lines Changed**: 97, 104, 153, 208

### sell/page.tsx

**Draft Loading**:
```typescript
const parsed = JSON.parse(draft);
// Merge with INITIAL_FORM_DATA to ensure all fields exist (handles old drafts)
setFormData({ ...INITIAL_FORM_DATA, ...parsed.formData });
setCurrentStep(parsed.currentStep);
```

**Line Changed**: 94

## Why This Works

### The `|| ''` Pattern

```typescript
value={shippingNotes || ''}
```

**If `shippingNotes` is**:
- `undefined` → Uses `''` (empty string)
- `null` → Uses `''` (empty string)
- `''` → Uses `''` (already empty string)
- `"Some text"` → Uses `"Some text"` (existing value)

This ensures:
1. ✅ Always a controlled component (never undefined)
2. ✅ Safe to call `.length` on
3. ✅ No change to existing behavior
4. ✅ No performance impact

### The Merge Pattern

```typescript
{ ...INITIAL_FORM_DATA, ...parsed.formData }
```

**Result**:
- All fields from INITIAL_FORM_DATA are present
- Saved draft values override defaults
- New fields get default values even in old drafts

## Testing

### Test Case 1: Fresh Start ✅
1. Go to /sell
2. No localStorage draft exists
3. All fields initialize to empty strings from INITIAL_FORM_DATA
4. Continue from Step 1 → Step 2 works

### Test Case 2: Old Draft ✅
1. Have old draft in localStorage missing `shippingNotes`, `whySelling`
2. Go to /sell
3. Draft loads and merges with INITIAL_FORM_DATA
4. Missing fields get default empty string values
5. Continue from Step 1 → Step 2 works

### Test Case 3: Complete Draft ✅
1. Save draft with all fields filled
2. Reload page
3. All values restored correctly
4. No data loss

### Test Case 4: Typing in Fields ✅
1. Type in shippingNotes textarea
2. Character count updates correctly
3. Value saved properly
4. Form submission works

## Fields Protected

All string form fields now have defensive coding:

**Step 1 (Condition)**:
- ✅ `conditionNotes` - Condition description
- ✅ `missingComponents` - Missing components description
- ✅ `extras.other` - Other extras text

**Step 2 (Pricing & Shipping)**:
- ✅ `price` - Asking price
- ✅ `minimumOffer` - Minimum offer amount
- ✅ `pickupCity` - Local pickup city
- ✅ `shippingNotes` - Additional shipping notes
- ✅ `whySelling` - Why selling description

## Future Additions

When adding new string fields to the form:

1. **Add to interface** (`ListingFormData`):
   ```typescript
   newField: string;
   ```

2. **Add to INITIAL_FORM_DATA**:
   ```typescript
   newField: '',
   ```

3. **Use defensive coding in component**:
   ```typescript
   value={newField || ''}
   {(newField || '').length}/300 characters
   ```

This pattern prevents undefined errors and ensures old drafts work with new fields.

## Related Issues Prevented

This fix also prevents:
- ❌ "A component is changing an uncontrolled input to be controlled" warnings
- ❌ Input fields becoming uncontrolled
- ❌ TypeScript errors about undefined string operations
- ❌ Form submission errors due to undefined values

## Performance Impact

**None**. The `|| ''` operator is:
- ✅ Extremely fast (single comparison)
- ✅ No memory allocation if already a string
- ✅ No re-renders triggered
- ✅ Compatible with all browsers

## Migration Notes

**No breaking changes**:
- ✅ Existing drafts still load correctly
- ✅ Form behavior unchanged for users
- ✅ All validations still work
- ✅ No data loss

**User Impact**:
- ✅ Error fixed immediately
- ✅ Old drafts continue to work
- ✅ Better error resilience
- ✅ Smoother form experience
