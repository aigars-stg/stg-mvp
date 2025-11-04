-- Add bayesaverage column to games table
-- Bayesian average is a more reliable rating metric that accounts for number of ratings

ALTER TABLE games ADD COLUMN IF NOT EXISTS bayesaverage DECIMAL(5,3);

-- Add index for sorting/filtering by rating
CREATE INDEX IF NOT EXISTS idx_games_bayesaverage ON games(bayesaverage DESC NULLS LAST);

-- Comment for documentation
COMMENT ON COLUMN games.bayesaverage IS 'Bayesian average rating from BGG (more reliable than simple average)';
