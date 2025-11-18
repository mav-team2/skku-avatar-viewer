import { GameApplication } from './core/GameApplication';

// Configuration - change this to your game server URL
const GAME_SERVER_URL = 'ws://localhost:8080';

// Initialize game application
const game = new GameApplication(GAME_SERVER_URL);

game.init().then(() => {
  console.log('Game initialized successfully');

  // For testing purposes, you can create test avatars and objects
  // Remove these lines when connecting to a real game server
  if (import.meta.env.DEV) {
    // Test avatar creation
    setTimeout(() => {
      game.testCreateAvatar('player1', window.innerWidth / 2, window.innerHeight / 2);
      game.testCreateObject('item1', 200, 200, 'coin');
      game.testCreateObject('item2', 400, 300, 'gem');
    }, 1000);

    // Test avatar movement
    setTimeout(() => {
      game.testMoveAvatar('player1', 200, 200);
    }, 2000);

    // Test object pickup
    setTimeout(() => {
      game.testPickupObject('player1', 'item1');
    }, 4000);
  }
}).catch((error) => {
  console.error('Failed to initialize game:', error);
});

// Hot Module Replacement
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    game.destroy();
  });
}
