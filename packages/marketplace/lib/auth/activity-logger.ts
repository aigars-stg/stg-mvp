import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/client';
import { parseUserAgent, getClientIP as getClientIPFromHeaders } from '@/lib/utils/request-helpers';

interface LogActivityParams {
    supabase?: SupabaseClient;
    userId: string;
    ipAddress: string;
    userAgent: string;
    city?: string | null;
    country?: string | null;
    useServiceRole?: boolean;
}

// Re-export getClientIP with the original signature for backwards compatibility
export function getClientIP(request: { headers: Headers }): string {
    return getClientIPFromHeaders(request.headers);
}

export async function logLoginActivity({
    supabase,
    userId,
    ipAddress,
    userAgent,
    city = null,
    country = null,
    useServiceRole = false
}: LogActivityParams) {
    try {
        const { deviceType, browser, os } = parseUserAgent(userAgent);

        // Use service role client to bypass RLS when needed (e.g., after verifyOtp where session isn't set yet)
        const client = useServiceRole ? createServiceClient() : supabase;

        if (!client) {
            console.error('No Supabase client available for logging activity');
            return { success: false, error: new Error('No Supabase client') };
        }

        const { error } = await client
            .from('login_activity')
            .insert({
                user_id: userId,
                ip_address: ipAddress,
                user_agent: userAgent,
                device_type: deviceType,
                browser,
                os,
                country,
                city,
            });

        if (error) {
            console.error('Error logging activity:', error);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('Login activity exception:', error);
        return { success: false, error };
    }
}
