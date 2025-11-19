# CLI Coding Agent Prompt: SKKU Avatar Web Game Viewer

## 프로젝트 개요

당신은 2D 멀티플레이어 아바타 웹 게임 뷰어를 구현하는 고급 CLI coding agent입니다. 이 프로젝트는 WebSocket을 통해 게임 서버로부터 이벤트를 수신하고, PixiJS를 사용하여 아바타, 오브젝트, NPC를 실시간 렌더링합니다.

---

## Agent Execution Plan

### Phase 1: Project Setup & Core Infrastructure (Priority: Critical)

#### Task 1.1: Initialize Project Structure
```
Action: Create Vite + TypeScript project
Commands:
  - npm create vite@latest . -- --template vanilla-ts
  - npm install pixi.js
  - npm install -D @types/node
Validation: npm run dev succeeds
```

#### Task 1.2: Configure TypeScript for Strict Mode
```
Action: Update tsconfig.json
Requirements:
  - verbatimModuleSyntax: true
  - erasableSyntaxOnly: true (NO enums allowed)
  - strict: true
Pattern: Use const objects with 'as const' instead of enums
```

#### Task 1.3: Setup Path Aliases
```
Action: Configure vite.config.ts
Aliases:
  '@' → './src'
  '@core' → './src/core'
  '@entities' → './src/entities'
  '@utils' → './src/utils'
  '@network' → './src/network'
```

---

### Phase 2: Sprite Asset Management System (Priority: Critical)

#### Task 2.1: Implement SpriteManager Singleton

**핵심 요구사항**: 아바타 스프라이트는 반드시 `www.domain.com/{avatar_id}/{status}` 경로에서 다운로드

```typescript
// src/utils/SpriteManager.ts
import { Assets, Texture } from 'pixi.js';

export type SpriteAction = 'stand' | 'walk' | 'run';

export interface SpriteSet {
  stand?: Texture;
  walk?: Texture;
  run?: Texture;
}

class SpriteManager {
  private static instance: SpriteManager;
  private spriteCache: Map<string, SpriteSet> = new Map();
  private loadingPromises: Map<string, Promise<SpriteSet>> = new Map();

  static getInstance(): SpriteManager {
    if (!SpriteManager.instance) {
      SpriteManager.instance = new SpriteManager();
    }
    return SpriteManager.instance;
  }

  /**
   * 아바타 스프라이트 세트를 로드합니다.
   * URL 형식: www.domain.com/{avatar_id}/{status}
   *
   * @param baseUrl - 아바타 베이스 URL (예: www.domain.com/avatar123)
   * @returns SpriteSet containing stand, walk, run textures
   */
  async loadSpriteSet(baseUrl: string): Promise<SpriteSet> {
    // 캐시된 스프라이트 반환
    if (this.spriteCache.has(baseUrl)) {
      return this.spriteCache.get(baseUrl)!;
    }

    // 이미 로딩 중인 경우 Promise 공유
    if (this.loadingPromises.has(baseUrl)) {
      return this.loadingPromises.get(baseUrl)!;
    }

    const loadPromise = this.loadAllActions(baseUrl);
    this.loadingPromises.set(baseUrl, loadPromise);

    try {
      const spriteSet = await loadPromise;
      this.spriteCache.set(baseUrl, spriteSet);
      return spriteSet;
    } finally {
      this.loadingPromises.delete(baseUrl);
    }
  }

  private async loadAllActions(baseUrl: string): Promise<SpriteSet> {
    const actions: SpriteAction[] = ['stand', 'walk', 'run'];
    const spriteSet: SpriteSet = {};

    // 모든 액션 스프라이트를 병렬로 로드
    const loadPromises = actions.map(async (action) => {
      const url = this.buildSpriteUrl(baseUrl, action);
      try {
        const texture = await Assets.load(url);
        spriteSet[action] = texture;
        console.log(`[SpriteManager] Loaded: ${url}`);
      } catch (error) {
        console.warn(`[SpriteManager] Failed to load ${action}: ${url}`);
        // 개별 액션 실패는 허용 (fallback 사용)
      }
    });

    await Promise.all(loadPromises);
    return spriteSet;
  }

  private buildSpriteUrl(baseUrl: string, action: SpriteAction): string {
    // URL 정규화: www.domain.com/{avatar_id}/{status} 형식
    let normalizedUrl = baseUrl.replace(/\/$/, ''); // 끝 슬래시 제거

    if (!normalizedUrl.startsWith('http')) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    return `${normalizedUrl}/${action}`;
  }

  getActionTexture(spriteSet: SpriteSet, action: SpriteAction): Texture | null {
    return spriteSet[action] ?? null;
  }

  clearCache(): void {
    this.spriteCache.clear();
    this.loadingPromises.clear();
  }
}

export const spriteManager = SpriteManager.getInstance();
```

---

### Phase 3: Avatar Entity with Sprite Animation (Priority: Critical)

#### Task 3.1: Implement Avatar Class with Auto-Animation Switching

**핵심 요구사항**: 아바타 이동 시 2D sprite animation을 PixiJS로 구현

```typescript
// src/entities/Avatar.ts
import { Container, Sprite, Texture, Graphics } from 'pixi.js';
import { spriteManager, type SpriteSet, type SpriteAction } from '../utils/SpriteManager';

export interface AvatarData {
  id: string;
  x: number;
  y: number;
  name?: string;
  spriteUrl?: string;  // www.domain.com/{avatar_id} 형식
}

export class Avatar {
  public readonly id: string;
  public readonly container: Container;

  private sprite: Sprite;
  private spriteSet: SpriteSet | null = null;
  private currentAction: SpriteAction = 'stand';

  // 위치 및 이동 상태
  private currentX: number;
  private currentY: number;
  private targetX: number;
  private targetY: number;
  private isMoving: boolean = false;

  // 애니메이션 설정
  private readonly moveSpeed: number = 0.15;
  private readonly stopThreshold: number = 1;

  constructor(
    data: AvatarData,
    private gameContainer: Container
  ) {
    this.id = data.id;
    this.currentX = data.x;
    this.currentY = data.y;
    this.targetX = data.x;
    this.targetY = data.y;

    // Container 생성
    this.container = new Container();
    this.container.x = data.x;
    this.container.y = data.y;

    // 기본 스프라이트 (플레이스홀더)
    this.sprite = this.createDefaultSprite();
    this.container.addChild(this.sprite);

    // 게임 컨테이너에 추가
    this.gameContainer.addChild(this.container);

    // 스프라이트 URL이 있으면 로드
    if (data.spriteUrl) {
      this.loadSprites(data.spriteUrl);
    }
  }

  private createDefaultSprite(): Sprite {
    const graphics = new Graphics();
    graphics.rect(-16, -48, 32, 48);
    graphics.fill(0xff6b6b);  // 빨간색 아바타

    const texture = this.generateTexture(graphics);
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5, 1);

    return sprite;
  }

  private generateTexture(graphics: Graphics): Texture {
    // PixiJS v8에서는 Application.renderer.generateTexture 사용
    // 여기서는 간단한 구현을 위해 Graphics를 직접 사용
    return Texture.WHITE;  // Placeholder - 실제 구현에서는 renderer 필요
  }

  /**
   * 스프라이트 세트 로드
   * URL 형식: www.domain.com/{avatar_id}
   */
  async loadSprites(baseUrl: string): Promise<void> {
    try {
      this.spriteSet = await spriteManager.loadSpriteSet(baseUrl);

      // stand 텍스처로 초기화
      const standTexture = spriteManager.getActionTexture(this.spriteSet, 'stand');
      if (standTexture) {
        this.updateTexture(standTexture);
      }

      console.log(`[Avatar] Sprites loaded for ${this.id}`);
    } catch (error) {
      console.error(`[Avatar] Failed to load sprites: ${error}`);
    }
  }

  /**
   * 목표 위치로 이동 설정
   */
  moveTo(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * 즉시 위치 변경 (보간 없이)
   */
  setPosition(x: number, y: number): void {
    this.currentX = x;
    this.currentY = y;
    this.targetX = x;
    this.targetY = y;
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * 매 프레임 업데이트 - 이동 보간 및 애니메이션 자동 전환
   */
  update(deltaTime: number): void {
    // 목표까지의 거리 계산
    const dx = this.targetX - this.currentX;
    const dy = this.targetY - this.currentY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 이동 중 여부 확인
    const wasMoving = this.isMoving;
    this.isMoving = distance > this.stopThreshold;

    if (this.isMoving) {
      // 선형 보간으로 부드러운 이동
      const speed = this.moveSpeed * deltaTime;
      this.currentX += dx * speed;
      this.currentY += dy * speed;

      // Container 위치 업데이트
      this.container.x = this.currentX;
      this.container.y = this.currentY;

      // 이동 상태로 전환 → walk 애니메이션
      if (!wasMoving) {
        this.setAction('walk');
      }
    } else {
      // 정지 상태로 전환 → stand 애니메이션
      if (wasMoving) {
        this.setAction('stand');
      }
    }
  }

  /**
   * 수동 애니메이션 변경
   */
  setAction(action: SpriteAction): void {
    if (this.currentAction === action) return;
    if (!this.spriteSet) return;

    const texture = spriteManager.getActionTexture(this.spriteSet, action);
    if (texture) {
      this.currentAction = action;
      this.updateTexture(texture);
      console.log(`[Avatar ${this.id}] Action: ${action}`);
    }
  }

  private updateTexture(texture: Texture): void {
    const previousScale = { x: this.sprite.scale.x, y: this.sprite.scale.y };
    this.sprite.texture = texture;
    this.sprite.scale.set(previousScale.x, previousScale.y);
  }

  /**
   * 스프라이트 방향 전환 (좌/우)
   */
  setDirection(direction: 'left' | 'right'): void {
    this.sprite.scale.x = direction === 'left' ? -Math.abs(this.sprite.scale.x) : Math.abs(this.sprite.scale.x);
  }

  destroy(): void {
    this.container.destroy({ children: true });
    this.gameContainer.removeChild(this.container);
  }

  // Getters
  get x(): number { return this.currentX; }
  get y(): number { return this.currentY; }
  get action(): SpriteAction { return this.currentAction; }
}
```

---

### Phase 4: Frame-based Sprite Animation (Advanced)

#### Task 4.1: AnimatedSprite Support for Multi-frame Animations

```typescript
// src/utils/AnimatedSpriteManager.ts
import { AnimatedSprite, Texture, Assets } from 'pixi.js';

export interface AnimationConfig {
  frameCount: number;
  animationSpeed: number;  // 0.0 ~ 1.0
  loop: boolean;
}

export class AnimatedSpriteManager {
  private static instance: AnimatedSpriteManager;

  static getInstance(): AnimatedSpriteManager {
    if (!AnimatedSpriteManager.instance) {
      AnimatedSpriteManager.instance = new AnimatedSpriteManager();
    }
    return AnimatedSpriteManager.instance;
  }

  /**
   * 프레임 기반 애니메이션 스프라이트 로드
   * URL 형식: www.domain.com/{avatar_id}/{action}/{frame_number}
   *
   * @example
   * loadAnimatedSprite('www.domain.com/avatar1', 'walk', { frameCount: 8, animationSpeed: 0.2, loop: true })
   * → 로드: walk/0, walk/1, walk/2, ... walk/7
   */
  async loadAnimatedSprite(
    baseUrl: string,
    action: string,
    config: AnimationConfig
  ): Promise<AnimatedSprite> {
    const textures: Texture[] = [];

    // 모든 프레임 병렬 로드
    const loadPromises = Array.from({ length: config.frameCount }, async (_, i) => {
      const url = `https://${baseUrl}/${action}/${i}`;
      try {
        const texture = await Assets.load(url);
        return { index: i, texture };
      } catch (error) {
        console.warn(`[AnimatedSprite] Failed to load frame ${i}: ${url}`);
        return null;
      }
    });

    const results = await Promise.all(loadPromises);

    // 순서대로 정렬하여 텍스처 배열 구성
    results
      .filter((r): r is { index: number; texture: Texture } => r !== null)
      .sort((a, b) => a.index - b.index)
      .forEach(r => textures.push(r.texture));

    if (textures.length === 0) {
      throw new Error(`No textures loaded for ${action}`);
    }

    // AnimatedSprite 생성
    const animatedSprite = new AnimatedSprite(textures);
    animatedSprite.animationSpeed = config.animationSpeed;
    animatedSprite.loop = config.loop;
    animatedSprite.anchor.set(0.5, 1);

    return animatedSprite;
  }
}

export const animatedSpriteManager = AnimatedSpriteManager.getInstance();
```

#### Task 4.2: Avatar with Frame Animation Support

```typescript
// src/entities/AnimatedAvatar.ts (확장 버전)
import { Container, AnimatedSprite } from 'pixi.js';
import { animatedSpriteManager, type AnimationConfig } from '../utils/AnimatedSpriteManager';

type AnimationState = 'idle' | 'walk' | 'run' | 'attack';

interface AnimatedAvatarData {
  id: string;
  x: number;
  y: number;
  spriteUrl: string;
  animations: {
    [key in AnimationState]?: AnimationConfig;
  };
}

export class AnimatedAvatar {
  public readonly id: string;
  public readonly container: Container;

  private animations: Map<AnimationState, AnimatedSprite> = new Map();
  private currentState: AnimationState = 'idle';
  private currentSprite: AnimatedSprite | null = null;

  constructor(
    private data: AnimatedAvatarData,
    private gameContainer: Container
  ) {
    this.id = data.id;
    this.container = new Container();
    this.container.position.set(data.x, data.y);
    this.gameContainer.addChild(this.container);

    this.loadAnimations();
  }

  private async loadAnimations(): Promise<void> {
    const loadPromises = Object.entries(this.data.animations).map(
      async ([state, config]) => {
        if (!config) return;

        try {
          const sprite = await animatedSpriteManager.loadAnimatedSprite(
            this.data.spriteUrl,
            state,
            config
          );
          this.animations.set(state as AnimationState, sprite);

          // 첫 번째 애니메이션을 기본으로 설정
          if (!this.currentSprite) {
            this.setAnimation(state as AnimationState);
          }
        } catch (error) {
          console.error(`[AnimatedAvatar] Failed to load ${state}:`, error);
        }
      }
    );

    await Promise.all(loadPromises);
  }

  setAnimation(state: AnimationState): void {
    if (this.currentState === state) return;

    const newSprite = this.animations.get(state);
    if (!newSprite) return;

    // 이전 스프라이트 제거
    if (this.currentSprite) {
      this.currentSprite.stop();
      this.container.removeChild(this.currentSprite);
    }

    // 새 스프라이트 추가 및 재생
    this.currentSprite = newSprite;
    this.container.addChild(this.currentSprite);
    this.currentSprite.play();
    this.currentState = state;
  }

  update(deltaTime: number): void {
    // 이동 로직에 따라 애니메이션 상태 자동 전환
    // 구현은 기본 Avatar 클래스와 유사
  }

  destroy(): void {
    this.animations.forEach(sprite => sprite.destroy());
    this.container.destroy({ children: true });
  }
}
```

---

### Phase 5: Network Communication

#### Task 5.1: WebSocket Manager with Event Handling

```typescript
// src/network/WebSocketManager.ts
export const MessageType = {
  AVATAR_CREATE: 'AVATAR_CREATE',
  AVATAR_MOVE: 'AVATAR_MOVE',
  AVATAR_REMOVE: 'AVATAR_REMOVE',
  OBJECT_CREATE: 'OBJECT_CREATE',
  OBJECT_PICKUP: 'OBJECT_PICKUP',
  NPC_SPAWN: 'NPC_SPAWN',
  NPC_MOVE: 'NPC_MOVE',
  WORLD_TIME: 'WORLD_TIME',
  WORLD_WEATHER: 'WORLD_WEATHER',
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

type MessageHandler = (payload: unknown) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private handlers: Map<MessageType, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(private url: string) {}

  connect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.dispatch(message.type, message.payload);
      } catch (error) {
        console.error('[WebSocket] Parse error:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('[WebSocket] Disconnected');
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocket] Reconnecting... (${this.reconnectAttempts})`);

    setTimeout(() => this.connect(), this.reconnectDelay);
  }

  on(type: MessageType, handler: MessageHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: MessageType, handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  private dispatch(type: MessageType, payload: unknown): void {
    this.handlers.get(type)?.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`[WebSocket] Handler error for ${type}:`, error);
      }
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }
}
```

---

### Phase 6: Main Application Integration

#### Task 6.1: GameApplication Orchestrator

```typescript
// src/core/GameApplication.ts
import { Application, Container } from 'pixi.js';
import { Avatar, type AvatarData } from '../entities/Avatar';
import { WebSocketManager, MessageType } from '../network/WebSocketManager';

export class GameApplication {
  private app: Application;
  private gameContainer: Container;
  private avatars: Map<string, Avatar> = new Map();
  private wsManager: WebSocketManager;

  constructor(wsUrl: string) {
    this.app = new Application();
    this.gameContainer = new Container();
    this.wsManager = new WebSocketManager(wsUrl);
  }

  async init(container: HTMLElement): Promise<void> {
    await this.app.init({
      resizeTo: window,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    });

    container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.gameContainer);

    this.setupWebSocketHandlers();
    this.setupGameLoop();

    this.wsManager.connect();
  }

  private setupWebSocketHandlers(): void {
    // 아바타 생성 - spriteUrl에서 스프라이트 다운로드
    this.wsManager.on(MessageType.AVATAR_CREATE, (payload) => {
      const data = payload as AvatarData;
      this.createAvatar(data);
    });

    // 아바타 이동
    this.wsManager.on(MessageType.AVATAR_MOVE, (payload) => {
      const { id, x, y } = payload as { id: string; x: number; y: number };
      this.moveAvatar(id, x, y);
    });

    // 아바타 제거
    this.wsManager.on(MessageType.AVATAR_REMOVE, (payload) => {
      const { id } = payload as { id: string };
      this.removeAvatar(id);
    });
  }

  private setupGameLoop(): void {
    this.app.ticker.add((ticker) => {
      const deltaTime = ticker.deltaTime;

      // 모든 아바타 업데이트 (이동 보간 + 애니메이션 전환)
      this.avatars.forEach(avatar => avatar.update(deltaTime));
    });
  }

  createAvatar(data: AvatarData): void {
    if (this.avatars.has(data.id)) {
      console.warn(`[Game] Avatar ${data.id} already exists`);
      return;
    }

    const avatar = new Avatar(data, this.gameContainer);
    this.avatars.set(data.id, avatar);
    console.log(`[Game] Avatar created: ${data.id}`);
  }

  moveAvatar(id: string, x: number, y: number): void {
    const avatar = this.avatars.get(id);
    if (avatar) {
      avatar.moveTo(x, y);
    }
  }

  removeAvatar(id: string): void {
    const avatar = this.avatars.get(id);
    if (avatar) {
      avatar.destroy();
      this.avatars.delete(id);
      console.log(`[Game] Avatar removed: ${id}`);
    }
  }

  destroy(): void {
    this.wsManager.disconnect();
    this.avatars.forEach(avatar => avatar.destroy());
    this.avatars.clear();
    this.app.destroy(true);
  }
}
```

---

## Implementation Checklist for Coding Agent

### Priority 1: Core Systems (Must Complete First)
- [ ] Project setup with Vite + TypeScript strict mode
- [ ] SpriteManager singleton with URL pattern `www.domain.com/{avatar_id}/{status}`
- [ ] Avatar class with automatic animation switching (stand ↔ walk)
- [ ] WebSocketManager with event handling

### Priority 2: Integration (Complete After Core)
- [ ] GameApplication orchestrator
- [ ] Full-screen canvas setup
- [ ] Game loop with deltaTime-based updates
- [ ] WebSocket message routing to entity methods

### Priority 3: Advanced Features (Optional)
- [ ] AnimatedSprite support for frame-based animations
- [ ] Direction-based sprite flipping
- [ ] NPC and GameObject entities
- [ ] World effects (time, weather)

### Priority 4: Polish (Final Phase)
- [ ] Admin panel for testing (Z + 3 clicks)
- [ ] Connection status UI
- [ ] Error handling and fallbacks
- [ ] Performance optimization

---

## Validation Criteria

### Build Check
```bash
npm run build
# Must complete without TypeScript errors
```

### Runtime Check
1. Canvas renders full-screen
2. WebSocket connects to server
3. Avatar sprites load from `www.domain.com/{avatar_id}/{status}`
4. Avatars animate correctly:
   - `stand` when stationary
   - `walk` when moving
5. Movement interpolation is smooth

### Code Quality
- No TypeScript enums (use const objects)
- Type-only imports where required
- Singleton pattern for managers
- Clean entity lifecycle (create → update → destroy)

---

## Agent Execution Commands

```bash
# 1. Initialize
npm install

# 2. Development
npm run dev

# 3. Validate
npm run build

# 4. Test avatar sprite loading
# Open browser console, create avatar with spriteUrl
```

---

## Notes for Coding Agent

1. **TypeScript Strict Mode**: This project uses `verbatimModuleSyntax` and `erasableSyntaxOnly`. Always use `const` objects instead of `enum` and add `type` keyword for type-only imports.

2. **Sprite URL Pattern**: The URL `www.domain.com/{avatar_id}` automatically expands to:
   - `www.domain.com/{avatar_id}/stand`
   - `www.domain.com/{avatar_id}/walk`
   - `www.domain.com/{avatar_id}/run`

3. **Animation System**: Avatar animation switching is automatic based on movement state. The `update()` method checks distance to target and switches between `stand` and `walk`.

4. **Caching**: SpriteManager caches loaded sprites to prevent duplicate network requests. Multiple avatars sharing the same base URL will use the same cached textures.

5. **Error Handling**: Always implement graceful fallbacks. If sprite loading fails, use default colored rectangles.

6. **Game Loop**: Use `app.ticker.add()` for the game loop. All entity updates must be frame-rate independent using `deltaTime`.
