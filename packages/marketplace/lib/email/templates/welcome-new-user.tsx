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
} from '@react-email/components';
import * as React from 'react';
import {
  main,
  container,
  h1Small,
  text,
  buttonOrange,
  footer,
} from '@/lib/email/styles';

interface WelcomeNewUserEmailProps {
  locale: 'en' | 'lv';
  profileUrl: string;
  browseUrl: string;
}

const translations = {
  en: {
    preview: 'Welcome to Second Turn Games — your account is ready',
    heading: 'Welcome to Second Turn Games',
    greeting: 'Your account is all set.',
    paragraph1:
      'Second Turn Games is a marketplace for pre-loved board games across the Baltics. Whether you want to find a great deal or give your games a second turn, you are in the right place.',
    paragraph2: 'Here are a few things you can do next:',
    step1: 'Complete your profile — add your name and country so other members can find you',
    step2: 'Browse the marketplace — discover board games from sellers near you',
    step3: 'Start selling — list your pre-loved games and earn from your collection',
    ctaProfile: 'Complete your profile',
    ctaBrowse: 'Browse games',
    footer: 'Second Turn Games — Every game deserves a second turn.',
  },
  lv: {
    preview: 'Laipni lūgti Second Turn Games — tavs konts ir gatavs',
    heading: 'Laipni lūgti Second Turn Games',
    greeting: 'Tavs konts ir gatavs.',
    paragraph1:
      'Second Turn Games ir galda spēļu tirdziņš Baltijā. Neatkarīgi no tā, vai vēlies atrast labu piedāvājumu vai dot savām spēlēm otru iespēju — tu esi īstajā vietā.',
    paragraph2: 'Lūk, ko vari darīt tālāk:',
    step1: 'Aizpildi savu profilu — pievieno vārdu un valsti, lai citi dalībnieki tevi atrastu',
    step2: 'Pārlūko tirdziņu — atrodi galda spēles no pārdevējiem tev tuvumā',
    step3: 'Sāc pārdot — ievieto savas spēles un pelni no savas kolekcijas',
    ctaProfile: 'Aizpildīt profilu',
    ctaBrowse: 'Pārlūkot spēles',
    footer: 'Second Turn Games — katra spēle ir pelnījusi otro iespēju.',
  },
};

export const WelcomeNewUserEmail = ({
  locale = 'en',
  profileUrl = 'https://secondturn.games/account/settings',
  browseUrl = 'https://secondturn.games',
}: WelcomeNewUserEmailProps) => {
  const t = translations[locale] || translations.en;

  return (
    <Html>
      <Head />
      <Preview>{t.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1Small}>{t.heading}</Heading>

          <Text style={text}>{t.greeting}</Text>

          <Text style={text}>{t.paragraph1}</Text>

          <Text style={text}>{t.paragraph2}</Text>

          <Text style={stepText}>1. {t.step1}</Text>
          <Text style={stepText}>2. {t.step2}</Text>
          <Text style={stepText}>3. {t.step3}</Text>

          <Section style={buttonContainer}>
            <Button style={buttonOrange} href={profileUrl}>
              {t.ctaProfile}
            </Button>
          </Section>

          <Section style={buttonContainer}>
            <Button style={buttonSecondary} href={browseUrl}>
              {t.ctaBrowse}
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>{t.footer}</Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeNewUserEmail;

// Styles
const stepText = {
  color: '#525f7f',
  fontSize: '15px',
  lineHeight: '22px',
  margin: '8px 40px 8px 56px',
};

const buttonContainer = {
  margin: '16px 40px',
  textAlign: 'center' as const,
};

const buttonSecondary = {
  backgroundColor: '#88C0D0',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 32px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '32px 40px',
};

