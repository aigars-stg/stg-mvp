'use client';

import Link from 'next/link';
import { Button, Card } from '@second-turn/design-system';
import { Search, MessageSquare, Shield, Truck, Check } from 'lucide-react';

/**
 * Platform features card - Educational content about how the marketplace works.
 *
 * Brand Voice:
 * - Title: "How Sit works"
 * - Clear, friendly explanations of key features
 */
export function PlatformFeaturesCard() {
  const features = [
    {
      icon: Search,
      text: 'Browse games from sellers in the Baltics',
    },
    {
      icon: MessageSquare,
      text: 'Make offers and negotiate with sellers',
    },
    {
      icon: Shield,
      text: 'Secure payments protect both buyer and seller',
    },
    {
      icon: Truck,
      text: 'Convenient shipping via parcel terminals',
    },
  ];

  return (
    <Card padding="lg" className="bg-frost-ice/5 border-frost-ice/20">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-polar-night mb-2">
          How it works
        </h2>
        <p className="text-sm text-text-secondary">
          Your trusted marketplace for pre-loved board games
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-snow-white rounded-lg"
          >
            <div className="p-2 bg-frost-ice/10 rounded-lg flex-shrink-0">
              <feature.icon className="w-4 h-4 text-frost-ice" />
            </div>
            <p className="text-sm text-text-secondary">{feature.text}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/browse">
          <Button variant="primary" size="md">
            Browse games
          </Button>
        </Link>
        <Link href="/how-it-works">
          <Button variant="secondary" size="md">
            Learn more
          </Button>
        </Link>
      </div>
    </Card>
  );
}
