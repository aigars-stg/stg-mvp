import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components';
import * as React from 'react';

interface NewsletterWelcomeEmailProps {
  locale: 'en' | 'lv';
  unsubscribeUrl: string;
  browseUrl: string;
}

const translations = {
  en: {
    preview: 'Welcome to the Second Turn community',
    heading: 'Welcome to the community',
    greeting: 'Thanks for joining',
    paragraph1:
      "You'll hear from us when we have something worth sharing. New features, community updates, and the occasional good find.",
    paragraph2:
      "We're building a marketplace where pre-loved board games find new homes. Your support means a lot.",
    cta: 'Browse the marketplace',
    footer: 'Second Turn - Board Game Marketplace',
    unsubscribe: 'Unsubscribe',
  },
  lv: {
    preview: 'Laipni lūgti Second Turn kopienā',
    heading: 'Laipni lūgti kopienā',
    greeting: 'Paldies, ka pievienojies',
    paragraph1:
      'Rakstīsim, kad būs ko interesantu pastāstīt. Jaunas funkcijas, kopienas jaunumi un reizēm kāds labs atradums.',
    paragraph2:
      'Mēs veidojam tirguvietu, kur iepriekš mīlētas galda spēles atrod jaunas mājas. Tavs atbalsts mums ļoti nozīmē.',
    cta: 'Pārlūkot tirguvietu',
    footer: 'Second Turn - Galda spēļu tirguvieta',
    unsubscribe: 'Atteikties no jaunumiem',
  },
};

export const NewsletterWelcomeEmail = ({
  locale = 'en',
  unsubscribeUrl = 'https://secondturn.games/api/newsletter/unsubscribe?token=xxx',
  browseUrl = 'https://secondturn.games',
}: NewsletterWelcomeEmailProps) => {
  const t = translations[locale] || translations.en;

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t.heading}</Heading>

          <Text style={text}>{t.greeting},</Text>

          <Text style={text}>{t.paragraph1}</Text>

          <Text style={text}>{t.paragraph2}</Text>

          <Section style={buttonContainer}>
            <Button style={button} href={browseUrl}>
              {t.cta}
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            {t.footer}
            <br />
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              {t.unsubscribe}
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default NewsletterWelcomeEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#2e3a4d',
  fontSize: '32px',
  fontWeight: '700',
  margin: '40px 0',
  padding: '0 40px',
};

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '16px 40px',
};

const buttonContainer = {
  margin: '32px 40px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#8fbcbb',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 40px',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '32px 40px 0',
  textAlign: 'center' as const,
};

const unsubscribeLink = {
  color: '#8898aa',
  textDecoration: 'underline',
};
