import { NextRequest, NextResponse } from 'next/server';
import { isValidCountryCode, type CountryCode } from '@/lib/country-utils';
import { handleApiError } from '@/lib/api/error-handler';

// Force dynamic since we read request headers
export const dynamic = 'force-dynamic';

/**
 * GET /api/geo/detect
 * Detects user's country from Vercel's x-vercel-ip-country header
 * Returns country code if it's a supported Baltic country (LV, EE, LT)
 */
export async function GET(request: NextRequest) {
  try {
    // Vercel automatically adds this header based on IP geolocation
    const vercelCountry = request.headers.get('x-vercel-ip-country');

    // Also check CF header as fallback (if behind Cloudflare)
    const cfCountry = request.headers.get('cf-ipcountry');

    const detectedCode = vercelCountry || cfCountry;

    // Debug logging (remove in production if noisy)
    console.log('[Geo Detect] Headers:', {
      vercelCountry,
      cfCountry,
      detectedCode,
    });

    // Only return if it's a valid Baltic country code
    if (detectedCode && isValidCountryCode(detectedCode) && detectedCode !== 'OTHER') {
      return NextResponse.json({
        detected: true,
        country: detectedCode as CountryCode,
      });
    }

    // Country not detected or not a supported Baltic country
    return NextResponse.json({
      detected: false,
      country: null,
    });
  } catch (error) {
    return handleApiError(error, 'Detect country');
  }
}
