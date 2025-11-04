export interface Review {
  id: string;
  reviewer: string;
  rating: number;
  date: string;
  comment: string;
  gamePurchased: string;
}

export interface ChecklistItem {
  item: string;
  present: boolean;
  note?: string;
}

export interface Game {
  id: string;
  // BGG Integration fields
  bggId?: number;
  bggVersionId?: number;

  // Game info
  title: string;
  versionName?: string;  // e.g., "English fifth edition"
  publisher?: string;
  language?: string;
  languageCode?: string;
  yearPublished?: number;  // Edition year
  productCode?: string;

  designer: string;
  year: number;  // Original game year
  condition: 'likeNew' | 'veryGood' | 'good' | 'acceptable' | 'forParts';
  price: number;
  shipping: number;
  location: string;
  playerCount: string;
  playingTime: string;
  category: string;
  seller: {
    username: string;
    rating: number;
    verified: boolean;
    memberSince?: string;
    gamesSold?: number;
    responseTime?: string;
  };
  imageUrl: string;
  images?: string[];
  detailedCondition?: string;
  completeness?: ChecklistItem[];
  bggRating?: number;
  ageRecommendation?: string;
  complexity?: number;
  description?: string;
  reviews?: Review[];
  shippingOptions?: {
    standard: number;
    express?: number;
    localPickup: boolean;
  };

  // New fields for Phase 1
  extras?: {
    sleeved?: boolean;
    expansion?: boolean;
    expansionName?: string;
    promos?: boolean;
    customInsert?: boolean;
  };
}

export const mockGames: Game[] = [
  {
    id: '1',
    bggId: 13,
    bggVersionId: 436217,
    title: 'Settlers of Catan',
    versionName: 'English fifth edition',
    publisher: 'Catan Studio',
    language: 'English',
    languageCode: 'en',
    yearPublished: 2019,
    productCode: 'CN3071',
    designer: 'Klaus Teuber',
    year: 1995,
    condition: 'veryGood',
    price: 28,
    shipping: 5,
    location: 'Riga',
    playerCount: '3-4',
    playingTime: '60-120',
    category: 'strategy',
    seller: {
      username: 'boardgame_enthusiast',
      rating: 4.8,
      verified: true,
      memberSince: 'March 2023',
      gamesSold: 47,
      responseTime: 'usually responds within 2 hours',
    },
    imageUrl: '/images/catan.jpg',
    images: ['/images/catan.jpg', '/images/catan-back.jpg', '/images/catan-components.jpg', '/images/catan-box-wear.jpg'],
    detailedCondition: 'Played approximately 15 times over 2 years. All cards have been sleeved since purchase, so they\'re in perfect condition. Box has minor shelf wear on corners but no tears or significant damage. All wooden pieces are intact with original finish. Stored in smoke-free home. Selling because I\'m moving to a smaller apartment and need to downsize my collection.',
    bggRating: 7.2,
    ageRecommendation: '10+',
    complexity: 2.3,
    description: 'In Catan, players try to be the dominant force on the island of Catan by building settlements, cities, and roads. On each turn dice are rolled to determine what resources the island produces. Players build by spending resources (sheep, wheat, wood, brick and ore) that are depicted by these resource cards; each land type, with the exception of the unproductive desert, produces a specific resource: hills produce brick, forests produce wood, mountains produce ore, fields produce wheat, and pastures produce sheep.',
    completeness: [
      { item: '19 terrain hexes', present: true },
      { item: '6 sea frame pieces', present: true },
      { item: '9 harbor pieces', present: true },
      { item: '18 number tokens', present: true },
      { item: '95 resource cards', present: true },
      { item: '25 development cards', present: true },
      { item: '4 building costs cards', present: true },
      { item: '2 special cards (Longest Road, Largest Army)', present: true },
      { item: '16 cities, 20 settlements, 60 roads', present: true },
      { item: '2 dice', present: true },
      { item: '1 robber', present: true },
      { item: 'Rulebook', present: true },
    ],
    reviews: [
      {
        id: 'r1',
        reviewer: 'strategy_fan',
        rating: 5,
        date: '2024-09-15',
        comment: 'Perfect condition as described. Fast shipping and great communication. Would buy from this seller again!',
        gamePurchased: 'Ticket to Ride',
      },
      {
        id: 'r2',
        reviewer: 'baltic_player',
        rating: 5,
        date: '2024-08-22',
        comment: 'Game arrived exactly as shown in photos. Seller was very responsive to questions.',
        gamePurchased: 'Pandemic',
      },
      {
        id: 'r3',
        reviewer: 'riga_gamer',
        rating: 4,
        date: '2024-07-10',
        comment: 'Good condition, slight delay in shipping but seller communicated well.',
        gamePurchased: 'Carcassonne',
      },
    ],
    shippingOptions: {
      standard: 5,
      express: 12,
      localPickup: true,
    },
    extras: {
      sleeved: true,
    },
  },
  {
    id: '2',
    bggId: 266192,
    bggVersionId: 386163,
    title: 'Wingspan',
    versionName: 'English second edition',
    publisher: 'Stonemaier Games',
    language: 'English',
    languageCode: 'en',
    yearPublished: 2019,
    productCode: 'STM900',
    designer: 'Elizabeth Hargrave',
    year: 2019,
    condition: 'likeNew',
    price: 45,
    shipping: 5,
    location: 'Vilnius',
    playerCount: '1-5',
    playingTime: '40-70',
    category: 'strategy',
    seller: {
      username: 'bird_lover_lt',
      rating: 4.9,
      verified: true,
      memberSince: 'January 2024',
      gamesSold: 12,
      responseTime: 'usually responds same day',
    },
    imageUrl: '/images/wingspan.jpg',
    images: ['/images/wingspan.jpg', '/images/wingspan-back.jpg', '/images/wingspan-components.jpg'],
    detailedCondition: 'Played only 3 times. Game is in like-new condition - you would not be able to tell it from a new copy. All cards are pristine, bird eggs and food tokens are unused, player mats have no wear. Box is perfect with no shelf wear. Includes all original components plus the Swift Start pack. Non-smoking, pet-free home.',
    bggRating: 8.0,
    ageRecommendation: '10+',
    complexity: 2.4,
    description: 'Wingspan is a competitive, medium-weight, card-driven, engine-building board game about birds. You are bird enthusiasts—researchers, bird watchers, ornithologists, and collectors—seeking to discover and attract the best birds to your network of wildlife preserves. Each bird extends a chain of powerful combinations in one of your habitats. Each habitat focuses on a key aspect of the growth of your preserves.',
    completeness: [
      { item: '170 bird cards', present: true },
      { item: '26 bonus cards', present: true },
      { item: '16 Automa cards', present: true },
      { item: '103 food tokens', present: true },
      { item: '75 egg miniatures', present: true },
      { item: '5 player mats', present: true },
      { item: '5 custom wooden dice', present: true },
      { item: 'Birdfeeder dice tower', present: true },
      { item: 'Scorepad', present: true },
      { item: 'Rulebook', present: true },
      { item: 'Appendix', present: true },
    ],
    reviews: [
      {
        id: 'r4',
        reviewer: 'nature_lover',
        rating: 5,
        date: '2024-09-28',
        comment: 'Absolutely perfect condition. Seller was honest and helpful. Great experience!',
        gamePurchased: 'Azul',
      },
      {
        id: 'r5',
        reviewer: 'vilnius_player',
        rating: 5,
        date: '2024-09-01',
        comment: 'Met for local pickup - game was exactly as described. Very friendly seller!',
        gamePurchased: 'Splendor',
      },
    ],
    shippingOptions: {
      standard: 5,
      express: 12,
      localPickup: true,
    },
  },
  {
    id: '3',
    title: 'Ticket to Ride: Europe',
    designer: 'Alan R. Moon',
    year: 2005,
    condition: 'good',
    price: 32,
    shipping: 5,
    location: 'Tallinn',
    playerCount: '2-5',
    playingTime: '30-60',
    category: 'family',
    seller: {
      username: 'train_master',
      rating: 4.7,
      verified: false,
      memberSince: 'June 2024',
      gamesSold: 5,
      responseTime: 'usually responds within 1 day',
    },
    imageUrl: '/images/ticket-to-ride.jpg',
    images: ['/images/ticket-to-ride.jpg'],
    detailedCondition: 'Well-loved game that has seen regular play. Cards show slight wear on edges but are still perfectly playable. Train pieces are all present and in good condition. Box has visible wear and a small tear on one corner (shown in photos). Game board is in good shape with no creases. Everything is complete and functional. Priced accordingly for the condition.',
    bggRating: 7.5,
    ageRecommendation: '8+',
    complexity: 1.9,
    description: 'Ticket to Ride Europe takes you on a new train adventure across Europe. From Edinburgh to Constantinople and from Lisbon to Moscow, you\'ll visit great cities of turn-of-the-century Europe. Like the original Ticket to Ride, the game remains elegantly simple, and easy to learn.',
    completeness: [
      { item: 'Game board', present: true },
      { item: '225 colored train cars', present: true },
      { item: '158 train cards', present: true },
      { item: '46 destination ticket cards', present: true },
      { item: '5 wooden scoring markers', present: true },
      { item: '1 European Express bonus card', present: true },
      { item: '15 stations', present: true },
      { item: 'Rulebook', present: true },
    ],
    reviews: [],
    shippingOptions: {
      standard: 5,
      localPickup: false,
    },
  },
  // Simplified remaining games for browse page
  {
    id: '4',
    bggId: 68448,
    bggVersionId: 195567,
    title: '7 Wonders',
    versionName: 'Lithuanian edition',
    publisher: 'Brain Games',
    language: 'Lithuanian',
    languageCode: 'lt',
    yearPublished: 2018,
    productCode: 'BG-7W-LT',
    designer: 'Antoine Bauza',
    year: 2010,
    condition: 'veryGood',
    price: 35,
    shipping: 4,
    location: 'Riga',
    playerCount: '2-7',
    playingTime: '30',
    category: 'strategy',
    seller: {
      username: 'ancient_gamer',
      rating: 4.6,
      verified: true,
    },
    imageUrl: '/images/7-wonders.jpg',
  },
  {
    id: '5',
    bggId: 30549,
    bggVersionId: 234588,
    title: 'Pandemic',
    versionName: 'Latvian edition',
    publisher: 'Brain Games',
    language: 'Latvian',
    languageCode: 'lv',
    yearPublished: 2020,
    productCode: 'BG-PAN-LV',
    designer: 'Matt Leacock',
    year: 2008,
    condition: 'good',
    price: 25,
    shipping: 5,
    location: 'Vilnius',
    playerCount: '2-4',
    playingTime: '45',
    category: 'cooperative',
    seller: {
      username: 'coop_player',
      rating: 4.9,
      verified: true,
    },
    imageUrl: '/images/pandemic.jpg',
  },
  {
    id: '6',
    bggId: 230802,
    bggVersionId: 345621,
    title: 'Azul',
    versionName: 'Estonian edition',
    publisher: 'Lauamängud.ee',
    language: 'Estonian',
    languageCode: 'et',
    yearPublished: 2019,
    designer: 'Michael Kiesling',
    year: 2017,
    condition: 'likeNew',
    price: 30,
    shipping: 4,
    location: 'Tartu',
    playerCount: '2-4',
    playingTime: '30-45',
    category: 'family',
    seller: {
      username: 'tile_collector',
      rating: 5.0,
      verified: true,
    },
    imageUrl: '/images/azul.jpg',
  },
  {
    id: '7',
    bggId: 178900,
    bggVersionId: 289456,
    title: 'Codenames',
    versionName: 'Russian edition',
    publisher: 'Hobby World',
    language: 'Russian',
    languageCode: 'ru',
    yearPublished: 2016,
    productCode: 'HW-COD-RU',
    designer: 'Vlaada Chvátil',
    year: 2015,
    condition: 'veryGood',
    price: 18,
    shipping: 3,
    location: 'Riga',
    playerCount: '4-8',
    playingTime: '15',
    category: 'party',
    seller: {
      username: 'party_host',
      rating: 4.8,
      verified: false,
    },
    imageUrl: '/images/codenames.jpg',
  },
  {
    id: '8',
    title: 'Splendor',
    designer: 'Marc André',
    year: 2014,
    condition: 'good',
    price: 22,
    shipping: 4,
    location: 'Vilnius',
    playerCount: '2-4',
    playingTime: '30',
    category: 'strategy',
    seller: {
      username: 'gem_trader',
      rating: 4.7,
      verified: true,
    },
    imageUrl: '/images/splendor.jpg',
  },
  {
    id: '9',
    title: 'Carcassonne',
    designer: 'Klaus-Jürgen Wrede',
    year: 2000,
    condition: 'veryGood',
    price: 24,
    shipping: 4,
    location: 'Tallinn',
    playerCount: '2-5',
    playingTime: '30-45',
    category: 'family',
    seller: {
      username: 'meeple_master',
      rating: 4.9,
      verified: true,
    },
    imageUrl: '/images/carcassonne.jpg',
  },
  {
    id: '10',
    title: 'Dominion',
    designer: 'Donald X. Vaccarino',
    year: 2008,
    condition: 'acceptable',
    price: 20,
    shipping: 5,
    location: 'Riga',
    playerCount: '2-4',
    playingTime: '30',
    category: 'card',
    seller: {
      username: 'deck_builder',
      rating: 4.5,
      verified: false,
    },
    imageUrl: '/images/dominion.jpg',
  },
  {
    id: '11',
    title: 'Terraforming Mars',
    designer: 'Jacob Fryxelius',
    year: 2016,
    condition: 'veryGood',
    price: 55,
    shipping: 6,
    location: 'Vilnius',
    playerCount: '1-5',
    playingTime: '120',
    category: 'strategy',
    seller: {
      username: 'mars_colonist',
      rating: 4.9,
      verified: true,
    },
    imageUrl: '/images/terraforming-mars.jpg',
  },
  {
    id: '12',
    title: 'Dixit',
    designer: 'Jean-Louis Roubira',
    year: 2008,
    condition: 'likeNew',
    price: 28,
    shipping: 4,
    location: 'Tartu',
    playerCount: '3-6',
    playingTime: '30',
    category: 'party',
    seller: {
      username: 'storyteller',
      rating: 5.0,
      verified: true,
    },
    imageUrl: '/images/dixit.jpg',
  },
];

export const locations = ['Riga', 'Vilnius', 'Tallinn', 'Tartu', 'Kaunas', 'Pärnu'];
export const categories = [
  { value: 'strategy', label: 'Strategy' },
  { value: 'family', label: 'Family' },
  { value: 'party', label: 'Party Games' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'card', label: 'Card Games' },
];

export const conditionConfig = {
  likeNew: {
    label: 'Like New',
    variant: 'success' as const,
    description: 'Appears unplayed or played once. Components pristine.',
  },
  veryGood: {
    label: 'Very Good',
    variant: 'default' as const,
    description: 'Minimal wear. All components present and in great shape.',
  },
  good: {
    label: 'Good',
    variant: 'warning' as const,
    description: 'Shows play wear but fully functional. All components present.',
  },
  acceptable: {
    label: 'Acceptable',
    variant: 'warning' as const,
    description: 'Significant wear but playable. May have minor damage.',
  },
  forParts: {
    label: 'For Parts',
    variant: 'error' as const,
    description: 'Incomplete or damaged. Sold as-is for parts/crafts.',
  },
};
