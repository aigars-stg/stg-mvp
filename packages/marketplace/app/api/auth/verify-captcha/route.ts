import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api/error-handler';
import { verifyTurnstile } from '@/lib/turnstile';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    const remoteIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
    const result = await verifyTurnstile(token, remoteIp);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Verification failed', 'error-codes': result.errorCodes },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, 'Verify captcha');
  }
}
