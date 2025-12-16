'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@second-turn/design-system';
import {
  CheckCircle2,
  ArrowRight,
  Package,
  DollarSign,
  TrendingUp,
  Heart,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';

export default function SellerOnboardingCompletePage() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect to sign in if not authenticated
    if (!user) {
      router.push('/auth/signin?redirect=/seller/onboard/complete');
    }
  }, [user, router]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-aurora-green rounded-full mb-6">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-polar-night mb-4">
            You're All Set!
          </h1>
          <p className="text-lg text-text-secondary">
            Welcome to Second Turn Games. You can now start listing and selling your board games.
          </p>
        </div>

        {/* What You Can Do Now */}
        <div className="bg-snow-white border border-border rounded-lg p-8 mb-8">
          <h2 className="text-xl font-semibold text-polar-night mb-6">
            What You Can Do Now
          </h2>

          <div className="space-y-6">
            {/* Create Listings */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-frost-ice/10 rounded-lg flex-shrink-0">
                <Package className="w-6 h-6 text-frost-ice" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-polar-night mb-2">
                  Create Your First Listing
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  List a board game from your collection. Set your price, upload photos, and describe the condition. Takes less than 3 minutes.
                </p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => router.push('/sell')}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Create Listing
                </Button>
              </div>
            </div>

            {/* Browse Marketplace */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-aurora-green/10 rounded-lg flex-shrink-0">
                <Heart className="w-6 h-6 text-aurora-green" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-polar-night mb-2">
                  Browse & Buy Games
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  While you wait for sales, explore games from other sellers. Build your collection!
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => router.push('/browse')}
                >
                  Browse Marketplace
                </Button>
              </div>
            </div>

            {/* View Dashboard */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-frost-ice/10 rounded-lg flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-frost-ice" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-polar-night mb-2">
                  Manage Your Sales
                </h3>
                <p className="text-sm text-text-secondary mb-3">
                  View your active listings, pending orders, and payout history in your seller dashboard.
                </p>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => router.push('/seller/orders')}
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* How Selling Works */}
        <div className="bg-snow-white border border-border rounded-lg p-8 mb-8">
          <h2 className="text-xl font-semibold text-polar-night mb-6">
            How Selling Works
          </h2>

          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-frost-ice text-white rounded-full font-semibold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-polar-night mb-1">Someone Buys Your Game</h4>
                <p className="text-sm text-text-secondary">
                  You'll receive an email notification with shipping details and a pre-paid Unisend label.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-frost-ice text-white rounded-full font-semibold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold text-polar-night mb-1">Package & Ship</h4>
                <p className="text-sm text-text-secondary">
                  Pack the game securely and drop it off at any Unisend parcel terminal within 2 business days.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-frost-ice text-white rounded-full font-semibold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-polar-night mb-1">Buyer Receives Game</h4>
                <p className="text-sm text-text-secondary">
                  The buyer picks up the game from their selected parcel terminal. Tracking updates automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 bg-aurora-green text-white rounded-full font-semibold flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="font-semibold text-polar-night mb-1">Get Paid</h4>
                <p className="text-sm text-text-secondary">
                  Funds are transferred to your bank account within 2-7 business days. You keep 100% of the listing price!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tips for Success */}
        <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-polar-night mb-4">
            Tips for Successful Selling
          </h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Take clear photos:</strong> Show the actual game, including any wear or damage</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Be honest about condition:</strong> Accurate descriptions prevent disputes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Price competitively:</strong> Check similar listings to set fair prices</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Ship promptly:</strong> Fast shipping leads to better reviews</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Package securely:</strong> Protect games from damage during transit</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Respond to messages:</strong> Quick communication builds trust</span>
            </li>
          </ul>
        </div>

        {/* Payout Information */}
        <div className="bg-snow-white border border-border rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-aurora-green/10 rounded-lg flex-shrink-0">
              <DollarSign className="w-6 h-6 text-aurora-green" />
            </div>
            <div>
              <h3 className="font-semibold text-polar-night mb-2">
                About Payouts
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                Your payouts are managed by Stripe Connect and deposited directly to your bank account.
              </p>
              <ul className="text-sm text-text-secondary space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-aurora-green flex-shrink-0" />
                  <span><strong>Zero fees</strong> - Keep 100% of your listing price</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-aurora-green flex-shrink-0" />
                  <span><strong>Fast transfers</strong> - Typically 2-7 business days</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-aurora-green flex-shrink-0" />
                  <span><strong>Track in dashboard</strong> - View your balance and transaction history</span>
                </li>
              </ul>
              <Link
                href="/seller/settings/payouts"
                className="text-sm text-frost-ice hover:underline font-medium"
              >
                View Payout Settings →
              </Link>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="text-center">
          <p className="text-sm text-text-secondary mb-2">
            Questions or need help?
          </p>
          <a
            href="mailto:sellers@secondturn.games"
            className="text-frost-ice hover:underline font-medium"
          >
            Contact Seller Support
          </a>
        </div>

        {/* Primary CTA */}
        <div className="mt-12 text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => router.push('/sell')}
            rightIcon={<ArrowRight className="w-5 h-5" />}
          >
            Create Your First Listing
          </Button>
          <p className="text-xs text-text-secondary mt-3">
            Ready to sell? List your first game now!
          </p>
        </div>
      </div>
    </div>
  );
}
