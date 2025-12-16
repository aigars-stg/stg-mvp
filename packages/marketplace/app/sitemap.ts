import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.secondturn.games'

    // 1. Core Static Pages
    const routes = [
        '',
        '/browse',
        '/sell',
        '/privacy',
        // '/how-it-works', // TODO: Add this page when it is implemented
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 1,
    }))

    // 2. Dynamic Listings (Placeholder for future integration)
    // const listings = await getActiveListings() 
    // Map listings to sitemap format...

    return [...routes]
}
