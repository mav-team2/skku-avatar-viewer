# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SKKU Avatar Viewer is a real-time 2D multiplayer game viewer built with PixiJS v8, WebSocket, and Protobuf. It displays avatars and game objects that move and interact based on server events.

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

**SpriteManager** (`src/utils/SpriteManager.ts`) is a singleton that handles all sprite operations:

- **URL Format**: Base URL `www.domain.com/avatar_id` auto-expands to three URLs:
  - `www.domain.com/avatar_id/stand`
  - `www.domain.com/avatar_id/walk`
  - `www.domain.com/avatar_id/run`

- **Caching Strategy**:
  - Maintains `spriteCache: Map<baseUrl, SpriteSet>`
  - Tracks in-flight requests via `loadingPromises` to prevent duplicate fetches
  - Multiple entities requesting same sprite URL share the same loading promise

- **Fallback Behavior**:
  1. If sprite URL provided but fails to load → keeps default colored rectangle
  2. If no sprite URL provided → uses default colored rectangle (red for avatars, green for objects)
  3. Individual action sprites can fail independently (e.g., walk loads but run fails)

### WebSocket Communication

**WebSocketManager** (`src/network/WebSocketManager.ts`) handles all network communication:

- Uses event emitter pattern: `on(MessageType, handler)` / `off(MessageType, handler)`
- Automatic reconnection with exponential backoff (5 attempts, 3 second delay)
- Currently sends JSON but designed for Protobuf (see `src/proto/game.proto` for schema)
- Message types: `AVATAR_CREATE`, `AVATAR_MOVE`, `OBJECT_CREATE`, `OBJECT_PICKUP`

### Animation System

Avatars automatically switch animations based on movement state:

- **Stateless Animation Logic** in `Avatar.update()`:
  - Compares current position with target position
  - If distance > 1px → switches to 'walk', sets `isMoving = true`
  - If distance <= 1px → switches to 'stand', sets `isMoving = false`
  - Only triggers texture swap when state changes (not every frame)

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

## Vite Path Aliases

```typescript
'@' → './src'
'@core' → './src/core'
'@entities' → './src/entities'
'@utils' → './src/utils'
'@assets' → './src/assets'
```

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

### Entity Lifecycle
1. Create entity via GameApplication methods (e.g., `createAvatar`)
2. Entity adds itself to `gameContainer` in constructor
3. GameApplication stores entity in Map by ID
4. GameApplication calls `entity.update()` every frame in game loop
5. On removal, call `entity.destroy()` which removes from container and destroys sprite
6. Delete from GameApplication's Map

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

## Common Pitfalls

1. **Don't modify entity collections while iterating**: Use `forEach` for read-only iteration, collect IDs first if deleting
2. **Sprite URLs must use https://**: `SpriteManager.buildSpriteUrl()` automatically prepends protocol
3. **Container hierarchy matters**: All game entities must be added to `gameContainer`, not `app.stage` directly
4. **Texture scale preservation**: When swapping textures, always preserve `sprite.scale` value
5. **Admin panel callbacks bypass WebSocket**: They directly call GameApplication methods, useful for testing

## Performance Considerations

- PixiJS uses WebGL for rendering - avoid excessive sprite creation/destruction
- SpriteManager caching reduces network requests - sprites shared across multiple entities load once
- Game loop runs at display refresh rate (typically 60 FPS) - keep `update()` methods lightweight
- Large sprite sheets not currently used but recommended for production (would require texture atlas support)
