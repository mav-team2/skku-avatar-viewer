import { GameApplication } from './core/GameApplication';
import { AdminPanel } from './ui/AdminPanel';
import { easterEggHandler } from './utils/EasterEggHandler';

// Configuration
const GAME_SERVER_URL = 'ws://localhost:8080';

async function main(): Promise<void> {
  console.log('🎮 SKKU Avatar Viewer Starting...');

  // Create game application
  const game = new GameApplication(GAME_SERVER_URL);

  // Initialize the game
  await game.init(document.body);

  // Create admin panel
  const adminPanel = new AdminPanel(game);

  // Setup easter egg to toggle admin panel
  easterEggHandler.onTrigger('admin-panel', () => {
    adminPanel.toggle();
  });

  // Development mode: create test entities
  if (import.meta.env.DEV) {
    console.log('🔧 Development mode enabled');

    // Create a test avatar
    setTimeout(() => {
      game.testCreateAvatar('player1', 200, 300);
      console.log('[Dev] Test avatar created');
    }, 500);

    // Move the test avatar after a delay
    setTimeout(() => {
      game.testMoveAvatar('player1', 500, 400);
      console.log('[Dev] Test avatar moving');
    }, 2000);

    // Create a test object
    setTimeout(() => {
      game.testCreateObject('coin1', 400, 350);
      console.log('[Dev] Test object created');
    }, 1000);

    // Create another avatar
    setTimeout(() => {
      game.testCreateAvatar('player2', 600, 200);
      console.log('[Dev] Second test avatar created');
    }, 1500);

    // Move second avatar
    setTimeout(() => {
      game.testMoveAvatar('player2', 300, 450);
      console.log('[Dev] Second test avatar moving');
    }, 3000);

    // Log hint for admin panel
    console.log('💡 Hint: Press Z and click 3 times to open admin panel');
  }

  // Handle cleanup on page unload
  window.addEventListener('beforeunload', () => {
    adminPanel.destroy();
    game.destroy();
  });

  console.log('✅ SKKU Avatar Viewer Ready');
}

// Start the application
main().catch((error) => {
  console.error('❌ Failed to start application:', error);
});
