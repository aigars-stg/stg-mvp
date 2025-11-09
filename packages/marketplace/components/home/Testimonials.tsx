'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Testimonial {
  id: number;
  name: string;
  role: string;
  location: string;
  content: string;
  avatar?: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: 'Marta K.',
    role: 'Board Game Collector',
    location: 'Tallinn, Estonia',
    content: 'Found a rare copy of Twilight Imperium for half the price of new. The seller was transparent about the condition and even offered local pickup. Best marketplace for board games in the Baltics!',
    initials: 'MK',
  },
  {
    id: 2,
    name: 'Jānis R.',
    role: 'Casual Seller',
    location: 'Riga, Latvia',
    content: 'Sold 5 games I no longer played within two weeks. The process was simple, and the buyer protection made me feel secure. Great way to declutter and help other gamers.',
    initials: 'JR',
  },
  {
    id: 3,
    name: 'Vytautas M.',
    role: 'Game Café Owner',
    location: 'Vilnius, Lithuania',
    content: 'We regularly find games here for our café at amazing prices. The condition grading system is accurate, and the local community aspect makes it easy to coordinate pickups.',
    initials: 'VM',
  },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            Loved by the Baltic Gaming Community
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Join hundreds of happy buyers and sellers
          </p>
        </div>

        {/* Testimonials - Desktop: Grid, Mobile: Carousel */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>

        {/* Mobile carousel */}
        <div className="lg:hidden">
          <TestimonialCard testimonial={testimonials[activeIndex]} />

          {/* Dots navigation */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                  index === activeIndex
                    ? 'bg-frost-ice w-8'
                    : 'bg-border-subtle hover:bg-border-default'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-bg-elevated rounded-lg p-6 sm:p-8 border border-border-subtle hover:border-border-default transition-colors duration-200">
      {/* Quote icon */}
      <div className="mb-4">
        <svg
          className="w-8 h-8 text-frost-ice/30"
          fill="currentColor"
          viewBox="0 0 32 32"
        >
          <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
        </svg>
      </div>

      {/* Content */}
      <p className="text-text-secondary mb-6 leading-relaxed">
        "{testimonial.content}"
      </p>

      {/* Author */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {testimonial.avatar ? (
            <Image
              src={testimonial.avatar}
              alt={testimonial.name}
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-frost-ice/10 flex items-center justify-center">
              <span className="text-frost-ice font-semibold text-sm">
                {testimonial.initials}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="font-semibold text-text-primary">
            {testimonial.name}
          </div>
          <div className="text-sm text-text-muted">
            {testimonial.role} · {testimonial.location}
          </div>
        </div>
      </div>
    </div>
  );
}
