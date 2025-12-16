/**
 * Stripe server-side client
 * WARNING: This file should only be imported in server-side code (API routes, server components)
 * For client-safe utilities, import from './stripe-utils' instead
 */

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

/**
 * Stripe client instance (SERVER-ONLY)
 * API version: 2025-11-17.clover (latest stable)
 */
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
});

// Re-export utilities for convenience in server-side code
export * from './stripe-utils';
