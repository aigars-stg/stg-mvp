-- Create saved_listings table
CREATE TABLE saved_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);

-- Create index for faster queries
CREATE INDEX idx_saved_listings_user_id ON saved_listings(user_id);
CREATE INDEX idx_saved_listings_listing_id ON saved_listings(listing_id);
CREATE INDEX idx_saved_listings_saved_at ON saved_listings(saved_at DESC);

-- Enable RLS
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own saved listings
CREATE POLICY "Users can view their own saved listings"
    ON saved_listings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own saved listings
CREATE POLICY "Users can save listings"
    ON saved_listings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own saved listings
CREATE POLICY "Users can delete their saved listings"
    ON saved_listings
    FOR DELETE
    USING (auth.uid() = user_id);

-- Users can update their own saved listings (e.g., notes)
CREATE POLICY "Users can update their saved listings"
    ON saved_listings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_saved_listings_updated_at
    BEFORE UPDATE ON saved_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_saved_listings_updated_at();
