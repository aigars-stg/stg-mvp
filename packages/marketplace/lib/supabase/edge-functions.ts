/**
 * Helper for calling Supabase Edge Functions from Next.js API routes.
 * Uses the service role key for authorization.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function callEdgeFunction(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`[EdgeFunction] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY`);
    return { success: false, error: 'Missing configuration' };
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/${functionName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(`[EdgeFunction] ${functionName} failed (${response.status}):`, text);
      return { success: false, error: text };
    }

    return { success: true };
  } catch (error) {
    console.error(`[EdgeFunction] ${functionName} error:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
