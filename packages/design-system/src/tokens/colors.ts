// Color palette based on Nordic aesthetic with trust-building blues
export const colors = {
  // Nordic Polar Night - Base darks
  polar: {
    night: '#2E3440',      // Primary text, dark mode background
    nightLight: '#3B4252',  // Elevated surfaces in dark mode
    nightMedium: '#434C5E', // Further elevated surfaces
    nightDark: '#4C566A',   // Borders and dividers in dark mode
  },

  // Nordic Snow Storm - Base lights
  snow: {
    storm: '#D8DEE9',       // Subtle borders and dividers
    stormLight: '#E5E9F0',  // Elevated surfaces in light mode
    stormLightest: '#ECEFF4', // Primary background
    white: '#FEFEFE',       // Card backgrounds (not pure white)
  },

  // Nordic Frost - Primary trust colors (your signature)
  frost: {
    ice: '#88C0D0',         // Primary brand color - trust, CTAs
    polar: '#81A1C1',       // Hover states, active states
    arctic: '#5E81AC',      // Deep trust - verification badges
    ocean: '#4C7099',       // Pressed states, dark accents
  },

  // Aurora colors - Accents and states
  aurora: {
    orange: '#D08770',      // Urgency, hot deals (your refined orange)
    green: '#A3BE8C',       // Success states only (minimal use)
    red: '#BF616A',         // Errors, rare/collectible items
    yellow: '#EBCB8B',      // Warnings, attention needed
  },

  // Semantic colors - mapped from palette
  semantic: {
    // Primary actions (CTAs: buy, sell, list, submit)
    primary: '#D08770',           // aurora.orange
    primaryHover: '#C97862',
    primaryActive: '#B86954',

    // Trust and informational actions (save, filter, navigate)
    trust: '#88C0D0',             // frost.ice
    trustHover: '#81A1C1',        // frost.polar
    trustActive: '#5E81AC',       // frost.arctic

    // Accent (kept for backwards compat, maps to primary)
    accent: '#D08770',            // aurora.orange
    accentHover: '#C97862',
    accentActive: '#B86954',

    // Success (minimal use)
    success: '#A3BE8C',
    successHover: '#95B07D',
    successActive: '#87A06E',

    // Error states
    error: '#BF616A',
    errorHover: '#B5525B',
    errorActive: '#AB4E4C',

    // Warning states
    warning: '#EBCB8B',
    warningHover: '#E4C37C',
    warningActive: '#DDBB6D',

    // Text colors
    textHeading: '#2E3440',       // polar.night - headings (darker)
    textPrimary: '#3B4252',       // polar.nightLight - body text (lighter)
    textSecondary: '#434C5E',     // polar.nightMedium at 70% opacity
    textMuted: '#4C566A',         // polar.nightDark at 50% opacity
    textInverse: '#ECEFF4',       // For dark backgrounds

    // Background colors
    bgPrimary: '#ECEFF4',         // snow.stormLightest
    bgSecondary: '#E5E9F0',       // snow.stormLight
    bgElevated: '#FEFEFE',        // snow.white - cards
    bgOverlay: 'rgba(46, 52, 64, 0.6)', // Modals, drawers

    // Border colors
    borderSubtle: '#D8DEE9',      // snow.storm
    borderDefault: '#C8CED9',     // Slightly darker
    borderStrong: '#B8BEC9',      // For emphasis
    borderFocus: '#D08770',       // aurora.orange
  },

  // Condition badge colors (special marketplace need)
  condition: {
    likeNew: {
      bg: '#E3EEF4',
      text: '#5E81AC',
      border: '#88C0D0',
    },
    veryGood: {
      bg: '#E8F3E6',
      text: '#6B8E5F',
      border: '#A3BE8C',
    },
    good: {
      bg: '#F7F0DB',
      text: '#9B8556',
      border: '#EBCB8B',
    },
    acceptable: {
      bg: '#F5E3DB',
      text: '#A66B50',
      border: '#D08770',
    },
    forParts: {
      bg: '#F4DBDC',
      text: '#9B4B52',
      border: '#BF616A',
    },
  },
} as const;
