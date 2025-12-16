# Fix: Version Selection useEffect Loop

## Problem

After implementing auto-select for single versions, manual version selection was broken. When a user clicked on a version in the multi-version flow, the selection appeared to not register or the UI would behave unexpectedly.

## Root Cause

The `LanguageVersionSelector` component had a `useEffect` with `onSelect` in its dependency array:

```typescript
useEffect(() => {
  // Fetch versions and auto-select if needed
}, [game.id, onSelect]); // ❌ onSelect changes on every parent render
```

The problem:
1. User clicks a version card
2. Parent component's `setFormData` is called
3. Parent re-renders
4. **New `onSelect` function is created** (inline arrow function)
5. Child component receives new `onSelect` prop
6. `useEffect` sees dependency changed and runs again
7. `setSelectedLanguage('')` resets the language selection
8. This causes confusion in the UI state

## Solution

### 1. Stabilize the Callback with `useCallback` ([sell/page.tsx:81-84](packages/marketplace/app/sell/page.tsx#L81-L84))

```typescript
// Stable callback for version selection (prevents useEffect loop in child)
const handleVersionSelect = useCallback((version: BGGVersion) => {
  setFormData((prev) => ({ ...prev, selectedVersion: version }));
}, []);
```

The empty dependency array `[]` means this function is created once and never changes, preventing unnecessary re-renders and useEffect triggers.

### 2. Use the Stable Callback ([sell/page.tsx:272-276](packages/marketplace/app/sell/page.tsx#L272-L276))

```typescript
<LanguageVersionSelector
  game={formData.selectedGame}
  selectedVersion={formData.selectedVersion}
  onSelect={handleVersionSelect} // ✅ Stable reference
/>
```

### 3. Remove `onSelect` from Dependencies ([LanguageVersionSelector.tsx:50-51](packages/marketplace/components/sell/LanguageVersionSelector.tsx#L50-L51))

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [game.id]); // Only re-run when game changes, not when onSelect changes
```

This is safe because:
- `onSelect` is now stable (doesn't change)
- We only want to fetch versions when the game changes
- The auto-select logic uses the `onSelect` function, but it doesn't need to be in dependencies

## Why This Matters

### Before Fix:
```
User clicks version
  ↓
Parent updates state
  ↓
Parent re-renders
  ↓
New onSelect function created
  ↓
Child detects onSelect changed
  ↓
useEffect runs → resets language selection
  ↓
UI becomes confused
```

### After Fix:
```
User clicks version
  ↓
Parent updates state
  ↓
Parent re-renders
  ↓
Same onSelect function (stable)
  ↓
Child doesn't detect change
  ↓
No unnecessary re-fetch
  ↓
Selection works correctly ✅
```

## Testing

To verify the fix:

1. **Multi-version game** (e.g., Wingspan):
   - [ ] Select a language from dropdown
   - [ ] Version cards appear
   - [ ] Click on a version
   - [ ] Selected version shows checkmark
   - [ ] Condition section appears below
   - [ ] Can still change selection by clicking another version

2. **Single-version game** (e.g., Gelati):
   - [ ] Game selected
   - [ ] Version auto-selects
   - [ ] Green confirmation card appears
   - [ ] Condition section appears below

3. **No-version game**:
   - [ ] Yellow warning appears
   - [ ] "Continue without version" button works

4. **Changing games**:
   - [ ] Select game A with multiple versions
   - [ ] Select a language
   - [ ] Select a version
   - [ ] Change to game B
   - [ ] Language selection resets
   - [ ] Version selection resets
   - [ ] Can select new version for game B

## Related React Patterns

This is a common React anti-pattern: **passing unstable callbacks to child components with useEffect dependencies**.

### Anti-Pattern ❌
```typescript
// Parent
<Child onSomething={(data) => setState(data)} />

// Child
useEffect(() => {
  // Do something
}, [onSomething]); // onSomething changes every render!
```

### Correct Pattern ✅
```typescript
// Parent
const handleSomething = useCallback((data) => setState(data), []);
<Child onSomething={handleSomething} />

// Child
useEffect(() => {
  // Do something
}, [onSomething]); // Now stable!
```

Or remove from dependencies if safe:
```typescript
// Child
useEffect(() => {
  // Do something that uses onSomething
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Safe if onSomething doesn't need to be reactive
```

## Performance Benefit

Beyond fixing the bug, this also improves performance:
- Prevents unnecessary re-fetching of versions from BGG API
- Reduces re-renders in child component
- Avoids resetting component state unnecessarily

## References

- [React useCallback Hook](https://react.dev/reference/react/useCallback)
- [React useEffect Dependencies](https://react.dev/reference/react/useEffect#removing-unnecessary-object-dependencies)
