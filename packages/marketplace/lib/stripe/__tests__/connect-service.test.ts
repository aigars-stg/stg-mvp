import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mocks to ensure they are available for module mocks
const mocks = vi.hoisted(() => {
    return {
        stripeAccountsCreate: vi.fn(),
        stripeAccountLinksCreate: vi.fn(),
        stripeAccountsRetrieve: vi.fn(),
        stripeAccountsUpdate: vi.fn(),
        supabaseUpsert: vi.fn(),
        supabaseUpdate: vi.fn(),
        supabaseEq: vi.fn(),
        supabaseFrom: vi.fn(),
    };
});

// Mock Stripe
vi.mock('stripe', () => {
    return {
        default: class MockStripe {
            accounts = {
                create: mocks.stripeAccountsCreate,
                retrieve: mocks.stripeAccountsRetrieve,
                update: mocks.stripeAccountsUpdate,
            };
            accountLinks = {
                create: mocks.stripeAccountLinksCreate,
            };
        },
    };
});

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: mocks.supabaseFrom,
    }),
}));

import { createConnectAccount, syncConnectAccountStatus } from '../connect-service';

describe('Stripe Connect Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Setup Supabase mock chain
        mocks.supabaseFrom.mockReturnValue({
            upsert: mocks.supabaseUpsert,
            update: mocks.supabaseUpdate,
        });
        mocks.supabaseUpsert.mockResolvedValue({ error: null });
        mocks.supabaseUpdate.mockReturnValue({ eq: mocks.supabaseEq });
        mocks.supabaseEq.mockResolvedValue({ error: null });
    });

    describe('createConnectAccount', () => {
        it('should create a Stripe account and onboarding link', async () => {
            // Setup Stripe mocks
            mocks.stripeAccountsCreate.mockResolvedValue({
                id: 'acct_test123',
                type: 'express',
            });
            mocks.stripeAccountLinksCreate.mockResolvedValue({
                url: 'https://connect.stripe.com/setup/s/test',
            });

            const result = await createConnectAccount('user_123', 'test@example.com');

            expect(mocks.stripeAccountsCreate).toHaveBeenCalledWith(expect.objectContaining({
                type: 'express',
                email: 'test@example.com',
                country: 'LT',
            }));

            expect(mocks.supabaseFrom).toHaveBeenCalledWith('seller_profiles');
            expect(mocks.supabaseUpsert).toHaveBeenCalledWith(expect.objectContaining({
                user_id: 'user_123',
                stripe_connect_account_id: 'acct_test123',
                seller_status: 'onboarding',
            }), expect.anything());

            expect(result).toEqual({
                accountId: 'acct_test123',
                onboardingUrl: 'https://connect.stripe.com/setup/s/test',
            });
        });

        it('should handle prefill data correctly', async () => {
            mocks.stripeAccountsCreate.mockResolvedValue({ id: 'acct_test123' });
            mocks.stripeAccountLinksCreate.mockResolvedValue({ url: 'http://url' });

            await createConnectAccount('user_123', 'test@example.com', 'LT', {
                fullName: 'John Doe',
                phone: '+37060000000'
            });

            expect(mocks.stripeAccountsCreate).toHaveBeenCalledWith(expect.objectContaining({
                individual: expect.objectContaining({
                    first_name: 'John',
                    last_name: 'Doe',
                    phone: '+37060000000'
                })
            }));
        });
    });

    describe('syncConnectAccountStatus', () => {
        it('should update seller profile with Stripe status', async () => {
            mocks.stripeAccountsRetrieve.mockResolvedValue({
                details_submitted: true,
                charges_enabled: true,
                payouts_enabled: true,
            });

            const status = await syncConnectAccountStatus('user_123', 'acct_test123');

            expect(status).toEqual({
                onboardingComplete: true,
                chargesEnabled: true,
                payoutsEnabled: true,
                detailsSubmitted: true,
            });

            expect(mocks.supabaseUpdate).toHaveBeenCalledWith(expect.objectContaining({
                stripe_connect_onboarding_completed: true,
                stripe_connect_payouts_enabled: true,
                seller_status: 'active',
            }));
        });

        it('should not set seller_status to active if payouts are disabled', async () => {
            mocks.stripeAccountsRetrieve.mockResolvedValue({
                details_submitted: true,
                charges_enabled: true,
                payouts_enabled: false,
            });

            await syncConnectAccountStatus('user_123', 'acct_test123');

            // Should NOT contain seller_status: active
            expect(mocks.supabaseUpdate).toHaveBeenCalledWith(expect.not.objectContaining({
                seller_status: 'active',
            }));
        });
    });
});
