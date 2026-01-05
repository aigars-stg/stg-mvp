import { Metadata } from 'next';
import GradingGuideClient from './GradingGuideClient';

export const metadata: Metadata = {
  title: 'Condition Grading Guide | Second Turn Games',
  description:
    'Learn how to accurately grade board game condition. Our guide covers Like New, Very Good, Good, and Acceptable conditions with photos tips and common mistakes to avoid.',
  openGraph: {
    title: 'Condition Grading Guide | Second Turn Games',
    description:
      'Grade honestly. Sell faster. Learn how to accurately describe your board game condition for quick, dispute-free sales.',
  },
};

export default function GradingGuidePage() {
  return <GradingGuideClient />;
}
