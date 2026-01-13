'use client';

import Link from 'next/link';
import { Card } from '@second-turn/design-system';
import {  Star, Sparks as Sparkles, CheckCircle as CircleCheck, Tool as Wrench, PhotoCamera as Camera, AlertTriangle, LightbulbOn as Lightbulb, BookOpen, ChevronDown, ChevronUp  } from 'griddy-icons';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ListingCondition } from '../../../../lib/types/listing';

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
  const t = useTranslations('Help.GradingGuide.gradeCard');
  const tGrades = useTranslations('Sell.GradingGuidePanel.grades');
  const Icon = GRADE_ICONS[gradeKey];

  // Get translated grade content
  const label = tGrades(`${gradeKey}.label`);
  const shortDescription = tGrades(`${gradeKey}.shortDescription`);
  const fullDescription = tGrades(`${gradeKey}.fullDescription`);
  const valueGuidance = tGrades(`${gradeKey}.valueGuidance`);
  const boxCriteria = tGrades.raw(`${gradeKey}.boxCriteria`) as string[];
  const componentCriteria = tGrades.raw(`${gradeKey}.componentCriteria`) as string[];
  const proTip = tGrades(`${gradeKey}.proTip`);

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
                  {label}
                </h3>
                <span className="text-sm font-medium text-text-secondary whitespace-nowrap">
                  {valueGuidance}
                </span>
              </div>
              <p className="text-text-secondary mt-1">{shortDescription}</p>
              <p className="text-sm text-text-muted mt-2">{fullDescription}</p>
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
              <h4 className="font-semibold text-polar-night mb-3">{t('boxCondition')}</h4>
              <ul className="space-y-2">
                {boxCriteria.map((criterion: string, index: number) => (
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
                {t('componentCondition')}
              </h4>
              <ul className="space-y-2">
                {componentCriteria.map((criterion: string, index: number) => (
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

          {/* Pro Tip */}
          {proTip && (
            <div className="mt-6 p-3 bg-frost-ice/10 rounded-lg border border-frost-ice/20">
              <div className="flex gap-2 items-start">
                <Lightbulb className="w-4 h-4 text-frost-ice flex-shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary">
                  <span className="font-medium text-polar-night">{t('proTip')}</span>{' '}
                  {proTip}
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
  const t = useTranslations('Help.GradingGuide.toc');
  return (
    <nav className="mb-8 p-4 bg-bg-secondary rounded-lg">
      <h2 className="font-semibold text-polar-night mb-3">{t('title')}</h2>
      <ul className="space-y-2 text-sm">
        <li>
          <a href="#grades" className="text-frost-ice hover:underline">
            {t('grades')}
          </a>
        </li>
        <li>
          <a href="#quick-reference" className="text-frost-ice hover:underline">
            {t('quickReference')}
          </a>
        </li>
        <li>
          <a href="#special-considerations" className="text-frost-ice hover:underline">
            {t('specialConsiderations')}
          </a>
        </li>
        <li>
          <a href="#listing-tips" className="text-frost-ice hover:underline">
            {t('listingTips')}
          </a>
        </li>
        <li>
          <a href="#photo-tips" className="text-frost-ice hover:underline">
            {t('photoTips')}
          </a>
        </li>
        <li>
          <a href="#common-mistakes" className="text-frost-ice hover:underline">
            {t('commonMistakes')}
          </a>
        </li>
      </ul>
    </nav>
  );
}

export default function GradingGuideClient() {
  const t = useTranslations('Help.GradingGuide');
  const tSections = useTranslations('Help.GradingGuide.sections');
  const tTable = useTranslations('Help.GradingGuide.quickReferenceTable');
  const tGrades = useTranslations('Sell.GradingGuidePanel.grades');
  const tGradesSummary = useTranslations('Help.GradingGuide.grades');

  const GRADES: ListingCondition[] = ['likeNew', 'veryGood', 'good', 'acceptable'];

  return (
    <div className="min-h-screen bg-bg py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-polar-night mb-2">
            {t('intro.title')}
          </h1>
          <p className="text-lg text-frost-ice italic mb-4">{t('intro.tagline')}</p>
          <p className="text-text-secondary">{t('intro.description')}</p>
        </div>

        <TableOfContents />

        {/* Condition Grades */}
        <section id="grades" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6">
            {tSections('conditionGrades')}
          </h2>
          <div className="space-y-4">
            {GRADES.map((gradeKey) => (
              <GradeCard key={gradeKey} gradeKey={gradeKey} />
            ))}
          </div>
        </section>

        {/* Quick Reference Table */}
        <section id="quick-reference" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6">
            {tSections('quickReference')}
          </h2>
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-bg-secondary border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-polar-night">
                      {tTable('grade')}
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-polar-night">
                      {tTable('description')}
                    </th>
                    <th className="text-right px-4 py-3 font-semibold text-polar-night">
                      {tTable('value')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {GRADES.map((grade) => {
                    const Icon = GRADE_ICONS[grade];
                    return (
                      <tr key={grade} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Icon
                              className={`w-4 h-4 ${GRADE_ICON_COLORS[grade]}`}
                            />
                            <span className="font-medium text-polar-night">
                              {tGrades(`${grade}.label`)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-text-secondary">
                          {tGradesSummary(`${grade}.oneLineSummary`)}
                        </td>
                        <td className="px-4 py-3 text-right text-text-secondary whitespace-nowrap">
                          {tGrades(`${grade}.valueGuidance`)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="text-sm text-text-muted mt-3 italic">
            {tTable('disclaimer')}
          </p>
        </section>

        {/* Special Considerations */}
        <section id="special-considerations" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6">
            {tSections('specialConsiderations')}
          </h2>
          <div className="grid gap-4">
            {(['punchedTokens', 'sleevedCards', 'paintedMinis', 'promosExtras', 'editionLanguage'] as const).map((key) => {
              const details = t.raw(`specialConsiderations.${key}.details`) as string[];
              return (
                <Card key={key} padding="md">
                  <h3 className="font-semibold text-polar-night mb-2">
                    {t(`specialConsiderations.${key}.title`)}
                  </h3>
                  <p className="text-text-secondary text-sm mb-3">
                    {t(`specialConsiderations.${key}.description`)}
                  </p>
                  <ul className="space-y-1.5">
                    {details.map((detail: string, index: number) => (
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
              );
            })}
          </div>
        </section>

        {/* Listing Tips */}
        <section id="listing-tips" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            {tSections('listingTips')}
          </h2>
          <div className="space-y-4">
            {GRADES.map((grade) => {
              const Icon = GRADE_ICONS[grade];
              return (
                <Card key={grade} padding="md" className="border border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className={`w-5 h-5 ${GRADE_ICON_COLORS[grade]}`} />
                    <span className="font-semibold text-polar-night">
                      {tGrades(`${grade}.label`)}
                    </span>
                  </div>
                  <blockquote className="text-text-secondary text-sm italic border-l-2 border-frost-ice/30 pl-4">
                    "{t(`listingTips.${grade}`)}"
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
            {tSections('photoTips')}
          </h2>
          <Card padding="md">
            <p className="text-text-secondary mb-4">
              {t('photoTips.intro')}
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {(['boxFront', 'boxBack', 'boxCorners', 'componentsSpread', 'anyDamage', 'cards'] as const).map((key, index) => (
                <div
                  key={key}
                  className="flex items-start gap-3 p-3 bg-bg-secondary/50 rounded-lg"
                >
                  <span className="w-6 h-6 rounded-full bg-frost-ice/20 text-frost-ice flex items-center justify-center text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <div>
                    <div className="font-medium text-polar-night text-sm">
                      {t(`photoTips.subjects.${key}.title`)}
                    </div>
                    <div className="text-xs text-text-muted">{t(`photoTips.subjects.${key}.description`)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-frost-ice/10 rounded-lg">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-polar-night">{t('photoTips.tipLabel')}</span>{' '}
                {t('photoTips.tip')}
              </p>
            </div>
          </Card>
        </section>

        {/* Common Mistakes */}
        <section id="common-mistakes" className="mb-12 scroll-mt-8">
          <h2 className="text-2xl font-bold text-polar-night mb-6 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            {tSections('commonMistakes')}
          </h2>
          <div className="space-y-3">
            {(t.raw('commonMistakes') as Array<{ mistake: string; correction: string }>).map((item, index) => (
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
              {t('philosophy.title')}
            </h2>
            <p className="text-text-secondary">{t('philosophy.content')}</p>
          </Card>
        </section>

        {/* CTA */}
        <div className="text-center space-y-4">
          <p className="text-text-secondary">
            {t('cta.ready')}
          </p>
          <Link
            href="/sell"
            className="inline-flex items-center px-6 py-3 bg-frost-ice text-snow-white font-semibold rounded-lg hover:bg-aurora-blue transition-colors"
          >
            {t('cta.sellButton')}
          </Link>
          <div className="pt-4">
            <Link href="/" className="text-frost-ice hover:underline text-sm">
              {t('cta.backToHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
