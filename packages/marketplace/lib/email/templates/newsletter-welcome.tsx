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
import {
  main,
  container,
  h1,
  text,
  buttonContainer,
  button,
  footer,
} from '@/lib/email/styles';

interface NewsletterWelcomeEmailProps {
  locale: 'en' | 'lv';
  unsubscribeUrl: string;
  browseUrl: string;
}

const translations = {
  en: {
    preview: 'Welcome to the Second Turn Games',
    heading: 'Welcome to the marketplace',
    greeting: 'Thanks for joining',
    paragraph1:
      "You'll hear from us when we have something worth sharing. New features, community updates, and the occasional good find.",
    paragraph2:
      "We're building a marketplace where pre-loved board games find new homes. Your support means a lot.",
    cta: 'Browse the marketplace',
    footer: 'Second Turn Games - Board Game Marketplace',
    unsubscribe: 'Unsubscribe',
  },
  lv: {
    preview: 'Laipni lūgti Second Turn Games',
    heading: 'Laipni lūgti',
    greeting: 'Paldies, ka pievienojies',
    paragraph1:
      'Ziņosim, kad mums būs ko pastāstīt. Jaunas iespējas, jaunumi un reizēm kāds labs atradums.',
    paragraph2:
      'Mēs veidojam tirdziņu, kur  galda spēles atrod jaunas mājas. Tavs atbalsts mums ļoti palīdz.',
    cta: 'Pārlūkot spēles',
    footer: 'Second Turn Games - galda spēļu tirdziņš',
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
const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 40px',
};

const unsubscribeLink = {
  color: '#8898aa',
  textDecoration: 'underline',
};
