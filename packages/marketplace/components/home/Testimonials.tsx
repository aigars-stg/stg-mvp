'use client';

import { useState } from 'react';
// Image from next/image available if needed
import { useTranslations } from 'next-intl';

interface TestimonialKey {
  id: number;
  key: string;
  initials: string;
}

interface TestimonialData {
  id: number;
  name: string;
  role: string;
  location: string;
  content: string;
  initials: string;
}

const testimonialKeys: TestimonialKey[] = [
  { id: 1, key: 'testimonial1', initials: 'MK' },
  { id: 2, key: 'testimonial2', initials: 'JR' },
  { id: 3, key: 'testimonial3', initials: 'VM' },
];

export function Testimonials() {
  const t = useTranslations('Home.Testimonials');
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = testimonialKeys.map((item) => ({
    id: item.id,
    name: t(`${item.key}.name`),
    role: t(`${item.key}.role`),
    location: t(`${item.key}.location`),
    content: t(`${item.key}.content`),
    initials: item.initials,
  }));

  return (
    <section className="py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            {t('subtitle')}
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
                aria-label={t('goToTestimonial', { number: index + 1 })}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialCard({ testimonial }: { testimonial: TestimonialData }) {
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
        &ldquo;{testimonial.content}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-frost-ice/10 flex items-center justify-center">
            <span className="text-frost-ice font-semibold text-sm">
              {testimonial.initials}
            </span>
          </div>
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
