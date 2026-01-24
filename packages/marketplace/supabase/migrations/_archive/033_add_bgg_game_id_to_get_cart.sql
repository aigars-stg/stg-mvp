-- Update get_cart function to include bgg_game_id for linking to game pages
-- This allows cart items to link to /game/[bggId] instead of /listing/[id]

CREATE OR REPLACE FUNCTION get_cart(p_buyer_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(basket_data)
    FROM (
      SELECT json_build_object(
        'basket_id', b.id,
        'seller_id', b.seller_id,
        'seller_name', up.full_name,
        'seller_country', up.country,
        'items', (
          SELECT json_agg(json_build_object(
            'item_id', bi.id,
            'listing_id', bi.listing_id,
            'bgg_game_id', l.bgg_game_id,
            'game_name', l.game_name,
            'price', l.price,
            'photo_url', l.photo_urls[1],
            'condition', l.condition,
            'expires_at', bi.expires_at,
            'is_expired', bi.expires_at < NOW()
          ) ORDER BY bi.created_at)
          FROM basket_items bi
          JOIN listings l ON bi.listing_id = l.id
          WHERE bi.basket_id = b.id
        ),
        'item_count', (SELECT COUNT(*) FROM basket_items WHERE basket_id = b.id),
        'subtotal', (
          SELECT SUM(l.price)
          FROM basket_items bi
          JOIN listings l ON bi.listing_id = l.id
          WHERE bi.basket_id = b.id
        )
      ) AS basket_data
      FROM baskets b
      JOIN user_profiles up ON b.seller_id = up.id
      WHERE b.buyer_id = p_buyer_id
      ORDER BY b.updated_at DESC
    ) AS baskets_query
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_cart IS 'Get full cart contents for a buyer with seller grouping. Includes bgg_game_id for linking to game pages.';
