import { redirect } from 'next/navigation';

/**
 * Legacy seller order detail page — redirects to the unified order page.
 * Kept for backward compatibility with bookmarks and cached links.
 */
export default function SellerOrderDetailPage({ params }: { params: { id: string } }) {
  redirect(`/orders/${params.id}`);
}
