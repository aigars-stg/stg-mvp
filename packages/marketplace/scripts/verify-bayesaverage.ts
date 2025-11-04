import * as dotenv from 'dotenv';
import * as path from 'path';

async function main() {
  // Load env
  const envPath = path.join(process.cwd(), '..', '..', '.env.local');
  dotenv.config({ path: envPath });

  const { createServiceClient } = await import('../lib/supabase/client');
  const supabase = createServiceClient();

  console.log('🔍 Verifying bayesaverage field...\n');

  // Get top rated games
  const { data: topGames } = await supabase
    .from('games')
    .select('id, name, bayesaverage')
    .not('bayesaverage', 'is', null)
    .order('bayesaverage', { ascending: false })
    .limit(10);

  console.log('🏆 Top 10 Games by BayesAverage:\n');
  topGames?.forEach((game, idx) => {
    console.log(`   ${idx + 1}. ${game.name} - Rating: ${game.bayesaverage}`);
  });

  // Count games with ratings
  const { count: withRatings } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true })
    .not('bayesaverage', 'is', null);

  const { count: total } = await supabase
    .from('games')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Database Statistics:`);
  console.log(`   Total games: ${total?.toLocaleString()}`);
  console.log(`   With bayesaverage: ${withRatings?.toLocaleString()}`);
  console.log(`   Percentage: ${((withRatings! / total!) * 100).toFixed(1)}%\n`);

  // Sample a popular game
  const { data: sample } = await supabase
    .from('games')
    .select('*')
    .ilike('name', '%Wingspan%')
    .limit(1)
    .single();

  if (sample) {
    console.log('🎯 Sample Game: Wingspan');
    console.log(`   ID: ${sample.id}`);
    console.log(`   Name: ${sample.name}`);
    console.log(`   Year: ${sample.yearpublished}`);
    console.log(`   BayesAverage: ${sample.bayesaverage}`);
    console.log(`   Expansion: ${sample.is_expansion}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
