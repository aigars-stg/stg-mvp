// Animation timing - fast and responsive for Baltic users
export const animation = {
  // Duration (max 200ms for UI, 300ms for page transitions)
  duration: {
    instant: '100ms',    // Immediate feedback
    fast: '150ms',       // Hover states, tooltips
    normal: '200ms',     // Standard transitions
    slow: '300ms',       // Page transitions, complex animations
  },

  // Easing functions
  easing: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',     // Default
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',   // Enter
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',     // Exit
    sharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',        // Quick attention
  },

  // Common transitions (combine duration + easing)
  transition: {
    fast: 'all 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    normal: 'all 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    slow: 'all 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
} as const;

// Semantic animations for specific interactions
export const semanticAnimation = {
  hover: {
    // Subtle scale and shadow change
    scale: 'transform 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    shadow: 'box-shadow 200ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
  press: {
    // Quick scale down feedback
    scale: 'transform 100ms cubic-bezier(0.4, 0.0, 1, 1)',
  },
  focus: {
    // Ring appearance
    ring: 'box-shadow 150ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
  modal: {
    // Overlay fade in
    overlay: 'opacity 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
    content: 'transform 300ms cubic-bezier(0.0, 0.0, 0.2, 1), opacity 300ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  },
} as const;
