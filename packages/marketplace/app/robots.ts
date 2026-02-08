import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/account/',
        '/api/',
        '/admin/',
        '/seller/',
        '/orders/',
        '/my-listings/',
        '/messages/',
        '/cart/',
        '/checkout/',
        '/staff/',
        '/auth/',
        '/offline/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
