import { SupabaseClient } from '@supabase/supabase-js';

interface LogActivityParams {
    supabase: SupabaseClient;
    userId: string;
    ipAddress: string;
    userAgent: string;
    city?: string | null;
    country?: string | null;
}

// Helper to parse user agent
function parseUserAgent(userAgent: string) {
    const ua = userAgent.toLowerCase();

    // Detect device type
    let deviceType = 'desktop';
    if (/mobile|android|iphone|ipad|ipod/i.test(ua)) {
        deviceType = /ipad|tablet/i.test(ua) ? 'tablet' : 'mobile';
    }

    // Detect browser
    let browser = 'Unknown';
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('edg')) browser = 'Edge';
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

    // Detect OS
    let os = 'Unknown';
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

    return { deviceType, browser, os };
}

// Helper to get IP address
export function getClientIP(request: { headers: Headers }): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
        return cfConnectingIP;
    }

    return 'unknown';
}

export async function logLoginActivity({
    supabase,
    userId,
    ipAddress,
    userAgent,
    city = null,
    country = null
}: LogActivityParams) {
    try {
        const { deviceType, browser, os } = parseUserAgent(userAgent);

        const { error } = await supabase
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
