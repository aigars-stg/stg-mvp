/**
 * Grading Guide Content
 *
 * Comprehensive condition grading guide adapted for Second Turn Games marketplace.
 * This content is consumed by:
 * - GradingGuidePanel (sell flow)
 * - ConditionInfoModal (buyer view)
 * - /help?section=grading (help hub)
 */

import type { ListingCondition } from './types/listing';

// ============================================================================
// Types
// ============================================================================

export interface GradeDetails {
  label: string;
  shortDescription: string;
  fullDescription: string;
  boxCriteria: string[];
  componentCriteria: string[];
  typicalScenarios: string[];
  valueGuidance: string;
  proTip?: string;
}

export interface SpecialConsideration {
  title: string;
  description: string;
  details: string[];
  impact: 'positive' | 'neutral' | 'varies' | 'negative';
}

export interface ListingTip {
  grade: ListingCondition;
  example: string;
}

export interface PhotoTip {
  subject: string;
  description: string;
}

export interface CommonMistake {
  mistake: string;
  correction: string;
}

// ============================================================================
// Condition Grades (4-grade system)
// ============================================================================

export const CONDITION_GRADES: Record<ListingCondition, GradeDetails> = {
  likeNew: {
    label: 'Like New',
    shortDescription: 'Appears unplayed or played once',
    fullDescription:
      'Opened but essentially untouched. This game looks like you just removed the shrink wrap. Many games get opened, admired, and put on the shelf - if that\'s your game, this is probably the right grade.',
    boxCriteria: [
      'No visible wear, scuffs, or scratches',
      'Corners sharp and intact',
      'No shelf wear or storage marks',
      'Original inserts and packaging included',
    ],
    componentCriteria: [
      'All components present and accounted for',
      'Cards show no wear - edges crisp, no bowing',
      'Tokens unpunched, or punched with no damage',
      'Rulebook pristine, no creases or marks',
      'Boards flat with no warping',
      'No table time - this game hasn\'t been played',
    ],
    typicalScenarios: [
      'Opened to read the rules, never played',
      'Played once with extreme care',
      'Received as a gift, not their type of game',
      'Shrink removed to check contents, never set up',
    ],
    valueGuidance: '80–95% of retail',
    proTip:
      'If you\'ve played even once or twice, consider Very Good instead. Like New means essentially untouched.',
  },

  veryGood: {
    label: 'Very Good',
    shortDescription: 'Played with care, minimal wear',
    fullDescription:
      'Played and enjoyed, but handled with care. A game in Very Good condition is what you\'d happily give as a gift. The "gift test": Would you wrap this and give it to a friend without apologizing for its condition?',
    boxCriteria: [
      'Minor shelf wear or light scuffing',
      'Corners may show slight softening',
      'Small surface scratches possible',
      'No tears, splits, or structural damage',
      'Original inserts usually present',
    ],
    componentCriteria: [
      'All components present',
      'Cards show minimal handling - light edge wear at most',
      'Tokens punched cleanly, no lifting or tearing',
      'Rulebook may have minor creases from use',
      'Boards flat or with only minimal warping',
      'Played a handful of times with care',
    ],
    typicalScenarios: [
      'Played 3-5 times at careful game nights',
      'Well-maintained in a collection',
      'Cards sleeved from first play',
      'Stored properly on a shelf',
    ],
    valueGuidance: '60–75% of retail',
    proTip:
      'This is the sweet spot for most second-hand games. Buyers get a great game at a fair price.',
  },

  good: {
    label: 'Good',
    shortDescription: 'Regular play wear, fully functional',
    fullDescription:
      'Clearly pre-loved - this game has seen regular play but remains fully functional. All the adventures, some of the wear. A game in Good condition plays perfectly fine; the wear is cosmetic, not functional.',
    boxCriteria: [
      'Noticeable wear, scuffs, or scratches',
      'Corner wear - soft corners, possible minor splits',
      'Possible small dents or dings',
      'Light ring wear or sticker residue',
      'Original inserts may be missing or damaged',
    ],
    componentCriteria: [
      'All components present (or missing pieces clearly noted)',
      'Cards show shuffling wear on edges',
      'Some components may show play wear',
      'Rulebook may have creases, minor tears, or notes',
      'Boards may have minor warping or edge wear',
      'Game has been played multiple times',
    ],
    typicalScenarios: [
      'Regular game night favorite',
      'Passed between friends',
      'Well-loved family game',
      'Café or club copy',
    ],
    valueGuidance: '40–55% of retail',
    proTip:
      'Many collectors are happy with Good condition for games they want to play rather than display.',
  },

  acceptable: {
    label: 'Acceptable',
    shortDescription: 'Heavy wear, still playable',
    fullDescription:
      'Well-loved and showing it. This game works, but it\'s seen better days. Always note what\'s missing or damaged in your listing description - buyers deserve to know exactly what they\'re getting.',
    boxCriteria: [
      'Significant wear, creases, or damage',
      'Corner splits, tears, or tape repairs',
      'Major scuffs, stains, or writing',
      'Box may not close properly',
      'Original inserts likely missing',
    ],
    componentCriteria: [
      'All crucial components present (minor pieces may be missing)',
      'Cards worn - may need sleeves to play comfortably',
      'Some tokens may show wear, lifting, or minor damage',
      'Rulebook heavily worn, possibly replaced with printed copy',
      'Boards may have noticeable wear or warping',
      'May have replacement components',
    ],
    typicalScenarios: [
      'Heavily played family favorite',
      'Rescued from a thrift store',
      'Missing a few minor components',
      'Box damaged but game complete',
    ],
    valueGuidance: '20–35% of retail',
    proTip:
      'Be very specific about damage. "Acceptable with taped corner" is better than vague descriptions.',
  },
};

// ============================================================================
// Special Considerations
// ============================================================================

export const SPECIAL_CONSIDERATIONS: Record<string, SpecialConsideration> = {
  punchedTokens: {
    title: 'Punched vs unpunched tokens',
    description:
      'Whether cardboard tokens have been punched from their sheets matters to some buyers.',
    details: [
      'Unpunched: tokens still in their original sheets, never removed',
      'Punched: tokens removed from sheets (standard for any played game)',
      'Cleanly punched: removed carefully with no lifting, tearing, or damage',
      'Roughly punched: some lifting, tearing, or white edges visible',
    ],
    impact: 'neutral',
  },

  sleevedCards: {
    title: 'Sleeved cards',
    description: 'Cards protected in sleeves are a plus. Note this in your listing.',
    details: [
      'Cards sleeved since purchase (never shuffled unsleeved)',
      'Cards sleeved after some play (mention any pre-sleeve wear)',
      'Note if sleeves are included or if cards will be removed from sleeves',
    ],
    impact: 'positive',
  },

  paintedMinis: {
    title: 'Painted miniatures',
    description:
      'Some buyers want painted minis, others specifically don\'t. Be clear about the state.',
    details: [
      'Unpainted (original)',
      'Primed only',
      'Partially painted',
      'Fully painted (describe quality: tabletop standard, display quality, etc.)',
      'Modified or converted',
    ],
    impact: 'varies',
  },

  promosExtras: {
    title: 'Promos & extras',
    description:
      'Promotional content, Kickstarter extras, or expansion material adds value - make sure buyers know.',
    details: [
      'List specific promos by name',
      'Note if from Kickstarter or retail edition',
      'Mention any bonus components not in retail version',
      'Separate pricing for valuable promos is acceptable',
    ],
    impact: 'positive',
  },

  editionLanguage: {
    title: 'Edition & language',
    description:
      'Edition matters a lot. Different editions can have different components, art, or rules.',
    details: [
      'Which edition (1st, 2nd, Revised, Collector\'s, etc.)',
      'Publisher (different publishers = different components)',
      'Language of the game',
      'Whether language-independent (no text on components)',
    ],
    impact: 'varies',
  },
};

// ============================================================================
// Listing Tips
// ============================================================================

export const LISTING_TIPS: ListingTip[] = [
  {
    grade: 'likeNew',
    example:
      'Opened to read the rules, never played. All components still in original packaging. Cards never shuffled. Stored flat on a shelf in a smoke-free home.',
  },
  {
    grade: 'veryGood',
    example:
      'Played maybe five times. Cards sleeved from first play, no wear. All components present. Original insert intact. Box shows minor shelf wear.',
  },
  {
    grade: 'good',
    example:
      'Box shows shelf wear and one soft corner. Inside is in great shape - cards show light edge wear from shuffling. All components present.',
  },
  {
    grade: 'acceptable',
    example:
      'Box has significant wear and a taped corner. Components are all there and play fine, but cards show shuffling wear. Rulebook has some creases. Good candidate for sleeving.',
  },
];

// ============================================================================
// Photo Tips
// ============================================================================

export const PHOTO_TIPS: PhotoTip[] = [
  {
    subject: 'Box front',
    description: 'Straight on, good lighting - shows the game and any wear',
  },
  {
    subject: 'Box back',
    description: 'Shows edition info and component list',
  },
  {
    subject: 'Box corners',
    description: 'If there\'s wear, show it honestly',
  },
  {
    subject: 'Components spread',
    description: 'Show what\'s included - full component photo',
  },
  {
    subject: 'Any damage',
    description: 'Close-ups of specific issues buyers should know about',
  },
  {
    subject: 'Cards',
    description: 'Show edge wear if present - that\'s where wear shows first',
  },
];

// ============================================================================
// Common Mistakes
// ============================================================================

export const COMMON_MISTAKES: CommonMistake[] = [
  {
    mistake: '"It\'s old, so it must be worn"',
    correction:
      'Age doesn\'t equal condition. A 20-year-old game stored well can be Like New. A 2-year-old game from 50 game nights might be Good.',
  },
  {
    mistake: '"The box doesn\'t matter"',
    correction:
      'It matters to collectors. Many buyers care about box condition for display. Grade it honestly.',
  },
  {
    mistake: '"Complete means nothing\'s missing"',
    correction:
      'Complete also means original. If you\'ve replaced dice or printed new player aids, note it.',
  },
  {
    mistake: 'Inventing grades like "Near Mint" or "Excellent"',
    correction:
      'Stick to our four grades: Like New, Very Good, Good, Acceptable. Custom terms make comparison harder.',
  },
  {
    mistake: 'Grading based on how much you paid',
    correction:
      'A €100 game in rough shape is still Acceptable. Grade the actual condition, not the value.',
  },
];

// ============================================================================
// Quick Reference
// ============================================================================

export const QUICK_REFERENCE = [
  {
    grade: 'likeNew' as ListingCondition,
    oneLineSummary: 'Opened but unplayed, no wear',
    valueRange: '80–95%',
  },
  {
    grade: 'veryGood' as ListingCondition,
    oneLineSummary: 'Played with care, minimal wear',
    valueRange: '60–75%',
  },
  {
    grade: 'good' as ListingCondition,
    oneLineSummary: 'Regular play wear, fully functional',
    valueRange: '40–55%',
  },
  {
    grade: 'acceptable' as ListingCondition,
    oneLineSummary: 'Heavy wear, possible minor issues',
    valueRange: '20–35%',
  },
];

// ============================================================================
// Guide Metadata
// ============================================================================

export const GUIDE_INTRO = {
  title: 'Condition grading guide',
  tagline: 'Grade honestly. Sell faster. Keep everyone happy.',
  description:
    'When you grade your game accurately, buyers know exactly what they\'re getting. No surprises, no disputes, no disappointment. A well-graded listing sells faster and keeps everyone happy.',
};

export const GRADING_PHILOSOPHY = {
  title: 'When you\'re unsure',
  content:
    'If you\'re debating between two grades, go with the lower one. A buyer who receives a game in better condition than expected is delighted. A buyer who receives a game in worse condition than expected opens a dispute. Under-promise, over-deliver.',
};
