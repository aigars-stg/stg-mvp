'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Button, Card } from '@second-turn/design-system';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { GameSearch } from '@/components/sell/GameSearch';
import { MinimumConditionSelector } from '@/components/wanted/MinimumConditionSelector';
import { WantedListingPreview } from '@/components/wanted/WantedListingPreview';
import { CollapsibleSection } from '@/components/sell/CollapsibleSection';
import type { BGGGame } from '@/lib/bgg-types';
import type { ListingCondition } from '@/lib/types/listing';
import { Dices, Euro, ClipboardCheck, MapPin, Lightbulb, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { mapAuthError } from '@/lib/auth/errors';

export default function CreateWantedListingPage() {
  const router = useRouter();
  const { user, signIn, signInWithOAuth } = useAuth();

  // Form state
  const [selectedGame, setSelectedGame] = useState<BGGGame | null>(null);
  const [maxPrice, setMaxPrice] = useState('');
  const [minimumCondition, setMinimumCondition] = useState<ListingCondition | null>(null);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Check if site is in "coming soon" mode
  const isComingSoon = process.env.NEXT_PUBLIC_COMING_SOON === 'true';

  // Section expansion states
  const [expandedSections, setExpandedSections] = useState({
    game: true,      // Always start with game section open
    budget: false,
    condition: false,
    location: false,
  });

  // Helper to convert minimum condition to acceptable conditions array
  const getAcceptableConditions = (minimum: ListingCondition): ListingCondition[] => {
    const conditionHierarchy: ListingCondition[] = ['likeNew', 'veryGood', 'good', 'acceptable'];
    const minIndex = conditionHierarchy.indexOf(minimum);
    return conditionHierarchy.slice(0, minIndex + 1);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Section completion checks
  const isGameSectionComplete = !!selectedGame;
  const isBudgetSectionComplete = !!maxPrice && parseFloat(maxPrice) > 0;
  const isConditionSectionComplete = !!minimumCondition;
  const isLocationSectionComplete = true; // Optional section, always "complete"

  const canPublish = (): boolean => {
    return isGameSectionComplete && isBudgetSectionComplete && isConditionSectionComplete;
  };

  // Progressive disclosure: Auto-expand next incomplete section
  useEffect(() => {
    const gameComplete = isGameSectionComplete;
    const budgetComplete = isBudgetSectionComplete;
    const conditionComplete = isConditionSectionComplete;

    setExpandedSections((prev) => ({
      ...prev,
      game: true, // Always keep game section visible
      budget: gameComplete || prev.budget,
      condition: (gameComplete && budgetComplete) || prev.condition,
      location: (gameComplete && budgetComplete && conditionComplete) || prev.location,
    }));
  }, [
    isGameSectionComplete,
    isBudgetSectionComplete,
    isConditionSectionComplete,
  ]);

  const handleGameSelect = useCallback(async (game: BGGGame | null) => {
    setSelectedGame(game);
  }, []);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);

      if (signInError) {
        setAuthError(mapAuthError(signInError));
        setAuthLoading(false);
        return;
      }

      // User will now be authenticated, form will show
      setAuthLoading(false);
    } catch (err: any) {
      setAuthError(mapAuthError(err));
      setAuthLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    setAuthError('');
    setAuthLoading(true);

    try {
      const { error: oauthError } = await signInWithOAuth(provider);

      if (oauthError) {
        setAuthError(mapAuthError(oauthError));
        setAuthLoading(false);
        return;
      }

      // OAuth will redirect to provider
    } catch (err: any) {
      setAuthError(mapAuthError(err));
      setAuthLoading(false);
    }
  };

  const handlePublish = async () => {
    // Final validation
    if (!selectedGame || !maxPrice || parseFloat(maxPrice) <= 0 || !minimumCondition) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const response = await fetch('/api/wanted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedGame: {
            id: selectedGame.id,
            name: selectedGame.name,
            yearPublished: selectedGame.yearPublished,
          },
          minPrice: null,
          maxPrice: parseFloat(maxPrice),
          acceptableConditions: getAcceptableConditions(minimumCondition),
          locationPreferences: location || null,
          notes: notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create wanted listing');
      }

      // Success! Redirect to my listings page with wanted tab active
      router.push('/my-listings?tab=wanted');
    } catch (err: any) {
      console.error('Error creating wanted listing:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Show signin form if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-polar-night mb-2">
              Sign in to post a wanted game
            </h1>
            <p className="text-text-secondary">
              Create an account or sign in to continue
            </p>
          </div>

          {/* Sign In Form */}
          <Card padding="lg">
            {/* OAuth Buttons - Hide in coming soon mode */}
            {!isComingSoon && (
              <div className="space-y-3 mb-6">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  fullWidth
                  onClick={() => handleOAuthSignIn('google')}
                  disabled={authLoading}
                  className="flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-snow-white text-text-secondary">or continue with email</span>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSignIn} className="space-y-5">
              {/* Error Message */}
              {authError && (
                <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg">
                  <p className="text-sm text-aurora-red">{authError}</p>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-polar-night mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                    placeholder="you@example.com"
                    required
                    disabled={authLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-polar-night">
                    Password
                  </label>
                  <Link
                    href="/auth/forgot-password"
                    className="text-sm text-frost-ice hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-text-muted" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-frost-ice/30 focus:border-frost-ice text-polar-night bg-snow-white"
                    placeholder="Enter your password"
                    required
                    disabled={authLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-text-muted hover:text-polar-night" />
                    ) : (
                      <Eye className="h-5 w-5 text-text-muted hover:text-polar-night" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={authLoading}
              >
                {authLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Card>

          {/* Sign Up Link - Hide in coming soon mode */}
          {!isComingSoon && (
            <div className="mt-6 text-center">
              <p className="text-sm text-text-secondary">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="text-frost-ice hover:underline font-medium">
                  Create account
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-text">
          Post a Wanted Game
        </h1>
        <p className="text-text-secondary mt-2">
          Let sellers know what game you're looking for and they can offer to sell it to you
        </p>
      </div>

      {/* Two-Column Layout: Form + Preview */}
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Left Column: Form Sections (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Section 1: Game Selection */}
          <CollapsibleSection
            title="Find Your Game"
            icon={<Dices className="w-6 h-6 text-aurora-orange" />}
            isComplete={isGameSectionComplete}
            isExpanded={expandedSections.game}
            onToggle={() => toggleSection('game')}
            required
            subtitle={
              selectedGame
                ? selectedGame.name
                : "Start typing to search thousands of board games"
            }
          >
            <div className="[&_input:focus]:!ring-aurora-orange/30 [&_input:focus]:!border-aurora-orange">
              <GameSearch
                selectedGame={selectedGame}
                onSelect={handleGameSelect}
                hideChangeVersionButton={true}
              />
            </div>
          </CollapsibleSection>

          {/* Section 2: Budget */}
          <CollapsibleSection
            title="Your Budget"
            icon={<Euro className="w-6 h-6 text-aurora-orange" />}
            isComplete={isBudgetSectionComplete}
            isExpanded={expandedSections.budget}
            onToggle={() => toggleSection('budget')}
            required
            subtitle="Set the maximum amount you're willing to pay"
          >
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Maximum Price (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="50.00"
                className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aurora-orange/30 focus:border-aurora-orange text-text bg-surface-0"
                required
              />
              <div className="flex items-start gap-2 mt-2 text-xs text-text-secondary">
                <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-aurora-orange" />
                <p>Sellers can offer games at any price, but setting a clear budget helps them understand your expectations</p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Section 3: Minimum Condition */}
          <CollapsibleSection
            title="Minimum Condition"
            icon={<ClipboardCheck className="w-6 h-6 text-aurora-orange" />}
            isComplete={isConditionSectionComplete}
            isExpanded={expandedSections.condition}
            onToggle={() => toggleSection('condition')}
            required
            subtitle="What's the minimum condition you'll accept?"
          >
            <MinimumConditionSelector
              value={minimumCondition}
              onChange={setMinimumCondition}
            />
          </CollapsibleSection>

          {/* Section 4: Location & Details */}
          <CollapsibleSection
            title="Location & Details"
            icon={<MapPin className="w-6 h-6 text-aurora-orange" />}
            isExpanded={expandedSections.location}
            onToggle={() => toggleSection('location')}
            subtitle="Help sellers understand your location and preferences (optional)"
          >
            <div className="space-y-6">
              {/* Location */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Your Location (Optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Riga, Latvia"
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aurora-orange/30 focus:border-aurora-orange text-text bg-surface-0"
                />
                <div className="flex items-start gap-2 mt-1 text-xs text-text-secondary">
                  <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-aurora-orange" />
                  <p>Helps sellers estimate shipping costs and timing</p>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-text mb-2">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-aurora-orange/30 focus:border-aurora-orange text-text bg-surface-0 resize-none"
                  rows={4}
                  placeholder="Any additional details about what you're looking for..."
                />
                <p className="text-xs text-text-secondary mt-1">
                  Examples: language preference, specific edition, local pickup preferred, etc.
                </p>
              </div>
            </div>
          </CollapsibleSection>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg text-aurora-red text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 space-y-3 sm:space-y-0">
            {/* Mobile: Sticky bottom bar */}
            <div className="sm:hidden flex flex-col gap-3 sticky bottom-0 bg-bg-elevated border-t border-border-subtle shadow-lg -mx-4 px-4 py-4">
              <Button
                variant="primary"
                onClick={handlePublish}
                disabled={!canPublish() || submitting}
                size="lg"
                fullWidth
              >
                {submitting ? 'Posting...' : 'Post Wanted Game'}
              </Button>
            </div>

            {/* Desktop: Regular button row */}
            <div className="hidden sm:flex sm:items-center sm:justify-end sm:gap-4">
              <Button
                variant="primary"
                onClick={handlePublish}
                disabled={!canPublish() || submitting}
                size="lg"
              >
                {submitting ? 'Posting...' : 'Post Wanted Game'}
              </Button>
            </div>
          </div>
        </div>
        {/* End Left Column */}

        {/* Right Column: Live Preview (5 cols on desktop, hidden on mobile/tablet) */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="sticky top-8">
            {/* Live Preview with border */}
            <div className="border-2 border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-bg-elevated border-b-2 border-border">
                <span className="text-sm font-semibold text-text">Live Preview</span>
              </div>
              <div className="p-4">
                <WantedListingPreview
                  selectedGame={selectedGame}
                  maxPrice={maxPrice}
                  minimumCondition={minimumCondition}
                  location={location}
                  notes={notes}
                />
              </div>
            </div>
          </div>
        </div>
        {/* End Right Column */}
      </div>
      {/* End Two-Column Grid */}
    </div>
  );
}
