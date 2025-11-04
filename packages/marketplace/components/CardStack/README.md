# CardStack Component

A Tinder-style swipeable card stack component for showcasing featured games. Built with React, TypeScript, and Tailwind CSS.

## Features

- **Touch & Mouse Gestures**: Full support for swipe gestures on touch devices and mouse dragging on desktop
- **Tap to View Details**: Tap/click on a card to view detailed information in a modal
- **Haptic Feedback**: Vibration feedback on mobile devices when crossing swipe thresholds
- **Smooth Animations**: CSS-based animations with customizable easing functions
- **Velocity-Based Swiping**: Swipe commits based on either distance or velocity
- **Stacked Card Effect**: Cards stack behind each other with rotation and scale effects
- **Auto-Rotation**: Automatically loads next cards as you swipe through the stack
- **Empty State**: Shows a friendly message when all cards have been swiped
- **First-Time User Hint**: Animated hint that appears for new users
- **Keyboard Navigation**: Use arrow keys to swipe cards (desktop)
- **Reduced Motion Support**: Respects user's motion preferences

## Usage

### Basic Example

\`\`\`tsx
import { CardStack } from '@/components/CardStack';
import type { Game } from '@/lib/mock-data';

function FeaturedGames() {
  const featuredGames = mockGames.slice(0, 5);

  const handleSwipe = (direction: 'left' | 'right', game: Game) => {
    console.log(\`Swiped \${direction}:\`, game.title);
  };

  const handleCardTap = (game: Game) => {
    // Open detail modal or navigate to game page
    console.log('Tapped:', game.title);
  };

  const handleStackEmpty = () => {
    console.log('All cards swiped!');
  };

  return (
    <CardStack
      games={featuredGames}
      onSwipe={handleSwipe}
      onCardTap={handleCardTap}
      onStackEmpty={handleStackEmpty}
      maxCards={5}
    />
  );
}
\`\`\`

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| \`games\` | \`Game[]\` | Yes | - | Array of games to display in the stack |
| \`onSwipe\` | \`(direction: 'left' \| 'right', game: Game) => void\` | No | - | Callback fired when a card is swiped |
| \`onCardTap\` | \`(game: Game) => void\` | No | - | Callback fired when a card is tapped |
| \`onStackEmpty\` | \`() => void\` | No | - | Callback fired when all cards have been swiped |
| \`maxCards\` | \`number\` | No | 5 | Maximum number of cards to show in the stack at once |

## Gesture Behavior

### Swipe Thresholds

A swipe is committed when **either** condition is met:

- **Distance**: Card is dragged more than 120px horizontally
- **Velocity**: Card is flicked faster than 0.6px/ms

### Tap Detection

A tap is registered when:

- Movement is less than 15px from the starting position
- Gesture duration is less than 400ms

### Haptic Feedback

On mobile devices with vibration API support:

- **Light vibration (20ms)**: When crossing the commit threshold while dragging
- **Medium vibration (40ms)**: When a swipe is successfully committed

## Styling

The component uses Tailwind CSS classes and custom CSS properties for animations. Required animations are defined in the marketplace's \`tailwind.config.ts\`:

\`\`\`typescript
keyframes: {
  'fade-in-out': {
    '0%': { opacity: '0' },
    '20%': { opacity: '1' },
    '80%': { opacity: '1' },
    '100%': { opacity: '0' },
  },
  'swipe-left': {
    '0%, 100%': { transform: 'translateX(0)' },
    '50%': { transform: 'translateX(-10px)' },
  },
  'swipe-right': {
    '0%, 100%': { transform: 'translateX(0)' },
    '50%': { transform: 'translateX(10px)' },
  },
}
\`\`\`

## Card Stack Positions

Cards in the stack have preset rotation and scale values:

| Position | Rotation | Scale | Z-Index |
|----------|----------|-------|---------|
| 0 (top) | -1deg | 1.0 | 10 |
| 1 | -6deg | 0.97 | 9 |
| 2 | 4deg | 0.94 | 8 |
| 3 | -7deg | 0.91 | 7 |
| 4 | 3deg | 0.88 | 6 |

## Responsive Design

The card stack is fully responsive:

- **Mobile**: Smaller cards (280-315px wide)
- **Tablet**: Medium cards (300-315px wide)
- **Desktop**: Full-size cards (315px wide)

Container height adjusts to maintain proper aspect ratio:

- **Mobile**: 550px height
- **Desktop**: 635px height

## Browser Support

- **Modern browsers**: Full support with Pointer Events API
- **Legacy browsers**: Fallback to Touch Events + Mouse Events
- **Haptic feedback**: Only on browsers with Vibration API (mostly mobile)

## Accessibility

- **Keyboard navigation**: Arrow keys to swipe, Enter/Space to open details
- **Reduced motion**: Respects \`prefers-reduced-motion\` setting
- **Touch targets**: Minimum 44x44px for mobile accessibility
- **Focus states**: Clear focus indicators for keyboard navigation

## Performance

- **CSS transforms**: Hardware-accelerated animations
- **Event throttling**: Touch history limited to last 5 positions
- **Lazy loading**: Only maxCards are rendered at once
- **Transition optimization**: \`will-change\` property for smooth animations

## File Structure

\`\`\`
CardStack/
├── CardStack.tsx          # Main container component
├── SwipeCard.tsx          # Individual card component
├── useSwipeGesture.ts     # Gesture handling hook
├── types.ts               # TypeScript type definitions
├── index.ts               # Public exports
└── README.md              # This file
\`\`\`

## Customization

### Changing Swipe Thresholds

Edit the constants in \`useSwipeGesture.ts\`:

\`\`\`typescript
const COMMIT_DISTANCE = 120; // Distance in pixels
const COMMIT_VELOCITY = 0.6; // Velocity in px/ms
\`\`\`

### Changing Card Stack Positions

Edit the \`stackPositions\` array in \`SwipeCard.tsx\`:

\`\`\`typescript
const stackPositions = [
  { rotation: -1, scale: 1, tx: 0, ty: 0, opacity: 1 },
  // ... more positions
];
\`\`\`

### Disabling First-Time Hint

The hint uses localStorage key \`hasSeenSwipeHint\`. To disable:

\`\`\`typescript
localStorage.setItem('hasSeenSwipeHint', 'true');
\`\`\`

## Known Limitations

- Maximum of 5 cards visible in stack at once (configurable via \`maxCards\` prop)
- Swipe hint shows only once per browser (uses localStorage)
- Haptic feedback only works on supported mobile browsers
- Card images are currently placeholders (needs integration with image service)

## Future Enhancements

- [ ] Image lazy loading
- [ ] Undo last swipe functionality
- [ ] Swipe left/right action indicators
- [ ] Card flip animation for additional details
- [ ] Multi-touch gesture support
- [ ] Analytics integration for swipe events
- [ ] A/B testing for swipe thresholds
