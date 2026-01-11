/**
 * Email translations for auth emails
 * Supports: English (en), Latvian (lv)
 */

export type SupportedLocale = 'en' | 'lv'
export type EmailActionType = 'signup' | 'magiclink' | 'recovery' | 'email_change' | 'invite' | 'reauthentication'

export interface EmailTranslation {
  subject: string
  heading: string
  body: string
  cta: string
  expiryNote: string
  featuresHeading?: string
  footerNote: string
  footerSecurity: string
  tagline: string
  features?: string[]
}

type TranslationMap = {
  [K in SupportedLocale]: {
    [T in EmailActionType]?: EmailTranslation
  }
}

const translations: TranslationMap = {
  en: {
    signup: {
      subject: 'Confirm your email – welcome to Second Turn Games',
      heading: 'Hey there – welcome!',
      body: "You're one click away from joining the Baltic's community for pre-loved board games. Confirm your email and start discovering.",
      cta: 'Confirm my email',
      expiryNote: 'This link expires in 1 hour.',
      featuresHeading: "Once you're in, you can:",
      footerNote: "Didn't sign up? Just ignore this – nothing will happen.",
      footerSecurity: "Questions? Reply to this email – we're happy to help.",
      tagline: 'Every game deserves a second turn',
      features: [
        'Discover games from your community',
        'Save your favorites to a wishlist',
        'List games to sell (completely free!)',
      ],
    },
    magiclink: {
      subject: 'Your login link for Second Turn Games',
      heading: 'Sign in to Second Turn Games',
      body: 'Click below to sign in to your account. No password needed – this link works just once.',
      cta: 'Sign in',
      expiryNote: 'This link expires in 1 hour.',
      footerNote: "Didn't request this? You can safely ignore this email.",
      footerSecurity: '',
      tagline: 'Every game deserves a second turn',
    },
    recovery: {
      subject: 'Reset your password – Second Turn Games',
      heading: 'Reset your password',
      body: 'Someone requested a password reset for your Second Turn Games account. Click below to create a new password.',
      cta: 'Reset password',
      expiryNote: 'This link expires in 1 hour.',
      footerNote: "Didn't request this? You can safely ignore this email. Your password won't change unless you click the link above.",
      footerSecurity: '',
      tagline: 'Every game deserves a second turn',
    },
    email_change: {
      subject: 'Confirm your new email address – Second Turn Games',
      heading: 'Confirm your new email',
      body: 'You requested to change your email address for your Second Turn Games account. Click below to confirm this change.',
      cta: 'Confirm email change',
      expiryNote: 'This link expires in 1 hour.',
      footerNote: "Didn't request this? Please secure your account immediately by resetting your password.",
      footerSecurity: '',
      tagline: 'Every game deserves a second turn',
    },
  },
  lv: {
    signup: {
      subject: 'Apstiprini savu e-pastu – laipni lūdzam Second Turn Games',
      heading: 'Sveiks – laipni lūdzam!',
      body: 'Viens klikšķis, un tu būsi daļa no Baltijas kopienas, kur galda spēles atrod jaunus spēlētājus. Apstiprini savu e-pastu un sāc atklāt.',
      cta: 'Apstiprināt e-pastu',
      expiryNote: 'Šī saite derīga 1 stundu.',
      featuresHeading: 'Kad būsi iekšā, tu varēsi:',
      footerNote: 'Nereģistrējies? Vienkārši ignorē šo – nekas nenotiks.',
      footerSecurity: 'Jautājumi? Atbildi uz šo e-pastu – labprāt palīdzēsim.',
      tagline: 'Katra spēle ir pelnījusi vēl vienu kārtu',
      features: [
        'Atklāt spēles no savas kopienas',
        'Saglabāt favorītus vēlmju sarakstā',
        'Pārdot spēles (pilnīgi bez maksas!)',
      ],
    },
    magiclink: {
      subject: 'Tava pieteikšanās saite Second Turn Games',
      heading: 'Piesakies Second Turn Games',
      body: 'Noklikšķini zemāk, lai pieteiktos savā kontā. Parole nav nepieciešama – šī saite darbojas tikai vienu reizi.',
      cta: 'Pieteikties',
      expiryNote: 'Šī saite derīga 1 stundu.',
      footerNote: 'Nepieprasīji? Droši ignorē šo e-pastu.',
      footerSecurity: '',
      tagline: 'Katra spēle ir pelnījusi vēl vienu kārtu',
    },
    recovery: {
      subject: 'Atjauno savu paroli – Second Turn Games',
      heading: 'Atjauno savu paroli',
      body: 'Kāds pieprasīja paroles atjaunošanu tavam Second Turn Games kontam. Noklikšķini zemāk, lai izveidotu jaunu paroli.',
      cta: 'Atjaunot paroli',
      expiryNote: 'Šī saite derīga 1 stundu.',
      footerNote: 'Nepieprasīji? Droši ignorē šo e-pastu. Tava parole netiks mainīta, ja nenoklikšķināsi uz saites.',
      footerSecurity: '',
      tagline: 'Katra spēle ir pelnījusi vēl vienu kārtu',
    },
    email_change: {
      subject: 'Apstiprini savu jauno e-pasta adresi – Second Turn Games',
      heading: 'Apstiprini savu jauno e-pastu',
      body: 'Tu pieprasīji e-pasta adreses maiņu savam Second Turn Games kontam. Noklikšķini zemāk, lai apstiprinātu šo maiņu.',
      cta: 'Apstiprināt e-pasta maiņu',
      expiryNote: 'Šī saite derīga 1 stundu.',
      footerNote: 'Nepieprasīji? Lūdzu, nekavējoties nodrošini savu kontu, atjaunojot paroli.',
      footerSecurity: '',
      tagline: 'Katra spēle ir pelnījusi vēl vienu kārtu',
    },
  },
}

export function getTranslation(locale: SupportedLocale, actionType: EmailActionType): EmailTranslation {
  // Fallback to English if locale not supported
  const localeTranslations = translations[locale] || translations.en
  // Fallback to English translation if action type not found
  const translation = localeTranslations[actionType] || translations.en[actionType]

  if (!translation) {
    throw new Error(`No translation found for ${locale}/${actionType}`)
  }

  return translation
}
