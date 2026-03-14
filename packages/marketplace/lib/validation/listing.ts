import { z } from 'zod';

/**
 * Listing validation schemas — shared between client and server
 */

export const listingConditions = ['likeNew', 'veryGood', 'good', 'acceptable'] as const;
export type ListingCondition = (typeof listingConditions)[number];

export const pricingFormats = ['fixed_price', 'auction'] as const;
export type PricingFormat = (typeof pricingFormats)[number];

export const auctionDurations = [1, 3, 5, 7] as const;
export const auctionEndStrategies = ['fixed', 'cooldown'] as const;
export const auctionCooldownOptions = [24, 48] as const;

const MAX_TEXT_LENGTH = 500;
const MAX_PRICE = 500;
const MAX_PHOTOS = 8;

/** Schema for the selectedGame object sent from the client */
const selectedGameSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  yearPublished: z.number().int().nullable().optional(),
});

/** Schema for the selectedVersion object sent from the client */
const selectedVersionSchema = z.object({
  id: z.union([z.number(), z.string()]).optional(),
  name: z.string().optional(),
  publisher: z.string().optional(),
  publishers: z.array(z.string()).optional(),
  language: z.string().optional(),
  languages: z.array(z.string()).optional(),
  yearPublished: z.number().int().nullable().optional(),
}).passthrough(); // Allow additional BGG version fields

/** Schema for creating a new listing (POST /api/listings) */
export const createListingSchema = z.object({
  selectedGame: selectedGameSchema,
  selectedVersion: selectedVersionSchema,
  photoUrls: z.array(z.string().url()).max(MAX_PHOTOS).default([]),
  condition: z.enum(listingConditions),
  conditionNotes: z.string().max(MAX_TEXT_LENGTH).nullable().optional(),
  allComponentsPresent: z.boolean().default(true),
  missingComponents: z.string().max(MAX_TEXT_LENGTH).nullable().optional(),
  price: z.string().refine(
    (val) => { const n = parseFloat(val); return !isNaN(n) && n > 0 && n <= MAX_PRICE; },
    { message: `Price must be between €0.01 and €${MAX_PRICE}` }
  ),
  pricingFormat: z.enum(pricingFormats).default('fixed_price'),
  includedExpansions: z.array(z.object({}).passthrough()).default([]),

  // Auction-specific
  auctionDurationDays: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]).optional(),
  auctionEndStrategy: z.enum(auctionEndStrategies).optional(),
  auctionCooldownHours: z.union([z.literal(24), z.literal(48)]).optional(),

  // Optional source
  sourceWantedListingId: z.string().uuid().optional(),

  // Achievement tracking
  flowStartTime: z.union([z.string(), z.number()]).optional(),
}).refine(
  (data) => {
    if (data.pricingFormat === 'auction') {
      return data.auctionDurationDays !== undefined;
    }
    return true;
  },
  { message: 'Auction duration is required for auction listings' }
).refine(
  (data) => {
    if (data.auctionEndStrategy === 'cooldown') {
      return data.auctionCooldownHours !== undefined;
    }
    return true;
  },
  { message: 'Cooldown hours required when using cooldown end strategy' }
);

/** Schema for updating a listing (PATCH /api/listings/[id]) */
export const updateListingSchema = z.object({
  condition: z.enum(listingConditions).optional(),
  condition_notes: z.string().max(MAX_TEXT_LENGTH).nullable().optional(),
  all_components_present: z.boolean().optional(),
  missing_components: z.string().max(MAX_TEXT_LENGTH).nullable().optional(),
  price: z.union([z.string(), z.number()]).optional().refine(
    (val) => {
      if (val === undefined) return true;
      const n = typeof val === 'string' ? parseFloat(val) : val;
      return !isNaN(n) && n > 0 && n <= MAX_PRICE;
    },
    { message: `Price must be between €0.01 and €${MAX_PRICE}` }
  ),
  accept_offers: z.boolean().optional(),
  minimum_offer: z.union([z.string(), z.number()]).nullable().optional(),
  photo_urls: z.array(z.string()).max(MAX_PHOTOS).optional(),
  shipping_parcel_locker: z.boolean().optional(),
  shipping_notes: z.string().max(MAX_TEXT_LENGTH).nullable().optional(),
  status: z.enum(['active', 'removed']).optional(),
  why_selling: z.string().max(MAX_TEXT_LENGTH).nullable().optional(),
  pricing_format: z.enum(pricingFormats).optional(),
  auction_duration_days: z.union([z.literal(1), z.literal(3), z.literal(5), z.literal(7)]).nullable().optional(),
  auction_end_strategy: z.enum(auctionEndStrategies).nullable().optional(),
  auction_cooldown_hours: z.union([z.literal(24), z.literal(48)]).nullable().optional(),
}).strict();

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
