'use client';

import { useState } from 'react';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button, Card, Badge, Checkbox, Modal } from '@second-turn/design-system';
import { mockGames } from '../../../../lib/mock-data';
import { conditionConfig } from '../../../../lib/condition-config';
import { getLanguageFlag } from '../../../../lib/bgg-api';
import { NotificationModal } from '@/components/common/NotificationModal';
import { formatDate } from '@/lib/date-utils';

interface GameDetailPageProps {
  params: {
    id: string;
  };
}


export default function GameDetailPage({ params }: GameDetailPageProps) {
  const game = mockGames.find((g) => g.id === params.id);

  if (!game) {
    notFound();
  }

  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [showContactInfoModal, setShowContactInfoModal] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const images = game.images || [game.imageUrl];
  const conditionInfo = conditionConfig[game.condition];

  const handleThumbnailClick = (index: number) => {
    setSelectedImage(index);
  };

  const openLightbox = () => {
    setLightboxOpen(true);
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const _handlePurchase = () => {
    setPurchaseModalOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 sm:mb-6 text-sm">
        <Link href="/browse" className="text-frost-ice hover:underline">
          Browse Games
        </Link>
        <span className="text-text-muted mx-2">/</span>
        <span className="text-text truncate inline-block max-w-[200px] sm:max-w-none align-bottom">{game.title}</span>
      </nav>

      {/* Mobile: Stack everything vertically */}
      {/* Desktop: Two-column layout (60% visual, 40% info) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 sm:gap-8 mb-8 sm:mb-12">
        {/* LEFT COLUMN: Images (60% = 3/5 on desktop) */}
        <div className="md:col-span-3">
          {/* Main Image */}
          <Card className="mb-3 sm:mb-4 overflow-hidden cursor-pointer" onClick={openLightbox}>
            <div className="relative aspect-square bg-bg-elevated">
              <Image
                src={images[selectedImage]}
                alt={`${game.title} - Image ${selectedImage + 1}`}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 40vw"
              />
              <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
                <Badge variant={conditionInfo.variant}>
                  {conditionInfo.label}
                </Badge>
              </div>
              {/* Click to enlarge hint - hide on mobile */}
              <div className="hidden sm:block absolute bottom-4 right-4 bg-polar-night/80 px-3 py-1 rounded text-sm text-snow-storm">
                Click to enlarge
              </div>
              {/* Tap to enlarge hint - show on mobile */}
              <div className="sm:hidden absolute bottom-3 right-3 bg-polar-night/80 px-2 py-1 rounded text-xs text-snow-storm">
                Tap to enlarge
              </div>
            </div>
          </Card>

          {/* Thumbnail Gallery - Horizontal scroll on mobile */}
          {images.length > 1 && (
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="grid grid-flow-col auto-cols-[80px] sm:auto-cols-fr sm:grid-cols-4 gap-2 pb-2">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      selectedImage === index
                        ? 'border-frost-ice'
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    <Image
                      src={img}
                      alt={`${game.title} - Thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Condition Section */}
          {game.detailedCondition && (
            <Card className="mt-4 sm:mt-6">
              <h2 className="text-lg sm:text-xl font-bold text-text mb-2 sm:mb-3">Condition Details</h2>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
                {game.detailedCondition}
              </p>
            </Card>
          )}

          {/* Completeness Checklist */}
          {game.completeness && (
            <Card className="mt-4 sm:mt-6">
              <h2 className="text-lg sm:text-xl font-bold text-text mb-3 sm:mb-4">
                Components Checklist
              </h2>
              <div className="space-y-2 sm:space-y-3">
                {game.completeness.map((item, index) => (
                  <Checkbox
                    key={index}
                    checked={item.present}
                    label={item.item}
                    helperText={item.note}
                    disabled
                    className="cursor-default"
                  />
                ))}
              </div>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-text-muted">
                ✓ All {game.completeness.filter((i) => i.present).length} of{' '}
                {game.completeness.length} components present and accounted for
              </p>
            </Card>
          )}

          {/* Game Description */}
          {game.description && (
            <Card className="mt-4 sm:mt-6">
              <h2 className="text-lg sm:text-xl font-bold text-text mb-2 sm:mb-3">About This Game</h2>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed mb-3 sm:mb-4">
                {game.description}
              </p>
              <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
                <div>
                  <span className="text-text-muted">Players:</span>{' '}
                  <span className="text-text font-medium">{game.playerCount}</span>
                </div>
                <div>
                  <span className="text-text-muted">Playing Time:</span>{' '}
                  <span className="text-text font-medium">{game.playingTime} min</span>
                </div>
                {game.ageRecommendation && (
                  <div>
                    <span className="text-text-muted">Age:</span>{' '}
                    <span className="text-text font-medium">{game.ageRecommendation}</span>
                  </div>
                )}
                {game.complexity && (
                  <div>
                    <span className="text-text-muted">Complexity:</span>{' '}
                    <span className="text-text font-medium">
                      {game.complexity.toFixed(1)}/5
                    </span>
                  </div>
                )}
                {game.bggRating && (
                  <div>
                    <span className="text-text-muted">BGG Rating:</span>{' '}
                    <span className="text-text font-medium">
                      {game.bggRating.toFixed(1)}/10
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* RIGHT COLUMN: Info & Actions (40% = 2/5 on desktop) */}
        <div className="md:col-span-2">
          <Card>
            {/* Title & Designer */}
            <h1 className="text-2xl sm:text-3xl font-bold text-text mb-2">{game.title}</h1>
            <p className="text-sm sm:text-base text-text-secondary mb-1">
              Designed by <span className="font-medium">{game.designer}</span>
            </p>
            <p className="text-text-muted text-sm mb-4 sm:mb-6">Original: {game.year}</p>
          </Card>

          {/* Edition Details Card - PROMINENT */}
          <Card padding="md" className="mt-4 sm:mt-6 bg-snow-stormLight border border-border">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-polar-night">
                Edition Details
              </h2>
              {game.bggVersionId && (
                <a
                  href={`https://boardgamegeek.com/boardgameversion/${game.bggVersionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-frost-ice hover:text-frost-polar
                             transition-colors flex items-center gap-1"
                >
                  View on BGG
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-text-muted mb-1">Publisher</div>
                <div className="font-medium text-polar-night">
                  {game.publisher || 'Not specified'}
                </div>
              </div>

              <div>
                <div className="text-sm text-text-muted mb-1">Edition Year</div>
                <div className="font-medium text-polar-night">
                  {game.yearPublished || game.year}
                </div>
              </div>

              {game.language && (
                <div>
                  <div className="text-sm text-text-muted mb-1">Language</div>
                  <div className="font-medium text-polar-night flex items-center gap-2">
                    <span className="text-xl">{getLanguageFlag(game.language)}</span>
                    {game.language}
                  </div>
                </div>
              )}

              {game.productCode && (
                <div>
                  <div className="text-sm text-text-muted mb-1">Product Code</div>
                  <div className="font-mono text-sm font-medium text-polar-night">
                    {game.productCode}
                  </div>
                </div>
              )}

              {game.versionName && (
                <div className="col-span-2">
                  <div className="text-sm text-text-muted mb-1">Version Name</div>
                  <div className="font-medium text-polar-night">
                    {game.versionName}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="mt-4 sm:mt-6">
            {/* Price */}
            <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border-subtle">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl sm:text-4xl font-bold text-text">
                  €{game.price.toFixed(2)}
                </span>
                <span className="text-sm sm:text-base text-text-secondary">
                  + €{game.shipping.toFixed(2)} shipping
                </span>
              </div>
              <p className="text-sm text-text-muted">
                Total: €{(game.price + game.shipping).toFixed(2)}
              </p>
            </div>

            {/* Shipping Options */}
            {game.shippingOptions && (
              <div className="mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-border-subtle">
                <h3 className="text-sm font-semibold text-text mb-2">Shipping Options</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Standard (5-7 days)</span>
                    <span className="text-text">€{game.shippingOptions.standard.toFixed(2)}</span>
                  </div>
                  {game.shippingOptions.express && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Express (2-3 days)</span>
                      <span className="text-text">€{game.shippingOptions.express.toFixed(2)}</span>
                    </div>
                  )}
                  {game.shippingOptions.localPickup && (
                    <div className="flex items-center gap-2 text-frost-ice">
                      <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span>Local pickup available in {game.location}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Seller Button - Full width on mobile, sticky on mobile */}
            <div className="sticky top-0 sm:static bg-bg-elevated sm:bg-transparent -mx-6 px-6 py-4 sm:mx-0 sm:px-0 sm:py-0 border-t sm:border-t-0 border-border-subtle lg:static z-10">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => setPurchaseModalOpen(true)}
                className="mb-3 sm:mb-4"
              >
                Contact Seller
              </Button>

              <p className="text-xs text-text-muted text-center mb-4 sm:mb-6">
                Arrange safe local pickup or parcel locker shipping
              </p>
            </div>

            {/* Seller Profile */}
            <div className="pt-4 sm:pt-6 border-t border-border-subtle">
              <h3 className="text-base sm:text-lg font-bold text-text mb-3 sm:mb-4">Seller Information</h3>

              <div className="flex items-start gap-3 mb-3 sm:mb-4">
                {/* Seller Avatar */}
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-frost-ice/20 flex items-center justify-center text-frost-ice font-bold text-base sm:text-lg flex-shrink-0">
                  {game.seller.username.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-text truncate">{game.seller.username}</span>
                    {game.seller.verified && (
                      <Badge variant="success" size="sm" className="flex-shrink-0">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-aurora-yellow text-base sm:text-lg">★</span>
                    <span className="font-semibold text-text">{game.seller.rating.toFixed(1)}</span>
                    <span className="text-text-muted text-xs sm:text-sm">
                      ({game.reviews?.length || 0} reviews)
                    </span>
                  </div>

                  {/* Seller Stats */}
                  <div className="text-xs sm:text-sm text-text-secondary space-y-1">
                    {game.seller.memberSince && (
                      <p>Member since {game.seller.memberSince}</p>
                    )}
                    {game.seller.gamesSold && (
                      <p>{game.seller.gamesSold} games sold</p>
                    )}
                    {game.seller.responseTime && (
                      <p className="text-frost-ice">{game.seller.responseTime}</p>
                    )}
                  </div>
                </div>
              </div>

              <Button variant="secondary" size="sm" fullWidth>
                Contact Seller
              </Button>
            </div>
          </Card>

          {/* Seller Reviews */}
          {game.reviews && game.reviews.length > 0 && (
            <Card className="mt-4 sm:mt-6">
              <h3 className="text-base sm:text-lg font-bold text-text mb-3 sm:mb-4">
                Reviews ({game.reviews.length})
              </h3>
              <div className="space-y-3 sm:space-y-4">
                {game.reviews.map((review) => (
                  <div key={review.id} className="pb-3 sm:pb-4 border-b border-border-subtle last:border-0 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm sm:text-base text-text truncate mr-2">{review.reviewer}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-aurora-yellow">★</span>
                        <span className="text-text font-medium text-sm">{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-text-secondary mb-1">{review.comment}</p>
                    <p className="text-xs text-text-muted">
                      Purchased: {review.gamePurchased} • {formatDate(review.date)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Trust Signal: Location */}
          <Card className="mt-4 sm:mt-6 bg-frost-ice/5 border-frost-ice/20">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-frost-ice mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-sm sm:text-base text-text mb-1">Ships from {game.location}</p>
                <p className="text-xs sm:text-sm text-text-secondary">
                  Fast delivery within the Baltics. Support local sellers and reduce environmental impact.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Lightbox Modal */}
      <Modal
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        title={`${game.title} - Image ${selectedImage + 1} of ${images.length}`}
        size="xl"
        className="sm:max-w-full sm:max-h-full"
      >
        <div className="relative w-full h-[50vh] sm:h-[70vh] flex items-center justify-center">
          <Image
            src={images[selectedImage]}
            alt={`${game.title} - Full size`}
            fill
            className="object-contain"
            sizes="100vw"
          />

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-polar-night/80 hover:bg-polar-night flex items-center justify-center text-snow-storm transition-colors"
                aria-label="Previous image"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-polar-night/80 hover:bg-polar-night flex items-center justify-center text-snow-storm transition-colors"
                aria-label="Next image"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 bg-polar-night/80 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-snow-storm text-xs sm:text-sm">
            {selectedImage + 1} / {images.length}
          </div>
        </div>
      </Modal>

      {/* Contact Seller Modal */}
      <Modal
        open={purchaseModalOpen}
        onClose={() => setPurchaseModalOpen(false)}
        title="Contact Seller"
      >
        <div className="space-y-4 sm:space-y-6">
          {/* Game Info */}
          <div>
            <h3 className="font-semibold text-text mb-3">About this listing</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Game</span>
                <span className="text-text font-medium">{game.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Asking Price</span>
                <span className="text-text">€{game.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Seller</span>
                <span className="text-text">{game.seller.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Location</span>
                <span className="text-text">{game.location}</span>
              </div>
            </div>
          </div>

          {/* Transaction Tips */}
          <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <svg className="w-5 h-5 text-frost-ice mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-text mb-2 text-sm sm:text-base">Safe Trading Tips</p>
                <ul className="text-xs sm:text-sm text-text-secondary space-y-1">
                  <li>✓ Meet in public places for local pickup</li>
                  <li>✓ Use Omniva or DPD parcel lockers for shipping</li>
                  <li>✓ Inspect the game before completing payment</li>
                  <li>✓ Communicate through the platform when messaging launches</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="bg-snow-stormLight rounded-lg p-4 text-center">
            <p className="text-sm text-text-secondary mb-2">
              <strong className="text-polar-night">In-app messaging coming soon!</strong>
            </p>
            <p className="text-xs text-text-muted">
              For now, you can contact this seller outside the platform. We recommend using the seller&apos;s contact information if provided.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              fullWidth
              onClick={() => {
                setContactEmail(game.seller.username + '@email.com');
                setShowContactInfoModal(true);
                setPurchaseModalOpen(false);
              }}
            >
              Get Contact Info
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => setPurchaseModalOpen(false)}
            >
              Close
            </Button>
          </div>

          <p className="text-xs text-text-muted text-center">
            Trade responsibly. Second Turn Games facilitates connections between buyers and sellers.
          </p>
        </div>
      </Modal>

      {/* Contact Info Modal */}
      <NotificationModal
        isOpen={showContactInfoModal}
        onClose={() => setShowContactInfoModal(false)}
        type="info"
        message={`Messaging system coming soon! Contact: ${contactEmail}`}
      />
    </div>
  );
}
