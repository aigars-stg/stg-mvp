async function test() {
  try {
    console.log('Testing expansion search...\n');

    const response = await fetch('http://localhost:3004/api/games/search?q=Wingspan&limit=10');
    const data = await response.json();

    console.log(`Found ${data.count} results:`);
    data.games.forEach((game: any, i: number) => {
      const type = game.is_expansion ? '[EXPANSION]' : '[BASE GAME]';
      console.log(`${i + 1}. ${type} ${game.name} (${game.yearpublished})`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
