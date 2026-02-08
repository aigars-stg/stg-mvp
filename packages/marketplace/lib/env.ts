/**
 * Environment Variable Validation
 * Validates all required environment variables at build/runtime
 */

// Server-side environment variables
const serverEnvSchema = {
  // Database
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,

  // EveryPay
  EVERYPAY_API_USERNAME: process.env.EVERYPAY_API_USERNAME,
  EVERYPAY_API_SECRET: process.env.EVERYPAY_API_SECRET,
  EVERYPAY_API_URL: process.env.EVERYPAY_API_URL,
  EVERYPAY_ACCOUNT_NAME: process.env.EVERYPAY_ACCOUNT_NAME,

  // Email (Resend)
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,

  // Unisend API
  UNISEND_API_URL: process.env.UNISEND_API_URL,
  UNISEND_USERNAME: process.env.UNISEND_USERNAME,
  UNISEND_PASSWORD: process.env.UNISEND_PASSWORD,

  // App
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

  // Cron (optional in development)
  CRON_SECRET: process.env.CRON_SECRET,

  // Cloudflare Turnstile (optional)
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY,
} as const;

type EnvKey = keyof typeof serverEnvSchema;

interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Validate environment variables
 * Call this at app startup to ensure all required vars are present
 */
export function validateEnv(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];

  // Required in all environments
  const required: EnvKey[] = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'EVERYPAY_API_USERNAME',
    'EVERYPAY_API_SECRET',
    'EVERYPAY_API_URL',
    'EVERYPAY_ACCOUNT_NAME',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'UNISEND_API_URL',
    'UNISEND_USERNAME',
    'UNISEND_PASSWORD',
    'NEXT_PUBLIC_APP_URL',
  ];

  // Optional in development, required in production
  const requiredInProduction: EnvKey[] = ['CRON_SECRET'];

  // Fully optional (warnings only)
  const optional: EnvKey[] = [
    'NEXT_PUBLIC_TURNSTILE_SITE_KEY',
    'TURNSTILE_SECRET_KEY',
  ];

  const isProduction = process.env.NODE_ENV === 'production';

  // Check required vars
  for (const key of required) {
    if (!serverEnvSchema[key]) {
      missing.push(key);
    }
  }

  // Check production-only vars
  for (const key of requiredInProduction) {
    if (!serverEnvSchema[key]) {
      if (isProduction) {
        missing.push(key);
      } else {
        warnings.push(`${key} not set (required in production)`);
      }
    }
  }

  // Check optional vars
  for (const key of optional) {
    if (!serverEnvSchema[key]) {
      warnings.push(`${key} not set (Turnstile captcha will be disabled)`);
    }
  }

  // Validate URLs
  if (serverEnvSchema.NEXT_PUBLIC_SUPABASE_URL && !isValidUrl(serverEnvSchema.NEXT_PUBLIC_SUPABASE_URL)) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL (invalid URL format)');
  }

  if (serverEnvSchema.UNISEND_API_URL && !isValidUrl(serverEnvSchema.UNISEND_API_URL)) {
    missing.push('UNISEND_API_URL (invalid URL format)');
  }

  if (serverEnvSchema.NEXT_PUBLIC_APP_URL && !isValidUrl(serverEnvSchema.NEXT_PUBLIC_APP_URL)) {
    missing.push('NEXT_PUBLIC_APP_URL (invalid URL format)');
  }

  // Validate email format
  if (serverEnvSchema.RESEND_FROM_EMAIL && !isValidEmail(serverEnvSchema.RESEND_FROM_EMAIL)) {
    missing.push('RESEND_FROM_EMAIL (invalid email format)');
  }

  // Validate EveryPay URL
  if (serverEnvSchema.EVERYPAY_API_URL && !isValidUrl(serverEnvSchema.EVERYPAY_API_URL)) {
    missing.push('EVERYPAY_API_URL (invalid URL format)');
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Assert all required environment variables are present
 * Throws error if validation fails
 */
export function assertEnv(): void {
  const result = validateEnv();

  if (result.warnings.length > 0) {
    console.warn('⚠️ Environment Warnings:');
    result.warnings.forEach((warning) => console.warn(`  - ${warning}`));
  }

  if (!result.valid) {
    console.error('❌ Missing required environment variables:');
    result.missing.forEach((key) => console.error(`  - ${key}`));
    throw new Error(
      `Missing required environment variables: ${result.missing.join(', ')}\n\n` +
        'Please check your .env file and ensure all required variables are set.\n' +
        'See .env.example for reference.'
    );
  }

  console.log('✅ Environment variables validated successfully');
}

// Helpers
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Export typed env for safe access
export const env = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  },
  everypay: {
    apiUsername: process.env.EVERYPAY_API_USERNAME!,
    apiSecret: process.env.EVERYPAY_API_SECRET!,
    apiUrl: process.env.EVERYPAY_API_URL!,
    accountName: process.env.EVERYPAY_ACCOUNT_NAME!,
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY!,
    fromEmail: process.env.RESEND_FROM_EMAIL!,
  },
  unisend: {
    apiUrl: process.env.UNISEND_API_URL!,
    username: process.env.UNISEND_USERNAME!,
    password: process.env.UNISEND_PASSWORD!,
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL!,
  },
  cron: {
    secret: process.env.CRON_SECRET,
  },
  turnstile: {
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
    secretKey: process.env.TURNSTILE_SECRET_KEY,
  },
} as const;
