import { z } from 'zod';

/**
 * Checkout request validation schemas
 */

export const checkoutSessionSchema = z.object({
  basketId: z.string().uuid(),
  shippingMethod: z.literal('t2t'),

  // T2T shipping fields
  destinationCountry: z.string().length(2),
  destinationTerminalId: z.string().min(1),
  destinationTerminalName: z.string().min(1),
  destinationTerminalAddress: z.string().optional(),
  receiverName: z.string().min(1),
  receiverPhone: z.string().min(1),
  receiverEmail: z.string().email(),

  // Wallet usage
  useWallet: z.boolean().default(true),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
