# Turni Integration: Galda Spēle

**Feature:** Mascot integration for daily board game guessing game  
**Prerequisite:** Basic Galda Spēle implementation complete  
**Status:** Phase 2 Enhancement  
**Last Updated:** January 2025

---

## Overview

Turni, Second Turn Games' chameleon mascot, appears in Galda Spēle to add personality and emotional resonance to key moments. The integration is subtle — Turni enhances the experience without cluttering the core gameplay loop.

### Design Principles

| Principle | Application |
|-----------|-------------|
| **Supportive, not intrusive** | Turni appears at emotional moments, not during active guessing |
| **Playful but not juvenile** | Reactions feel warm, not cartoonish |
| **Brand-consistent** | Turni's voice matches STG tone (friendly fellow gamer) |
| **Earned moments** | Celebrations feel meaningful, not constant |

---

## Turni Character Reference

### Visual Identity

| Attribute | Specification |
|-----------|---------------|
| **Species** | Chameleon |
| **Body color** | Frost blue (#88C0D0) |
| **Accent color** | Aurora orange (#D08770) — belly, cheeks, inner tail |
| **Outline color** | Polar night (#4C566A) |
| **Style** | Flat vector, minimal shading, no gradients |
| **Direction** | Always facing left ← (for mascot illustrations) |

### Personality Traits

- **Curious** — loves discovering games
- **Patient** — encouraging even after wrong guesses
- **Helpful** — guides without hand-holding
- **Warm** — celebrates wins genuinely, softens losses

### Available Moods/Poses

| Mood | Use Case | Asset Name |
|------|----------|------------|
| Neutral | Default, help modal | `turni-neutral.png` |
| Searching | Close guess, thinking | `turni-searching.png` |
| Celebrating | Win, streak milestone | `turni-celebrating.png` |
| Supportive | Loss, encouragement | `turni-supportive.png` |
| Holding meeple | Achievements, special moments | `turni-holding-meeple.png` |

---

## Integration Points

### 1. Help Modal

**When:** User clicks [?] button  
**Turni's role:** Explains the rules  
**Mood:** Neutral/helpful

```
┌──────────────────────────────────────────┐
│  How to Play                         [×] │
├──────────────────────────────────────────┤
│                                          │
│  [Turni neutral]  "Guess the mystery     │
│                    board game in 6       │
│                    tries. I'll give you  │
│                    hints after each      │
│                    guess!"               │
│                                          │
│  ✅ Green = Correct                      │
│  🟨 Yellow = Close                       │
│  ⬆️⬇️ = Higher/Lower                     │
│  ❌ = No match                           │
│                                          │
│  Categories and mechanics show which     │
│  ones matched.                           │
│                                          │
│              [Got it!]                   │
└──────────────────────────────────────────┘
```

**Copy (en.json):**
```json
{
  "Play": {
    "help": {
      "turniIntro": "Guess the mystery board game in 6 tries. I'll give you hints after each guess!"
    }
  }
}
```

---

### 2. Game Reveal — Win

**When:** Player guesses correctly  
**Turni's role:** Celebrates with the player  
**Mood:** Celebrating

```
┌──────────────────────────────────────────┐
│                                          │
│        [Turni celebrating]               │
│                                          │
│     "Nice move! You got it in 4!"        │
│                                          │
│          [Large Box Art]                 │
│           Wingspan                       │
│         2019 · 1-5 players               │
│                                          │
│    [View on STG]  [Share Results]        │
└──────────────────────────────────────────┘
```

**Copy variations by guess count:**

| Guesses | Turni says |
|---------|------------|
| 1 | "Wow, first try! Are you a mind reader?" |
| 2 | "Two guesses! You really know your games." |
| 3 | "Nice work! That was a tricky one." |
| 4 | "Got it! Solid detective work." |
| 5 | "Phew, you figured it out!" |
| 6 | "Just in time! That was close." |

---

### 3. Game Reveal — Loss

**When:** Player uses all 6 guesses without solving  
**Turni's role:** Encouraging, not pitying  
**Mood:** Supportive

```
┌──────────────────────────────────────────┐
│                                          │
│        [Turni supportive]                │
│                                          │
│     "Tough one! The answer was..."       │
│                                          │
│          [Large Box Art]                 │
│           Wingspan                       │
│         2019 · 1-5 players               │
│                                          │
│     "Tomorrow's another game!"           │
│                                          │
│    [View on STG]  [Share Results]        │
└──────────────────────────────────────────┘
```

**Copy (keep it light, forward-looking):**
- "Tough one! The answer was..."
- "Tomorrow's another game!"

Avoid: "Better luck next time" (patronizing), "Sorry!" (unnecessary), anything that dwells on the loss.

---

### 4. Stats Modal — Streak Milestones

**When:** Player opens stats and has notable streak  
**Turni's role:** Acknowledges achievement  
**Mood:** Holding meeple (proud)

| Streak | Turni says |
|--------|------------|
| 3 days | "Three in a row! You're on a roll." |
| 7 days | "A whole week! Impressive dedication." |
| 14 days | "Two weeks strong! 🎲" |
| 30 days | "A month of daily games. Legend." |

**Implementation:** Only show Turni comment for streaks ≥ 3. Below that, stats modal shows numbers only.

---

### 5. Optional: Close Guess Reaction

**When:** Player submits a guess with 3+ green/yellow cells  
**Turni's role:** Subtle encouragement  
**Mood:** Searching

**Implementation options:**

**A. Tooltip/toast (subtle):**  
Small Turni avatar with "Getting warmer!" appears briefly, fades after 1.5s.

**B. No reaction (recommended for v1):**  
Keep the core loop clean. Turni only appears at game end.

**Recommendation:** Skip this for initial Turni integration. Add later if players want more personality during gameplay.

---

## Share Text (Optional Enhancement)

Standard share format remains unchanged:

```
Galda Spēle #47 🎲 4/6

⬆️✅🟨⬇️🟨❌
⬆️✅🟨⬆️✅🟨
✅✅✅✅✅✅

secondturngames.com/play
```

**Optional Turni flavor (if testing shows positive reception):**

```
Galda Spēle #47 🎲 4/6
🦎 "Nice move!"

⬆️✅🟨⬇️🟨❌
...
```

**Recommendation:** Test standard format first. Turni in share text may feel forced. The emoji grid is already the hook.

---

## File Structure Additions

```
packages/marketplace/
├── components/play/
│   ├── ... (existing components)
│   └── TurniReaction.tsx        # NEW: Turni avatar + speech bubble
│
├── lib/play/
│   ├── ... (existing)
│   └── turni-copy.ts            # NEW: Turni dialogue by context
│
└── public/images/turni/
    ├── turni-neutral.png
    ├── turni-searching.png
    ├── turni-celebrating.png
    ├── turni-supportive.png
    └── turni-holding-meeple.png
```

---

## Component: TurniReaction

```tsx
// components/play/TurniReaction.tsx

interface TurniReactionProps {
  mood: 'neutral' | 'searching' | 'celebrating' | 'supportive' | 'holding-meeple';
  message: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TurniReaction({ mood, message, size = 'md' }: TurniReactionProps) {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <div className="flex items-start gap-3">
      <Image
        src={`/images/turni/turni-${mood}.png`}
        alt="Turni"
        className={sizeClasses[size]}
      />
      <div className="bg-frost-100 rounded-lg px-4 py-2 text-sm text-polar-700">
        {message}
      </div>
    </div>
  );
}
```

---

## Translation Keys

Add to existing `Play` namespace:

```json
{
  "Play": {
    "turni": {
      "helpIntro": "Guess the mystery board game in 6 tries. I'll give you hints after each guess!",
      "win": {
        "1": "Wow, first try! Are you a mind reader?",
        "2": "Two guesses! You really know your games.",
        "3": "Nice work! That was a tricky one.",
        "4": "Got it! Solid detective work.",
        "5": "Phew, you figured it out!",
        "6": "Just in time! That was close."
      },
      "loss": {
        "reveal": "Tough one! The answer was...",
        "encourage": "Tomorrow's another game!"
      },
      "streak": {
        "3": "Three in a row! You're on a roll.",
        "7": "A whole week! Impressive dedication.",
        "14": "Two weeks strong!",
        "30": "A month of daily games. Legend."
      }
    }
  }
}
```

---

## Implementation Checklist

### Assets Required
- [ ] Export Turni poses at appropriate sizes (64px, 96px, 128px)
- [ ] Ensure transparent backgrounds
- [ ] Optimize file sizes for web

### Components
- [ ] Create `TurniReaction.tsx` component
- [ ] Create `lib/play/turni-copy.ts` for dialogue logic
- [ ] Integrate Turni into `HelpModal.tsx`
- [ ] Integrate Turni into `GameReveal.tsx` (win state)
- [ ] Integrate Turni into `GameReveal.tsx` (loss state)
- [ ] Integrate Turni into `StatsModal.tsx` (streak milestones)

### Translations
- [ ] Add Turni keys to `en.json`
- [ ] Add Turni keys to `lv.json`
- [ ] Review tone in Latvian (maintain warmth without being overly casual)

### Testing
- [ ] Verify all Turni poses display correctly
- [ ] Test win flow at each guess count (1-6)
- [ ] Test loss flow
- [ ] Test streak milestone display (3, 7, 14, 30)
- [ ] Mobile: Ensure Turni doesn't crowd the layout

---

## Design Review Notes

Before implementation, confirm with design:

1. **Turni size in GameReveal** — Should Turni be larger than the box art, same size, or smaller? Recommend: smaller, positioned above the text.

2. **Speech bubble style** — Rounded rectangle with tail pointing to Turni, or simple text next to avatar?

3. **Animation** — Should Turni have a subtle entrance animation (fade/slide), or appear instantly?

4. **Color consistency** — Ensure Turni's Frost blue (#88C0D0) works against the game's background colors.

---

*"Every game deserves a second turn — and Turni's here to cheer you on."*
