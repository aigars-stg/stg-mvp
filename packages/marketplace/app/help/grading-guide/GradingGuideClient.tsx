'use client';

import Link from 'next/link';
import { Card } from '@second-turn/design-system';
import {
  Star,
  Sparkles,
  CircleCheck,
  Wrench,
  Camera,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import {
  CONDITION_GRADES,
  SPECIAL_CONSIDERATIONS,
  LISTING_TIPS,
  PHOTO_TIPS,
  COMMON_MISTAKES,
  QUICK_REFERENCE,
  GUIDE_INTRO,
  GRADING_PHILOSOPHY,
} from '../../../lib/grading-guide-content';
import type { ListingCondition } from '../../../lib/types/listing';

// Grade icons mapping
const GRADE_ICONS = {
  likeNew: Star,
  veryGood: Sparkles,
  good: CircleCheck,
  acceptable: Wrench,
} as const;

// Grade colors for visual distinction
const GRADE_COLORS = {
  likeNew: 'border-northern-lights-green bg-northern-lights-green/5',
  veryGood: 'border-frost-ice bg-frost-ice/5',
  good: 'border-aurora-orange bg-aurora-orange/5',
  acceptable: 'border-aurora-red/60 bg-aurora-red/5',
} as const;

const GRADE_ICON_COLORS = {
  likeNew: 'text-northern-lights-green',
  veryGood: 'text-frost-ice',
  good: 'text-aurora-orange',
  acceptable: 'text-aurora-red/80',
} as const;

function GradeCard({ gradeKey }: { gradeKey: ListingCondition }) {
  const [expanded, setExpanded] = useState(false);
  const grade = CONDITION_GRADES[gradeKey];
  const Icon = GRADE_ICONS[gradeKey];

  return (
    <Card
      padding="none"
      className={`border-2 ${GRADE_COLORS[gradeKey]} overflow-hidden`}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 ${GRADE_ICON_COLORS[gradeKey]}`}>
              <Icon className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-polar-night">
                  {grade.label}
                </h3>
                <span className="text-sm font-medium text-text-secondary whitespace-nowrap">
                  {grade.valueGuidance}
                </span>
              </div>
              <p className="text-text-secondary mt-1">{grade.shortDescription}</p>
              <p className="text-sm text-text-muted mt-2">{grade.fullDescription}</p>
            </div>
            <div className="flex-shrink-0 text-text-muted">
              {expanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 sm:px-6 sm:pb-6 border-t border-border/50">
          <div className="grid sm:grid-cols-2 gap-6 pt-4">
            {/* Box Criteria */}
            <div>
              <h4 className="font-semibold text-polar-night mb-3">Box Condition</h4>
              <ul className="space-y-2">
                {grade.boxCriteria.map((criterion, index) => (
                  <li
                    key={index}
                    className="text-sm text-text-secondary flex items-start gap-2"
                  >
                    <span className="text-frost-ice mt-0.5">•</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>

            {/* Component Criteria */}
            <div>
              <h4 className="font-semibold text-polar-night mb-3">
                Component Condition
              </h4>
              <ul className="space-y-2">
                {grade.componentCriteria.map((criterion, index) => (
                  <li
                    key={index}
                    className="text-sm text-text-secondary flex items-start gap-2"
                  >
                    <span className="text-frost-ice mt-0.5">•</span>
                    {criterion}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Typical Scenarios */}
          <div className="mt-6">
            <h4 className="font-semibold text-polar-night mb-3">Typical Scenarios</h4>
            <div className="flex flex-wrap gap-2">
              {grade.typicalScenarios.map((scenario, index) => (
                <span
                  key={index}
                  className="px-3 py-1.5 bg-bg-secondary rounded-full text-sm text-text-secondary"
                >
                  {scenario}
                </span>
              ))}
            </div>
          </div>

          {/* Pro Tip */}
          {grade.proTip && (
            <div className="mt-6 p-3 bg-frost-ice/10 rounded-lg border border-frost-ice/20">
              <div className="flex gap-2 items-start">
                <Lightbulb className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary">
                  <span className="font-medium text-polar-night">Pro tip:</span>{' '}
                  {grade.proTip}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function TableOfContents() {
  return (
    <nav className="mb-8 p-4 bg-bg-secondary rounded-lg">
      <h2 className="font-semibold text-polar-night mb-3">On this page</h2>
      <ul className="space-y-2 text-sm">
        <li>
          <a href="#grades" className="text-frost-ice hover:underline">
            Condition grades
          </a>
        </li>
        <li>
          <a href="#quick-reference" className="text-frost-ice hover:underline">
            Quick reference table
          </a>
        </li>
        <li>
          <a href="#special-considerations" className="text-frost-ice hover:underline">
            Special considerations
          </a>
        </li>
        <li>
          <a href="#listing-tips" className="text-frost-ice hover:underline">
            Listing description tips
          </a>
        </li>
        <li>
          <a href="#photo-tips" className="text-frost-ice hover:underline">
            Photo tips
          </a>
        </li>
        <li>
          <a href="#common-mistakes" className="text-frost-ice hover:underline">
            Common mistakes
          </a>
        </li>
      </ul>
    </nav>
  );
}

export default function GradingGuideClient() {
  return (
    <div className="min-h-screen bg-bg py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-polar-night mb-2">
            {GUIDE_INTRO.title}
          </h1>
          <p className="text-lg text-frost-ice italic mb-4">{GUIDE_INTRO.tagline}</p>
          <p className="text-text-secondary">{GUIDE_INTRO.description}</p>
        </div>

        <TableOfContents />

        {/* Condition Grades */}
        <section id="grades" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6">
            Condition grades
          </h2>
          <div className="space-y-4">
            {(['likeNew', 'veryGood', 'good', 'acceptable'] as ListingCondition[]).map(
              (gradeKey) => (
                <GradeCard key={gradeKey} gradeKey={gradeKey} />
              )
            )}
          </div>
        </section>

        {/* Quick Reference Table */}
        <section id="quick-reference" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6">
            Quick reference
          </h2>
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-secondary border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-polar-night">
                      Grade
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-polar-night">
                      Description
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-polar-night">
                      Value
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {QUICK_REFERENCE.map((item) => {
                    const Icon = GRADE_ICONS[item.grade];
                    return (
                      <tr key={item.grade} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Icon
                              className={`w-4 h-4 ${GRADE_ICON_COLORS[item.grade]}`}
                            />
                            <span className="font-medium text-polar-night">
                              {CONDITION_GRADES[item.grade].label}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {item.oneLineSummary}
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary whitespace-nowrap">
                          {item.valueRange}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-sm text-text-muted mt-3 italic">
            Value percentages are rough guidelines. Rare and out-of-print games often
            sell for more regardless of condition.
          </p>
        </section>

        {/* Special Considerations */}
        <section id="special-considerations" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6">
            Special considerations
          </h2>
          <div className="grid gap-4">
            {Object.entries(SPECIAL_CONSIDERATIONS).map(([key, consideration]) => (
              <Card key={key} padding="md">
                <h3 className="font-semibold text-polar-night mb-2">
                  {consideration.title}
                </h3>
                <p className="text-text-secondary text-sm mb-3">
                  {consideration.description}
                </p>
                <ul className="space-y-1.5">
                  {consideration.details.map((detail, index) => (
                    <li
                      key={index}
                      className="text-sm text-text-muted flex items-start gap-2"
                    >
                      <span className="text-frost-ice mt-0.5">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>

        {/* Listing Tips */}
        <section id="listing-tips" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Listing description examples
          </h2>
          <div className="space-y-4">
            {LISTING_TIPS.map((tip) => {
              const Icon = GRADE_ICONS[tip.grade];
              return (
                <Card key={tip.grade} padding="md" className="border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${GRADE_ICON_COLORS[tip.grade]}`} />
                    <span className="font-semibold text-polar-night">
                      {CONDITION_GRADES[tip.grade].label}
                    </span>
                  </div>
                  <blockquote className="text-text-secondary text-sm italic border-l-2 border-frost-ice/30 pl-4">
                    "{tip.example}"
                  </blockquote>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Photo Tips */}
        <section id="photo-tips" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6 flex items-center gap-2">
            <Camera className="w-6 h-6" />
            Photos make the difference
          </h2>
          <Card padding="md">
            <p className="text-text-secondary mb-4">
              Good photos build trust. Here's what to show:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {PHOTO_TIPS.map((tip, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 bg-bg-secondary/50 rounded-lg"
                >
                  <span className="w-6 h-6 rounded-full bg-frost-ice/20 text-frost-ice flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-medium text-polar-night text-sm">
                      {tip.subject}
                    </div>
                    <div className="text-xs text-text-muted">{tip.description}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-frost-ice/10 rounded-lg">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-polar-night">Tip:</span> Natural
                daylight works best. Photograph on a plain background and show actual
                condition, not the best angle.
              </p>
            </div>
          </Card>
        </section>

        {/* Common Mistakes */}
        <section id="common-mistakes" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Common grading mistakes
          </h2>
          <div className="space-y-3">
            {COMMON_MISTAKES.map((item, index) => (
              <Card key={index} padding="md" className="border border-aurora-orange/20">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-aurora-red font-medium text-sm">✗</span>
                    <p className="text-sm text-polar-night font-medium">
                      {item.mistake}
                    </p>
                  </div>
                  <div className="flex items-start gap-2 ml-4">
                    <span className="text-northern-lights-green font-medium text-sm">
                      ✓
                    </span>
                    <p className="text-sm text-text-secondary">{item.correction}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="mb-12">
          <Card padding="lg" className="bg-frost-ice/5 border border-frost-ice/20">
            <h2 className="text-xl font-bold text-polar-night mb-3">
              {GRADING_PHILOSOPHY.title}
            </h2>
            <p className="text-text-secondary">{GRADING_PHILOSOPHY.content}</p>
          </Card>
        </section>

        {/* CTA */}
        <div className="text-center space-y-4">
          <p className="text-text-secondary">
            Ready to list your game with confidence?
          </p>
          <Link
            href="/sell"
            className="inline-flex items-center px-6 py-3 bg-frost-ice text-snow-white font-semibold rounded-lg hover:bg-aurora-blue transition-colors"
          >
            Sell a game
          </Link>
          <div className="pt-4">
            <Link href="/" className="text-frost-ice hover:underline text-sm">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
