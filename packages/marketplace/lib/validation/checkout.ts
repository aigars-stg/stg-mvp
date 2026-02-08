import { z } from 'zod';

/**
 * Checkout request validation schemas
 */

export const checkoutSessionSchema = z.object({
  basketId: z.string().uuid(),
  shippingMethod: z.enum(['t2t', 'local_pickup']),

  // T2T shipping fields (required when shippingMethod === 't2t')
  destinationCountry: z.string().length(2).optional(),
  destinationTerminalId: z.string().optional(),
  destinationTerminalName: z.string().optional(),
  destinationTerminalAddress: z.string().optional(),
  receiverName: z.string().min(1).optional(),
  receiverPhone: z.string().min(1).optional(),
  receiverEmail: z.string().email().optional(),

  // Local pickup fields (required when shippingMethod === 'local_pickup')
  pickupCity: z.string().optional(),
  pickupNotes: z.string().optional(),

  // Wallet usage
  useWallet: z.boolean().default(true),
}).refine(
  (data) => {
    if (data.shippingMethod === 't2t') {
      return !!(
        data.destinationCountry &&
        data.destinationTerminalId &&
        data.destinationTerminalName &&
        data.receiverName &&
        data.receiverPhone &&
        data.receiverEmail
      );
    }
    return true;
  },
  { message: 'T2T shipping requires destination terminal and receiver contact info' }
).refine(
  (data) => {
    if (data.shippingMethod === 'local_pickup') {
      return !!data.pickupCity;
    }
    return true;
  },
  { message: 'Local pickup requires pickup city' }
);

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
