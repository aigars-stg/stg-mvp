import { NextResponse } from 'next/server';

/**
 * Simple health check endpoint for connectivity verification.
 * Used by the offline page to detect when connection is restored.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 });
}
