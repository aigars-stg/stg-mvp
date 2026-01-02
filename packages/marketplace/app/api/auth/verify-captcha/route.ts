import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    if (!secretKey) {
      console.warn('TURNSTILE_SECRET_KEY not configured');
      // Allow request to proceed if Turnstile is not configured
      return NextResponse.json({ success: true });
    }

    // Verify token with Cloudflare Turnstile
    const verifyResponse = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: secretKey,
          response: token,
          remoteip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        }),
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Verification failed',
          'error-codes': verifyData['error-codes']
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: 'Verification error' },
      { status: 500 }
    );
  }
}
