# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SKKU Avatar Viewer is a real-time 2D multiplayer game viewer built with PixiJS v8, WebSocket, and Protobuf. It displays sprite-based avatars and game objects that move and interact based on server events. The project uses async factory patterns for entity creation and supports dynamic sprite loading with automatic fallback to local assets.

## Development Commands

```bash
npm run dev      # Start development server (port 3000, auto-opens browser)
npm run build    # Type check with tsc, then build with vite
npm run preview  # Preview production build locally
```

## Architecture

### Core Game Loop Pattern

The application follows a centralized game loop architecture:

1. **GameApplication** (`src/core/GameApplication.ts`) - Central orchestrator
   - Initializes PixiJS renderer and manages the game container
   - Owns all entity collections: `Map<string, Avatar>` and `Map<string, GameObject>`
   - Subscribes to WebSocket events and dispatches to entity methods
   - Runs the game loop via `app.ticker.add()` which calls `update(deltaTime)` on all avatars

2. **Entity Management** - Each entity is responsible for its own sprite and state
   - Entities receive a `Container` reference in constructor and manage their own `addChild/removeChild`
   - Entities never access GameApplication directly - all communication is one-way (GameApplication → Entity)
   - `Avatar.update(deltaTime)` handles smooth interpolation movement and automatic animation switching

3. **Message Flow**: WebSocket → GameApplication → Entity Methods
   ```
   Server Event → WebSocketManager.on(MessageType)
                → GameApplication.createAvatar/moveAvatar/etc
                → Avatar/GameObject methods
   ```

### Sprite Loading System

**SpriteManager** (`src/js/utils/SpriteManager.ts`) is a singleton that handles all sprite operations:

- **URL Format**: Base URL `www.domain.com/avatar_id` auto-expands to three URLs:
  - `www.domain.com/avatar_id/stand` → mapped to `Idle.png` for local assets
  - `www.domain.com/avatar_id/walk` → mapped to `Walk.png` for local assets
  - `www.domain.com/avatar_id/run` → reuses `Walk.png` with faster animation speed

- **Dynamic Frame Extraction**:
  - Automatically calculates frame count from sprite sheet dimensions
  - Assumes square frames: `frameWidth = frameHeight = texture.height`
  - Example: 1536x128 image = 12 frames (128x128 each), 1152x128 = 9 frames
  - Uses PixiJS `Rectangle` to extract individual frames from sprite sheets

- **Caching Strategy**:
  - Maintains `spriteCache: Map<baseUrl, SpriteSet>`
  - Tracks in-flight requests via `loadingPromises` to prevent duplicate fetches
  - Multiple entities requesting same sprite URL share the same loading promise

- **Fallback Behavior**:
  1. Server sprite fails → automatically falls back to `/assets/avatars/default/`
  2. Default sprites: `Idle.png` (9 frames), `Walk.png` (12 frames)
  3. Individual action sprites can fail independently while others succeed

### WebSocket Communication

**WebSocketManager** (`src/network/WebSocketManager.ts`) handles all network communication:

- Uses event emitter pattern: `on(MessageType, handler)` / `off(MessageType, handler)`
- Automatic reconnection with exponential backoff (5 attempts, 3 second delay)
- Currently sends JSON but designed for Protobuf (see `src/proto/game.proto` for schema)
- Message types: `AVATAR_CREATE`, `AVATAR_MOVE`, `OBJECT_CREATE`, `OBJECT_PICKUP`

### Animation System

Avatars automatically switch animations based on movement state:

- **Constant Speed Movement** in `Avatar.update()`:
  - Uses normalized direction vectors for consistent movement speed (2 pixels/frame at 60fps)
  - Distance-based interpolation: `dirX = dx / distance; moveDistance = moveSpeed * deltaTime`
  - Prevents overshooting: stops exactly at target position
  - Auto-switches animation: distance > 1px → 'walk', distance ≤ 1px → 'stand'

- **Animation Speeds** (at 60fps):
  - Idle: `animationSpeed = 0.15` (~2.7 seconds for 9 frames)
  - Walk: `animationSpeed = 0.2` (~3 seconds for 12 frames)
  - Run: `animationSpeed = 0.3` (faster)

- Manual animation control via `setAction(action: SpriteAction)` for custom behaviors

## TypeScript Configuration

- **Strict Mode Enabled**: `verbatimModuleSyntax: true`, `erasableSyntaxOnly: true`
- **Type-only imports required**: Use `type` keyword when importing types
  ```typescript
  import { Avatar, type AvatarData } from '../entities/Avatar';
  ```
- **No enums**: Use const objects with `as const` instead
  ```typescript
  export const MessageType = { ... } as const;
  export type MessageType = typeof MessageType[keyof typeof MessageType];
  ```
- **No parameter properties**: Cannot use `private` in constructor parameters
  ```typescript
  // Wrong - erasableSyntaxOnly error
  constructor(private game: GameApplication) {}

  // Correct
  private game: GameApplication;
  constructor(game: GameApplication) {
    this.game = game;
  }
  ```

## Vite Path Aliases

```typescript
'@' → './src'
'@core' → './src/core'
'@entities' → './src/entities'
'@utils' → './src/utils'
'@assets' → './src/assets'
```

## Default Sprite Assets

Located in `public/assets/avatars/default/`:

- **Idle.png**: 1152x128 (9 frames of 128x128 each) - Idle/standing animation
- **Walk.png**: 1536x128 (12 frames of 128x128 each) - Walking animation

These are used as fallback when:
1. No `spriteUrl` is provided in `AvatarData`
2. Server sprite URL fails to load

Action mapping for local assets:
- `'stand'` → `'Idle.png'`
- `'walk'` → `'Walk.png'`
- `'run'` → `'Walk.png'` (reused with faster animation speed)

## Testing & Debugging

### Admin Panel (Easter Egg)

Press `Z` and click 3 times within 2 seconds to toggle the admin panel:
- Create avatars/objects with optional sprite URLs
- Test movement and pickup interactions
- No WebSocket server required

### Development Mode

In `src/main.ts`, test code runs automatically when `import.meta.env.DEV`:
```typescript
game.testCreateAvatar('player1', x, y);
game.testMoveAvatar('player1', newX, newY);
```

### WebSocket Server Configuration

Change `GAME_SERVER_URL` in `src/main.ts` to point to your game server (defaults to `ws://localhost:8080`)

## Important Patterns

### Async Factory Pattern for Entity Creation

**CRITICAL**: Entities use static factory methods instead of public constructors to ensure sprites are fully loaded before creation:

```typescript
// Avatar and GameObject have PRIVATE constructors
private constructor(data, gameContainer) { ... }

// Use static async factory method
static async create(data, gameContainer): Promise<Avatar> {
  const avatar = new Avatar(data, gameContainer);
  await avatar.loadSprites(spriteUrl);  // Pre-load sprites
  return avatar;
}
```

**Why**: Prevents the "large sprite flash" bug where unscaled textures briefly appear before scaling is applied.

**GameApplication usage**:
```typescript
async createAvatar(data: AvatarData): Promise<void> {
  const avatar = await Avatar.create(data, this.gameContainer);
  this.avatars.set(data.id, avatar);
}

async createObject(data: GameObjectData): Promise<void> {
  const gameObject = await GameObject.create(data, this.gameContainer);
  this.gameObjects.set(data.id, gameObject);
}
```

### Matrix Scale Application

Scale is applied ONCE at sprite creation, not on every animation change:

```typescript
// In loadSprites() - ONE TIME ONLY
const finalScale = (desiredSize / originalWidth) * avatarScale;
sprite.scale.set(finalScale, finalScale);

// In playAnimation() - PRESERVE scale
const currentScale = sprite.scale;  // Save scale
sprite.textures = newTextures;       // Change animation
sprite.scale.set(currentScale);      // Restore scale
```

**Avatar Scale**: Default 1.5x (configurable via `AvatarData.scale`)
**GameObject Scale**: Default 1.0x (configurable via `GameObjectData.scale`)
**GameObject Rotation**: Configurable via `GameObjectData.rotation` (radians)

### Entity Lifecycle
1. Create entity via async factory: `await Avatar.create(data, gameContainer)`
2. Entity constructor is private, adds container to `gameContainer`
3. Factory method pre-loads sprites before returning entity
4. GameApplication stores entity in Map by ID
5. GameApplication calls `entity.update()` every frame in game loop (avatars only)
6. On removal, call `entity.destroy()` which removes from container and destroys sprite
7. Delete from GameApplication's Map

### Adding New Message Types
1. Add to `MessageType` const in `src/network/WebSocketManager.ts`
2. Define message interface in `src/proto/game.proto`
3. Add handler in `GameApplication.setupWebSocketHandlers()`
4. Implement corresponding method in GameApplication
5. Update Protobuf schema and ProtobufHandler if using binary protocol

### Sprite URL Validation

When adding sprite URLs, format must be:
- **Avatar**: `www.domain.com/{avatar_id}` (no trailing slash, no action suffix)
- **Object**: Full URL to image file `www.domain.com/objects/coin.png`

SpriteManager automatically appends `/stand`, `/walk`, `/run` for avatars.

### GameObject Features

GameObjects support additional transformation properties:

```typescript
interface GameObjectData {
  scale?: number;      // Default 1.0, applied at creation
  rotation?: number;   // Radians, default 0
}

// Dynamic control
gameObject.setRotation(Math.PI / 4);     // Set rotation in radians
gameObject.setRotationDegrees(45);        // Set rotation in degrees
console.log(gameObject.rotation);         // Get in radians
console.log(gameObject.rotationDegrees);  // Get in degrees
```

## Common Pitfalls

1. **Never use `new Avatar()` or `new GameObject()` directly**: Always use `await Avatar.create()` or `await GameObject.create()` - constructors are private
2. **Don't modify entity collections while iterating**: Use `forEach` for read-only iteration, collect IDs first if deleting
3. **Sprite sheet frame calculation**: Assumes square frames where `frameWidth = texture.height`. Non-square frames won't work correctly
4. **Container hierarchy matters**: All game entities must be added to `gameContainer`, not `app.stage` directly
5. **Texture scale preservation**: When swapping textures in `playAnimation()`, always preserve `sprite.scale` value
6. **Admin panel callbacks bypass WebSocket**: They directly call GameApplication methods, useful for testing
7. **GameObject rotation uses radians**: Use `Math.PI / 180 * degrees` to convert, or use `setRotationDegrees()` helper

## Performance Considerations

- PixiJS uses WebGL for rendering - avoid excessive sprite creation/destruction
- SpriteManager caching reduces network requests - sprites shared across multiple entities load once
- Game loop runs at display refresh rate (typically 60 FPS) - keep `update()` methods lightweight
- Large sprite sheets not currently used but recommended for production (would require texture atlas support)
