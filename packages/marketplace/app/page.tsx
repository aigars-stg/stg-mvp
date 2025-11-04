import Link from 'next/link';
import { Button } from '@second-turn/design-system';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-frost-ice/10 to-transparent">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-polar-night mb-6">
            Every Game Deserves a<br />Second Turn
          </h1>
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            The Baltic marketplace for pre-loved board games. Buy quality games at great prices,
            sell games you've finished playing, and give every box its second adventure.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/browse">
              <Button variant="primary" size="lg">
                Browse Games
              </Button>
            </Link>
            <Link href="/sell">
              <Button variant="secondary" size="lg">
                Sell a Game
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-frost-ice/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🛡️</span>
            </div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              Buyer Protection
            </h3>
            <p className="text-text-secondary">
              Your payment is held securely until you confirm the game arrived in described condition.
              You're protected every step of the way.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-frost-ice/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✓</span>
            </div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              Verified Sellers
            </h3>
            <p className="text-text-secondary">
              Browse games from verified sellers with ratings and reviews.
              Know exactly who you're buying from.
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-frost-ice/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📦</span>
            </div>
            <h3 className="text-xl font-semibold text-polar-night mb-2">
              Transparent Condition
            </h3>
            <p className="text-text-secondary">
              Every listing includes detailed condition grades, photos, and completeness checklists.
              No surprises when your game arrives.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-bg-secondary py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-polar-night text-center mb-12">
            How It Works
          </h2>

          <div className="grid md:grid-cols-2 gap-12">
            {/* For Buyers */}
            <div>
              <h3 className="text-2xl font-semibold text-polar-night mb-6">For Buyers</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-frost-ice text-snow-white rounded-full flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-polar-night mb-1">Browse & Search</h4>
                    <p className="text-text-secondary">
                      Find games by title, category, condition, or location. Filter to your exact preferences.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-frost-ice text-snow-white rounded-full flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-polar-night mb-1">Review Details</h4>
                    <p className="text-text-secondary">
                      Check condition photos, completeness info, and seller ratings. Ask questions if needed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-frost-ice text-snow-white rounded-full flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-polar-night mb-1">Purchase Securely</h4>
                    <p className="text-text-secondary">
                      Pay through our secure system. Your payment is held until you confirm delivery.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-frost-ice text-snow-white rounded-full flex items-center justify-center font-semibold">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-polar-night mb-1">Enjoy Your Game</h4>
                    <p className="text-text-secondary">
                      Receive your game, verify condition, and start playing. Leave a review to help others.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* For Sellers */}
            <div>
              <h3 className="text-2xl font-semibold text-polar-night mb-6">For Sellers</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-aurora-orange text-snow-white rounded-full flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-polar-night mb-1">List Your Game</h4>
                    <p className="text-text-secondary">
                      Add photos, describe condition honestly, and set your price. Takes just 5 minutes.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-aurora-orange text-snow-white rounded-full flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-polar-night mb-1">Connect with Buyers</h4>
                    <p className="text-text-secondary">
                      Answer questions, negotiate if you're open to offers, and arrange shipping or pickup.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-aurora-orange text-snow-white rounded-full flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-polar-night mb-1">Ship Safely</h4>
                    <p className="text-text-secondary">
                      Pack carefully and ship within 2 business days. Payment is released after buyer confirmation.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-aurora-orange text-snow-white rounded-full flex items-center justify-center font-semibold">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-polar-night mb-1">Get Paid</h4>
                    <p className="text-text-secondary">
                      Receive payment securely. List more games or use the funds to buy your next favorite.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold text-polar-night mb-4">
          Ready to Give a Game Its Second Turn?
        </h2>
        <p className="text-lg text-text-secondary mb-8">
          Join the Baltic board game community. Buy, sell, and discover amazing games.
        </p>
        <Link href="/browse">
          <Button variant="primary" size="lg">
            Start Browsing Games
          </Button>
        </Link>
      </div>
    </div>
  );
}
