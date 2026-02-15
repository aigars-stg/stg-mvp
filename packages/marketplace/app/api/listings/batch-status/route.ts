import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api/auth-middleware';
import { handleApiError } from '@/lib/api/error-handler';

const MAX_IDS = 20;

/**
 * POST /api/listings/batch-status
 *
 * Check availability of multiple listings at once.
 * Returns which listing IDs are still active and unreserved.
 * Used by the expired cart items section to filter out unavailable items.
 */
export async function POST(request: NextRequest) {
  try {
    const { response, supabase } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const listingIds: unknown = body.listingIds;

    if (!Array.isArray(listingIds) || listingIds.length === 0) {
      return NextResponse.json(
        { error: 'listingIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (listingIds.length > MAX_IDS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_IDS} listing IDs per request` },
        { status: 400 }
      );
    }

    const validIds = listingIds.filter(
      (id): id is string => typeof id === 'string' && id.length > 0
    );

    if (validIds.length === 0) {
      return NextResponse.json({ available: [] });
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('listings')
      .select('id')
      .in('id', validIds)
      .eq('status', 'active')
      .or(`reserved_by.is.null,reserved_until.lt.${now}`);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to check listing availability' },
        { status: 500 }
      );
    }

    const available = (data || []).map((row: { id: string }) => row.id);

    return NextResponse.json({ available });
  } catch (error) {
    return handleApiError(error, 'Batch listing status check');
  }
}
