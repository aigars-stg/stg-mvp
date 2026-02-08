import { z } from 'zod';
import { isValidIBAN } from 'ibantools';

/**
 * IBAN validation with ibantools library
 */
const ibanSchema = z.string().min(1, 'IBAN is required').transform((val) => {
  // Remove spaces and convert to uppercase
  return val.replace(/\s/g, '').toUpperCase();
}).refine(
  (val) => isValidIBAN(val),
  { message: 'Invalid IBAN' }
);

/**
 * Withdrawal request validation
 */
export const withdrawalRequestSchema = z.object({
  amountCents: z.number().int().positive('Amount must be positive'),
  iban: ibanSchema,
  accountHolderName: z.string().min(2, 'Account holder name is required'),
});

export type WithdrawalRequestInput = z.infer<typeof withdrawalRequestSchema>;

/**
 * Seller IBAN update validation
 */
export const sellerIbanSchema = z.object({
  iban: ibanSchema,
  accountHolderName: z.string().min(2, 'Account holder name is required'),
});

export type SellerIbanInput = z.infer<typeof sellerIbanSchema>;
