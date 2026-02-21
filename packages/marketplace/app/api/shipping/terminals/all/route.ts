import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAllTerminals, UnisendApiError } from '@/lib/unisend';
import { handleApiError } from '@/lib/api/error-handler';

/**
 * GET /api/shipping/terminals/all
 *
 * Fetch all Unisend terminals across all countries (LT, LV, EE) in one call.
 * Results are cached in Redis for 1 hour.
 */
export async function GET() {
  try {
    const terminals = await getAllTerminals();

    return NextResponse.json({
      terminals,
      count: terminals.length,
    });
  } catch (error) {
    if (error instanceof UnisendApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    return handleApiError(error, 'Fetch all terminals');
  }
}
