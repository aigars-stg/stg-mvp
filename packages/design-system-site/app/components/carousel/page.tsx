'use client';

import {
  ImageCarousel,
  CarouselDots,
  ThumbnailStrip,
  Card,
} from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';
import { useState } from 'react';

const sampleImages = [
  'https://picsum.photos/seed/game1/400/300',
  'https://picsum.photos/seed/game2/400/300',
  'https://picsum.photos/seed/game3/400/300',
  'https://picsum.photos/seed/game4/400/300',
];

export default function CarouselPage() {
  const [controlledIndex, setControlledIndex] = useState(0);

  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">ImageCarousel</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          ImageCarousel displays multiple images with navigation controls.
          Supports touch swipe, keyboard navigation, and multiple indicator styles.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            Carousels showcase product images throughout the marketplace:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Listing cards:</strong> Preview multiple condition photos in browse view</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Listing detail:</strong> Full gallery with thumbnails for product inspection</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Lightbox:</strong> Fullscreen viewing of high-resolution images</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Basic Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Basic Usage</h2>

        <ComponentDemo
          title="Basic Carousel"
          description="Image carousel with arrows and dot indicators."
        >
          <div className="max-w-md">
            <ImageCarousel
              images={sampleImages}
              alt="Product images"
              className="rounded-lg"
            />
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="Counter Instead of Dots"
          description="Use showCounter for compact numeric indicator."
        >
          <div className="max-w-md">
            <ImageCarousel
              images={sampleImages}
              alt="Product images"
              showDots={false}
              showCounter
              className="rounded-lg"
            />
          </div>
        </ComponentDemo>
      </section>

      {/* Configuration Options */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Configuration</h2>

        <ComponentDemo
          title="Without Arrows"
          description="Dots-only navigation for cleaner look."
        >
          <div className="max-w-md">
            <ImageCarousel
              images={sampleImages}
              alt="Product images"
              showArrows={false}
              className="rounded-lg"
            />
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="Aspect Ratios"
          description="Different aspect ratios for different contexts."
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-text-muted mb-2">1:1 (Square)</p>
              <ImageCarousel
                images={sampleImages.slice(0, 2)}
                alt="Product"
                aspectRatio="1/1"
                showArrows={false}
                className="rounded-lg"
              />
            </div>
            <div>
              <p className="text-sm text-text-muted mb-2">4:3 (Default)</p>
              <ImageCarousel
                images={sampleImages.slice(0, 2)}
                alt="Product"
                aspectRatio="4/3"
                showArrows={false}
                className="rounded-lg"
              />
            </div>
            <div>
              <p className="text-sm text-text-muted mb-2">16:9</p>
              <ImageCarousel
                images={sampleImages.slice(0, 2)}
                alt="Product"
                aspectRatio="16/9"
                showArrows={false}
                className="rounded-lg"
              />
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* With Overlays */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">With Overlays</h2>

        <ComponentDemo
          title="Badge and Action Overlays"
          description="Add badges and buttons as children."
        >
          <div className="max-w-md">
            <ImageCarousel
              images={sampleImages}
              alt="Product images"
              className="rounded-lg"
            >
              {/* Sale badge */}
              <span className="absolute top-3 left-3 px-2 py-1 bg-aurora-red text-snow-white text-xs font-semibold rounded">
                SALE
              </span>
              {/* Save button */}
              <button className="absolute top-3 right-3 p-2 bg-snow-white/80 rounded-full hover:bg-snow-white transition-colors">
                <svg className="w-5 h-5 text-aurora-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </ImageCarousel>
          </div>
        </ComponentDemo>
      </section>

      {/* Controlled Mode */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Controlled Mode</h2>

        <ComponentDemo
          title="External Controls"
          description="Control the carousel from outside with state."
        >
          <div className="max-w-md space-y-4">
            <ImageCarousel
              images={sampleImages}
              alt="Product images"
              currentIndex={controlledIndex}
              onIndexChange={setControlledIndex}
              showDots={false}
              className="rounded-lg"
            />
            <CarouselDots
              count={sampleImages.length}
              currentIndex={controlledIndex}
              onIndexChange={setControlledIndex}
              variant="frost"
            />
            <ThumbnailStrip
              images={sampleImages}
              currentIndex={controlledIndex}
              onIndexChange={setControlledIndex}
            />
          </div>
        </ComponentDemo>
      </section>

      {/* Standalone Components */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Standalone Components</h2>

        <ComponentDemo
          title="CarouselDots"
          description="Dot indicators for any carousel implementation."
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-muted mb-2">Frost (default)</p>
              <CarouselDots
                count={5}
                currentIndex={1}
                onIndexChange={() => {}}
                variant="frost"
              />
            </div>
            <div>
              <p className="text-sm text-text-muted mb-2">White (for dark backgrounds)</p>
              <div className="bg-polar-night p-4 rounded-lg inline-block">
                <CarouselDots
                  count={5}
                  currentIndex={2}
                  onIndexChange={() => {}}
                  variant="white"
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-2">Dark</p>
              <CarouselDots
                count={5}
                currentIndex={3}
                onIndexChange={() => {}}
                variant="dark"
              />
            </div>
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="ThumbnailStrip"
          description="Thumbnail navigation for image galleries."
        >
          <ThumbnailStrip
            images={sampleImages}
            currentIndex={0}
            onIndexChange={() => {}}
            size="lg"
          />
        </ComponentDemo>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`import {
  ImageCarousel,
  CarouselDots,
  ThumbnailStrip,
} from '@second-turn/design-system';

// Basic usage
<ImageCarousel
  images={listing.images}
  alt={listing.title}
  aspectRatio="4/3"
/>

// With counter instead of dots
<ImageCarousel
  images={images}
  alt="Product"
  showDots={false}
  showCounter
/>

// With overlays
<ImageCarousel images={images} alt="Product">
  <Badge className="absolute top-2 left-2">Sale</Badge>
  <SaveButton className="absolute top-2 right-2" />
</ImageCarousel>

// Controlled with external navigation
const [index, setIndex] = useState(0);

<ImageCarousel
  images={images}
  alt="Product"
  currentIndex={index}
  onIndexChange={setIndex}
  showDots={false}
/>
<ThumbnailStrip
  images={images}
  currentIndex={index}
  onIndexChange={setIndex}
/>

// Custom image renderer (Next.js Image)
<ImageCarousel
  images={images}
  alt="Product"
  renderImage={(src, alt) => (
    <Image
      src={src}
      alt={alt}
      fill
      className="object-contain"
      sizes="(max-width: 768px) 100vw, 50vw"
    />
  )}
/>`}</code>
          </pre>
        </div>
      </section>

      {/* Touch Support */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Touch & Gesture Support</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Swipe Navigation</h3>
            <p className="text-polar-nightMedium">
              Swipe left or right to navigate between images. Enabled by default with
              a minimum swipe distance of 50px.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Responsive Arrows</h3>
            <p className="text-polar-nightMedium">
              On mobile, arrows are always visible for easy navigation.
              On desktop, they appear on hover for a cleaner look.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Image Click</h3>
            <p className="text-polar-nightMedium">
              Pass onImageClick to handle clicks (e.g., open lightbox).
              Navigation clicks don&apos;t trigger this callback.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
