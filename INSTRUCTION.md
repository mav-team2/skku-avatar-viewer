# Map View Client 시스템 설계 문서

## 1. 프로젝트 개요

### 1.1 역할 및 목적

Map View Client는 멀티플레이어 2D 아바타 웹 게임의 렌더링 클라이언트입니다. 게임 서버로부터 WebSocket을 통해 게임 상태 이벤트를 수신하고, PixiJS를 사용하여 2D 맵 위에 아바타, 오브젝트, NPC를 실시간으로 렌더링합니다.

### 1.2 주요 기능

- 게임 서버와 WebSocket 연결 유지 (receive-only)
- 실시간 엔티티 렌더링 (아바타, 오브젝트, NPC)
- 부드러운 이동 애니메이션 (보간 처리)
- 월드 효과 표현 (색감 후처리)
- 연결 끊김 시 자동 재연결

### 1.3 기술 스택

- **Build Tool**: Vite
- **Language**: TypeScript
- **Framework**: Vanilla JS (no React/Vue)
- **Rendering**: PixiJS v8
- **Communication**: Native WebSocket API

---

## 2. 프로젝트 구조

```
skku-avatar-viewer/
├── public/
│   └── assets/
│       ├── sprites/
│       │   ├── avatars/
│       │   ├── objects/
│       │   └── npcs/
│       └── maps/
├── src/
│   ├── main.ts                    # 애플리케이션 진입점
│   ├── config/
│   │   └── constants.ts           # 상수 정의
│   ├── types/
│   │   ├── events.ts              # 이벤트 타입 정의
│   │   └── entities.ts            # 엔티티 타입 정의
│   ├── network/
│   │   ├── websocket-manager.ts   # WebSocket 연결 관리
│   │   └── event-dispatcher.ts    # 이벤트 분배 시스템
│   ├── engine/
│   │   ├── game-renderer.ts       # PixiJS 렌더링 엔진
│   │   └── entity-manager.ts      # 엔티티 상태 관리
│   ├── entities/
│   │   ├── base-entity.ts         # 엔티티 기본 클래스
│   │   ├── avatar.ts              # 아바타 엔티티
│   │   ├── game-object.ts         # 게임 오브젝트 엔티티
│   │   └── npc.ts                 # NPC 엔티티
│   └── utils/
│       ├── interpolation.ts       # 이동 보간 유틸리티
│       └── sprite-loader.ts       # 스프라이트 로딩 유틸리티
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 3. TypeScript 인터페이스

### 3.1 이벤트 타입 정의 (`src/types/events.ts`)

```typescript
// 기본 이벤트 구조
export interface GameEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp: string;
}

// 위치 정보
export interface Position {
  x: number;
  y: number;
}

// 이벤트 타입 열거형
export enum EventType {
  // Avatar events
  AVATAR_CREATED = "avatar.created",
  AVATAR_MOVED = "avatar.moved",
  AVATAR_REMOVED = "avatar.removed",

  // Object events
  OBJECT_CREATED = "object.created",
  OBJECT_ACQUIRED = "object.acquired",
  OBJECT_REMOVED = "object.removed",

  // NPC events
  NPC_SPAWNED = "npc.spawned",
  NPC_MOVED = "npc.moved",
  NPC_REMOVED = "npc.removed",

  // World events
  WORLD_TIME_CHANGED = "world.time_changed",
  WORLD_WEATHER_CHANGED = "world.weather_changed",
}

// Avatar 이벤트 페이로드
export interface AvatarCreatedPayload {
  avatar_id: string;
  position: Position;
  sprite: string;
}

export interface AvatarMovedPayload {
  avatar_id: string;
  position: Position;
  direction: "up" | "down" | "left" | "right";
}

export interface AvatarRemovedPayload {
  avatar_id: string;
}

// Object 이벤트 페이로드
export interface ObjectCreatedPayload {
  object_id: string;
  object_type: string;
  position: Position;
  sprite: string;
}

export interface ObjectAcquiredPayload {
  avatar_id: string;
  object_id: string;
  object_type: string;
}

export interface ObjectRemovedPayload {
  object_id: string;
}

// NPC 이벤트 페이로드
export interface NpcSpawnedPayload {
  npc_id: string;
  position: Position;
  npc_type: string;
  sprite: string;
}

export interface NpcMovedPayload {
  object_id: string;
  position: Position;
}

export interface NpcRemovedPayload {
  npc_id: string;
}

// World 이벤트 페이로드
export interface WorldTimeChangedPayload {
  game_time: string;
  tick: number;
}

export type WeatherType = "sunny" | "rainy" | "cloudy";

export interface WorldWeatherChangedPayload {
  weather: WeatherType;
}

// 이벤트 핸들러 타입
export type EventHandler<T = unknown> = (payload: T) => void;

// 이벤트 맵 타입
export interface EventPayloadMap {
  [EventType.AVATAR_CREATED]: AvatarCreatedPayload;
  [EventType.AVATAR_MOVED]: AvatarMovedPayload;
  [EventType.AVATAR_REMOVED]: AvatarRemovedPayload;
  [EventType.OBJECT_CREATED]: ObjectCreatedPayload;
  [EventType.OBJECT_ACQUIRED]: ObjectAcquiredPayload;
  [EventType.OBJECT_REMOVED]: ObjectRemovedPayload;
  [EventType.NPC_SPAWNED]: NpcSpawnedPayload;
  [EventType.NPC_MOVED]: NpcMovedPayload;
  [EventType.NPC_REMOVED]: NpcRemovedPayload;
  [EventType.WORLD_TIME_CHANGED]: WorldTimeChangedPayload;
  [EventType.WORLD_WEATHER_CHANGED]: WorldWeatherChangedPayload;
}
```

### 3.2 엔티티 타입 정의 (`src/types/entities.ts`)

```typescript
import { Container, Sprite } from "pixi.js";
import { Position } from "./events";

// 엔티티 기본 인터페이스
export interface IEntity {
  id: string;
  position: Position;
  targetPosition: Position;
  sprite: string;
  container: Container;

  update(deltaTime: number): void;
  destroy(): void;
}

// 아바타 인터페이스
export interface IAvatar extends IEntity {
  direction: string;
}

// 게임 오브젝트 인터페이스
export interface IGameObject extends IEntity {
  objectType: string;
  isAcquired: boolean;
}

// NPC 인터페이스
export interface INpc extends IEntity {
  npcType: string;
}

// 엔티티 상태 저장소
export interface EntityStore {
  avatars: Map<string, IAvatar>;
  objects: Map<string, IGameObject>;
  npcs: Map<string, INpc>;
}
```

---

## 4. 아키텍처 설계

### 4.1 컴포넌트 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                      main.ts                            │
│                   (Application Entry)                   │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────────┐     ┌───────────────────┐
│ WebSocketManager  │     │   GameRenderer    │
│ (network/)        │     │   (engine/)       │
└────────┬──────────┘     └────────┬──────────┘
         │                         │
         ▼                         ▼
┌───────────────────┐     ┌───────────────────┐
│ EventDispatcher   │────▶│  EntityManager    │
│ (network/)        │     │  (engine/)        │
└───────────────────┘     └────────┬──────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │  Avatar  │  │GameObject│  │   NPC    │
              │(entities)│  │(entities)│  │(entities)│
              └──────────┘  └──────────┘  └──────────┘
```

### 4.2 데이터 흐름

```
Server → WebSocket → EventDispatcher → EntityManager → GameRenderer → Screen
```

### 4.3 컴포넌트 책임

| 컴포넌트             | 책임                                            |
| -------------------- | ----------------------------------------------- |
| **WebSocketManager** | 서버 연결 관리, 재연결 로직, ping/pong 처리     |
| **EventDispatcher**  | 이벤트 파싱, 핸들러 등록/호출, 타입 안전성 보장 |
| **EntityManager**    | 엔티티 생성/삭제/업데이트, 상태 저장소 관리     |
| **GameRenderer**     | PixiJS 초기화, 렌더링 루프, 레이어 관리         |
| **Entity Classes**   | 개별 엔티티 로직, 스프라이트 관리, 보간 처리    |

---

## 5. 구현 계획

### Phase 1: 프로젝트 설정 및 기본 렌더링 (1-2일)

#### Task 1.1: Vite + TypeScript 프로젝트 초기화

```bash
npm create vite@latest skku-avatar-mapview -- --template vanilla-ts
cd skku-avatar-mapview
npm install
```

#### Task 1.2: 의존성 설치

```bash
npm install pixi.js
npm install -D @types/node
```

#### Task 1.3: 상수 정의 (`src/config/constants.ts`)

```typescript
export const CONFIG = {
  // Map configuration
  MAP_WIDTH: 800,
  MAP_HEIGHT: 600,

  // WebSocket configuration
  WS_HOST: "localhost",
  WS_PORT: 8000,
  WS_RECONNECT_INTERVAL: 3000,
  WS_MAX_RECONNECT_ATTEMPTS: 5,

  // Rendering configuration
  INTERPOLATION_SPEED: 0.15,
  TARGET_FPS: 60,

  // Layer z-index
  LAYERS: {
    BACKGROUND: 0,
    OBJECTS: 1,
    NPCS: 2,
    AVATARS: 3,
    EFFECTS: 4,
    UI: 5,
  },
} as const;
```

#### Task 1.4: PixiJS 애플리케이션 초기화 (`src/engine/game-renderer.ts`)

```typescript
import { Application, Container } from "pixi.js";
import { CONFIG } from "../config/constants";

export class GameRenderer {
  private app: Application;
  private layers: Map<number, Container> = new Map();

  constructor() {
    this.app = new Application();
  }

  async initialize(container: HTMLElement): Promise<void> {
    await this.app.init({
      width: CONFIG.MAP_WIDTH,
      height: CONFIG.MAP_HEIGHT,
      backgroundColor: 0x1a1a2e,
      antialias: true,
    });

    container.appendChild(this.app.canvas);
    this.setupLayers();
  }

  private setupLayers(): void {
    Object.values(CONFIG.LAYERS).forEach((zIndex) => {
      const layer = new Container();
      layer.zIndex = zIndex;
      this.layers.set(zIndex, layer);
      this.app.stage.addChild(layer);
    });

    this.app.stage.sortableChildren = true;
  }

  getLayer(zIndex: number): Container {
    const layer = this.layers.get(zIndex);
    if (!layer) {
      throw new Error(`Layer with zIndex ${zIndex} not found`);
    }
    return layer;
  }

  addToLayer(zIndex: number, child: Container): void {
    this.getLayer(zIndex).addChild(child);
  }

  removeFromLayer(zIndex: number, child: Container): void {
    this.getLayer(zIndex).removeChild(child);
  }

  get ticker() {
    return this.app.ticker;
  }

  destroy(): void {
    this.app.destroy(true);
  }
}

// 싱글톤 인스턴스
export const gameRenderer = new GameRenderer();
```

#### Task 1.5: 기본 진입점 설정 (`src/main.ts`)

```typescript
import { gameRenderer } from "./engine/game-renderer";

async function main() {
  const appContainer = document.getElementById("app");
  if (!appContainer) {
    throw new Error("App container not found");
  }

  await gameRenderer.initialize(appContainer);
  console.log("[MapView] Renderer initialized");

  // 렌더링 루프
  gameRenderer.ticker.add((ticker) => {
    // 엔티티 업데이트 로직은 Phase 3에서 추가
  });
}

main().catch(console.error);
```

---

### Phase 2: WebSocket 연결 및 이벤트 처리 (2-3일)

#### Task 2.1: WebSocket 매니저 구현 (`src/network/websocket-manager.ts`)

```typescript
import { CONFIG } from "../config/constants";

type ConnectionCallback = () => void;
type MessageCallback = (data: unknown) => void;
type ErrorCallback = (error: Event) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private viewerId: string;
  private reconnectAttempts: number = 0;
  private isIntentionalClose: boolean = false;

  private onConnectCallbacks: ConnectionCallback[] = [];
  private onDisconnectCallbacks: ConnectionCallback[] = [];
  private onMessageCallbacks: MessageCallback[] = [];
  private onErrorCallbacks: ErrorCallback[] = [];

  constructor() {
    this.viewerId = this.generateViewerId();
  }

  private generateViewerId(): string {
    return `viewer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  connect(): void {
    const url = `ws://${CONFIG.WS_HOST}:${CONFIG.WS_PORT}/ws/mapview?viewer_id=${this.viewerId}`;

    console.log(`[WebSocket] Connecting to ${url}`);
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("[WebSocket] Connected");
      this.reconnectAttempts = 0;
      this.onConnectCallbacks.forEach((cb) => cb());
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.onMessageCallbacks.forEach((cb) => cb(data));
      } catch (error) {
        console.error("[WebSocket] Failed to parse message:", error);
      }
    };

    this.ws.onclose = () => {
      console.log("[WebSocket] Disconnected");
      this.onDisconnectCallbacks.forEach((cb) => cb());

      if (!this.isIntentionalClose) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error("[WebSocket] Error:", error);
      this.onErrorCallbacks.forEach((cb) => cb(error));
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
      console.error("[WebSocket] Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[WebSocket] Reconnecting... (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      this.connect();
    }, CONFIG.WS_RECONNECT_INTERVAL);
  }

  disconnect(): void {
    this.isIntentionalClose = true;
    this.ws?.close();
    this.ws = null;
  }

  onConnect(callback: ConnectionCallback): void {
    this.onConnectCallbacks.push(callback);
  }

  onDisconnect(callback: ConnectionCallback): void {
    this.onDisconnectCallbacks.push(callback);
  }

  onMessage(callback: MessageCallback): void {
    this.onMessageCallbacks.push(callback);
  }

  onError(callback: ErrorCallback): void {
    this.onErrorCallbacks.push(callback);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// 싱글톤 인스턴스
export const webSocketManager = new WebSocketManager();
```

#### Task 2.2: 이벤트 디스패처 구현 (`src/network/event-dispatcher.ts`)

```typescript
import {
  GameEvent,
  EventType,
  EventHandler,
  EventPayloadMap,
} from "../types/events";

export class EventDispatcher {
  private handlers: Map<string, EventHandler[]> = new Map();

  on<T extends EventType>(
    eventType: T,
    handler: EventHandler<EventPayloadMap[T]>
  ): void {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(handler as EventHandler);
    this.handlers.set(eventType, handlers);
  }

  off<T extends EventType>(
    eventType: T,
    handler: EventHandler<EventPayloadMap[T]>
  ): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler as EventHandler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  dispatch(event: GameEvent): void {
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event.payload);
        } catch (error) {
          console.error(
            `[EventDispatcher] Error in handler for ${event.type}:`,
            error
          );
        }
      });
    } else {
      console.warn(
        `[EventDispatcher] No handlers for event type: ${event.type}`
      );
    }
  }

  handleMessage(data: unknown): void {
    if (this.isGameEvent(data)) {
      this.dispatch(data);
    } else {
      console.warn("[EventDispatcher] Invalid event format:", data);
    }
  }

  private isGameEvent(data: unknown): data is GameEvent {
    return (
      typeof data === "object" &&
      data !== null &&
      "type" in data &&
      "payload" in data &&
      "timestamp" in data
    );
  }
}

// 싱글톤 인스턴스
export const eventDispatcher = new EventDispatcher();
```

#### Task 2.3: main.ts에 WebSocket 연결 통합

```typescript
import { gameRenderer } from "./engine/game-renderer";
import { webSocketManager } from "./network/websocket-manager";
import { eventDispatcher } from "./network/event-dispatcher";

async function main() {
  const appContainer = document.getElementById("app");
  if (!appContainer) {
    throw new Error("App container not found");
  }

  // 렌더러 초기화
  await gameRenderer.initialize(appContainer);
  console.log("[MapView] Renderer initialized");

  // WebSocket 이벤트 설정
  webSocketManager.onConnect(() => {
    console.log("[MapView] Connected to server");
  });

  webSocketManager.onDisconnect(() => {
    console.log("[MapView] Disconnected from server");
  });

  webSocketManager.onMessage((data) => {
    eventDispatcher.handleMessage(data);
  });

  // 서버 연결
  webSocketManager.connect();

  // 렌더링 루프
  gameRenderer.ticker.add((ticker) => {
    // 엔티티 업데이트 로직
  });
}

main().catch(console.error);
```

---

### Phase 3: 엔티티 관리 시스템 (2-3일)

#### Task 3.1: 기본 엔티티 클래스 (`src/entities/base-entity.ts`)

```typescript
import { Container, Sprite, Assets } from "pixi.js";
import { Position } from "../types/events";
import { IEntity } from "../types/entities";
import { CONFIG } from "../config/constants";

export abstract class BaseEntity implements IEntity {
  public id: string;
  public position: Position;
  public targetPosition: Position;
  public sprite: string;
  public container: Container;

  protected spriteInstance: Sprite | null = null;

  constructor(id: string, position: Position, sprite: string) {
    this.id = id;
    this.position = { ...position };
    this.targetPosition = { ...position };
    this.sprite = sprite;
    this.container = new Container();

    this.container.x = position.x;
    this.container.y = position.y;
  }

  async loadSprite(path: string): Promise<void> {
    try {
      const texture = await Assets.load(path);
      this.spriteInstance = new Sprite(texture);
      this.spriteInstance.anchor.set(0.5, 1);
      this.container.addChild(this.spriteInstance);
    } catch (error) {
      console.error(`[Entity] Failed to load sprite: ${path}`, error);
      this.createPlaceholder();
    }
  }

  protected createPlaceholder(): void {
    // 스프라이트 로드 실패 시 플레이스홀더 생성
    const graphics = new PIXI.Graphics();
    graphics.rect(-16, -32, 32, 32);
    graphics.fill(0xff00ff);
    this.container.addChild(graphics);
  }

  moveTo(position: Position): void {
    this.targetPosition = { ...position };
  }

  update(deltaTime: number): void {
    // 선형 보간으로 부드러운 이동
    const speed = CONFIG.INTERPOLATION_SPEED * deltaTime;

    this.position.x += (this.targetPosition.x - this.position.x) * speed;
    this.position.y += (this.targetPosition.y - this.position.y) * speed;

    this.container.x = this.position.x;
    this.container.y = this.position.y;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

#### Task 3.2: 아바타 엔티티 (`src/entities/avatar.ts`)

```typescript
import { BaseEntity } from "./base-entity";
import { Position } from "../types/events";
import { IAvatar } from "../types/entities";

export class Avatar extends BaseEntity implements IAvatar {
  public direction: string = "down";

  constructor(id: string, position: Position, sprite: string) {
    super(id, position, sprite);
    this.loadSprite(`/assets/sprites/avatars/${sprite}.png`);
  }

  setDirection(direction: string): void {
    this.direction = direction;
    // 방향에 따른 스프라이트 변경 로직
    this.updateSpriteDirection();
  }

  private updateSpriteDirection(): void {
    if (this.spriteInstance) {
      // 방향에 따라 스프라이트 플립 또는 텍스처 변경
      switch (this.direction) {
        case "left":
          this.spriteInstance.scale.x = -1;
          break;
        case "right":
          this.spriteInstance.scale.x = 1;
          break;
      }
    }
  }

  override update(deltaTime: number): void {
    super.update(deltaTime);
    // 아바타 특화 업데이트 로직 (예: 발자국 효과)
  }
}
```

#### Task 3.3: 게임 오브젝트 엔티티 (`src/entities/game-object.ts`)

```typescript
import { BaseEntity } from "./base-entity";
import { Position } from "../types/events";
import { IGameObject } from "../types/entities";

export class GameObject extends BaseEntity implements IGameObject {
  public objectType: string;
  public isAcquired: boolean = false;

  constructor(
    id: string,
    position: Position,
    sprite: string,
    objectType: string
  ) {
    super(id, position, sprite);
    this.objectType = objectType;
    this.loadSprite(`/assets/sprites/objects/${sprite}.png`);
  }

  acquire(): void {
    this.isAcquired = true;
    // 획득 애니메이션 (페이드 아웃 등)
    this.playAcquireAnimation();
  }

  private playAcquireAnimation(): void {
    // GSAP 또는 Pixi 틱 기반 애니메이션
    let alpha = 1;
    const fadeOut = () => {
      alpha -= 0.1;
      this.container.alpha = alpha;
      if (alpha > 0) {
        requestAnimationFrame(fadeOut);
      }
    };
    fadeOut();
  }
}
```

#### Task 3.4: NPC 엔티티 (`src/entities/npc.ts`)

```typescript
import { BaseEntity } from "./base-entity";
import { Position } from "../types/events";
import { INpc } from "../types/entities";

export class Npc extends BaseEntity implements INpc {
  public npcType: string;

  constructor(id: string, position: Position, sprite: string, npcType: string) {
    super(id, position, sprite);
    this.npcType = npcType;
    this.loadSprite(`/assets/sprites/npcs/${sprite}.png`);
  }
}
```

#### Task 3.5: 엔티티 매니저 (`src/engine/entity-manager.ts`)

```typescript
import { Avatar } from "../entities/avatar";
import { GameObject } from "../entities/game-object";
import { Npc } from "../entities/npc";
import { EntityStore, IAvatar, IGameObject, INpc } from "../types/entities";
import {
  EventType,
  AvatarCreatedPayload,
  AvatarMovedPayload,
  AvatarRemovedPayload,
  ObjectCreatedPayload,
  ObjectAcquiredPayload,
  ObjectRemovedPayload,
  NpcSpawnedPayload,
  NpcMovedPayload,
  NpcRemovedPayload,
} from "../types/events";
import { eventDispatcher } from "../network/event-dispatcher";
import { gameRenderer } from "./game-renderer";
import { CONFIG } from "../config/constants";

export class EntityManager {
  private store: EntityStore = {
    avatars: new Map(),
    objects: new Map(),
    npcs: new Map(),
  };

  constructor() {
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    // Avatar events
    eventDispatcher.on(
      EventType.AVATAR_CREATED,
      this.handleAvatarCreated.bind(this)
    );
    eventDispatcher.on(
      EventType.AVATAR_MOVED,
      this.handleAvatarMoved.bind(this)
    );
    eventDispatcher.on(
      EventType.AVATAR_REMOVED,
      this.handleAvatarRemoved.bind(this)
    );

    // Object events
    eventDispatcher.on(
      EventType.OBJECT_CREATED,
      this.handleObjectCreated.bind(this)
    );
    eventDispatcher.on(
      EventType.OBJECT_ACQUIRED,
      this.handleObjectAcquired.bind(this)
    );
    eventDispatcher.on(
      EventType.OBJECT_REMOVED,
      this.handleObjectRemoved.bind(this)
    );

    // NPC events
    eventDispatcher.on(EventType.NPC_SPAWNED, this.handleNpcSpawned.bind(this));
    eventDispatcher.on(EventType.NPC_MOVED, this.handleNpcMoved.bind(this));
    eventDispatcher.on(EventType.NPC_REMOVED, this.handleNpcRemoved.bind(this));
  }

  // Avatar handlers
  private handleAvatarCreated(payload: AvatarCreatedPayload): void {
    const avatar = new Avatar(
      payload.avatar_id,
      payload.position,
      payload.sprite
    );
    this.store.avatars.set(payload.avatar_id, avatar);
    gameRenderer.addToLayer(CONFIG.LAYERS.AVATARS, avatar.container);
    console.log(`[EntityManager] Avatar created: ${payload.avatar_id}`);
  }

  private handleAvatarMoved(payload: AvatarMovedPayload): void {
    const avatar = this.store.avatars.get(payload.avatar_id);
    if (avatar) {
      avatar.moveTo(payload.position);
      avatar.setDirection(payload.direction);
    }
  }

  private handleAvatarRemoved(payload: AvatarRemovedPayload): void {
    const avatar = this.store.avatars.get(payload.avatar_id);
    if (avatar) {
      gameRenderer.removeFromLayer(CONFIG.LAYERS.AVATARS, avatar.container);
      avatar.destroy();
      this.store.avatars.delete(payload.avatar_id);
      console.log(`[EntityManager] Avatar removed: ${payload.avatar_id}`);
    }
  }

  // Object handlers
  private handleObjectCreated(payload: ObjectCreatedPayload): void {
    const gameObject = new GameObject(
      payload.object_id,
      payload.position,
      payload.sprite,
      payload.object_type
    );
    this.store.objects.set(payload.object_id, gameObject);
    gameRenderer.addToLayer(CONFIG.LAYERS.OBJECTS, gameObject.container);
    console.log(`[EntityManager] Object created: ${payload.object_id}`);
  }

  private handleObjectAcquired(payload: ObjectAcquiredPayload): void {
    const gameObject = this.store.objects.get(payload.object_id);
    if (gameObject) {
      gameObject.acquire();
    }
  }

  private handleObjectRemoved(payload: ObjectRemovedPayload): void {
    const gameObject = this.store.objects.get(payload.object_id);
    if (gameObject) {
      gameRenderer.removeFromLayer(CONFIG.LAYERS.OBJECTS, gameObject.container);
      gameObject.destroy();
      this.store.objects.delete(payload.object_id);
      console.log(`[EntityManager] Object removed: ${payload.object_id}`);
    }
  }

  // NPC handlers
  private handleNpcSpawned(payload: NpcSpawnedPayload): void {
    const npc = new Npc(
      payload.npc_id,
      payload.position,
      payload.sprite,
      payload.npc_type
    );
    this.store.npcs.set(payload.npc_id, npc);
    gameRenderer.addToLayer(CONFIG.LAYERS.NPCS, npc.container);
    console.log(`[EntityManager] NPC spawned: ${payload.npc_id}`);
  }

  private handleNpcMoved(payload: NpcMovedPayload): void {
    const npc = this.store.npcs.get(payload.object_id);
    if (npc) {
      npc.moveTo(payload.position);
    }
  }

  private handleNpcRemoved(payload: NpcRemovedPayload): void {
    const npc = this.store.npcs.get(payload.npc_id);
    if (npc) {
      gameRenderer.removeFromLayer(CONFIG.LAYERS.NPCS, npc.container);
      npc.destroy();
      this.store.npcs.delete(payload.npc_id);
      console.log(`[EntityManager] NPC removed: ${payload.npc_id}`);
    }
  }

  // Update all entities
  update(deltaTime: number): void {
    this.store.avatars.forEach((avatar) => avatar.update(deltaTime));
    this.store.objects.forEach((obj) => obj.update(deltaTime));
    this.store.npcs.forEach((npc) => npc.update(deltaTime));
  }

  // Cleanup
  destroy(): void {
    this.store.avatars.forEach((avatar) => avatar.destroy());
    this.store.objects.forEach((obj) => obj.destroy());
    this.store.npcs.forEach((npc) => npc.destroy());

    this.store.avatars.clear();
    this.store.objects.clear();
    this.store.npcs.clear();
  }
}

// 싱글톤 인스턴스
export const entityManager = new EntityManager();
```

---

### Phase 4: 렌더링 통합 (1-2일)

#### Task 4.1: main.ts 최종 통합

```typescript
import { gameRenderer } from "./engine/game-renderer";
import { entityManager } from "./engine/entity-manager";
import { webSocketManager } from "./network/websocket-manager";
import { eventDispatcher } from "./network/event-dispatcher";

async function main() {
  const appContainer = document.getElementById("app");
  if (!appContainer) {
    throw new Error("App container not found");
  }

  // 1. 렌더러 초기화
  await gameRenderer.initialize(appContainer);
  console.log("[MapView] Renderer initialized");

  // 2. WebSocket 이벤트 설정
  webSocketManager.onConnect(() => {
    console.log("[MapView] Connected to server");
  });

  webSocketManager.onDisconnect(() => {
    console.log("[MapView] Disconnected from server");
  });

  webSocketManager.onMessage((data) => {
    eventDispatcher.handleMessage(data);
  });

  // 3. 서버 연결
  webSocketManager.connect();

  // 4. 게임 루프
  gameRenderer.ticker.add((ticker) => {
    entityManager.update(ticker.deltaTime);
  });

  // 5. 클린업 핸들러
  window.addEventListener("beforeunload", () => {
    webSocketManager.disconnect();
    entityManager.destroy();
    gameRenderer.destroy();
  });
}

main().catch(console.error);
```

#### Task 4.2: HTML 템플릿 (`index.html`)

```html
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SKKU Avatar - Map View</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background-color: #0a0a0f;
      }

      #app {
        border: 2px solid #333;
        border-radius: 8px;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

### Phase 5: 월드 효과 (1-2일)

#### Task 5.1: 시간대 효과 (`src/effects/time-effect.ts`)

```typescript
import { Container, Graphics } from "pixi.js";
import { gameRenderer } from "../engine/game-renderer";
import { eventDispatcher } from "../network/event-dispatcher";
import { EventType, WorldTimeChangedPayload } from "../types/events";
import { CONFIG } from "../config/constants";

export class TimeEffect {
  private overlay: Graphics;
  private container: Container;

  constructor() {
    this.container = new Container();
    this.overlay = new Graphics();
    this.container.addChild(this.overlay);

    gameRenderer.addToLayer(CONFIG.LAYERS.EFFECTS, this.container);
    this.registerEventHandler();
  }

  private registerEventHandler(): void {
    eventDispatcher.on(
      EventType.WORLD_TIME_CHANGED,
      this.handleTimeChange.bind(this)
    );
  }

  private handleTimeChange(payload: WorldTimeChangedPayload): void {
    const { game_time } = payload;
    const hour = parseInt(game_time.split(":")[0], 10);

    this.updateOverlay(hour);
  }

  private updateOverlay(hour: number): void {
    this.overlay.clear();

    let alpha = 0;
    let color = 0x000000;

    if (hour >= 6 && hour < 8) {
      // 새벽 (오렌지 틴트)
      color = 0xff8800;
      alpha = 0.2;
    } else if (hour >= 8 && hour < 18) {
      // 낮 (효과 없음)
      alpha = 0;
    } else if (hour >= 18 && hour < 20) {
      // 저녁 (빨간 틴트)
      color = 0xff4400;
      alpha = 0.2;
    } else {
      // 밤 (파란 틴트)
      color = 0x000033;
      alpha = 0.4;
    }

    this.overlay.rect(0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    this.overlay.fill({ color, alpha });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

#### Task 5.2: 날씨 효과 (`src/effects/weather-effect.ts`)

```typescript
import { Container, Graphics } from "pixi.js";
import { gameRenderer } from "../engine/game-renderer";
import { eventDispatcher } from "../network/event-dispatcher";
import {
  EventType,
  WorldWeatherChangedPayload,
  WeatherType,
} from "../types/events";
import { CONFIG } from "../config/constants";

interface RainDrop {
  x: number;
  y: number;
  speed: number;
}

export class WeatherEffect {
  private container: Container;
  private rainDrops: RainDrop[] = [];
  private currentWeather: WeatherType = "sunny";
  private graphics: Graphics;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    gameRenderer.addToLayer(CONFIG.LAYERS.EFFECTS, this.container);
    this.registerEventHandler();
  }

  private registerEventHandler(): void {
    eventDispatcher.on(
      EventType.WORLD_WEATHER_CHANGED,
      this.handleWeatherChange.bind(this)
    );
  }

  private handleWeatherChange(payload: WorldWeatherChangedPayload): void {
    this.currentWeather = payload.weather;

    if (this.currentWeather === "rainy") {
      this.initializeRain();
    } else {
      this.rainDrops = [];
    }

    console.log(`[WeatherEffect] Weather changed to: ${this.currentWeather}`);
  }

  private initializeRain(): void {
    this.rainDrops = [];
    for (let i = 0; i < 100; i++) {
      this.rainDrops.push({
        x: Math.random() * CONFIG.MAP_WIDTH,
        y: Math.random() * CONFIG.MAP_HEIGHT,
        speed: 5 + Math.random() * 5,
      });
    }
  }

  update(deltaTime: number): void {
    this.graphics.clear();

    if (this.currentWeather === "rainy") {
      this.updateRain(deltaTime);
    } else if (this.currentWeather === "cloudy") {
      this.drawCloudyOverlay();
    }
  }

  private updateRain(deltaTime: number): void {
    this.graphics.setStrokeStyle({ width: 1, color: 0x6666ff, alpha: 0.5 });

    this.rainDrops.forEach((drop) => {
      drop.y += drop.speed * deltaTime;

      if (drop.y > CONFIG.MAP_HEIGHT) {
        drop.y = 0;
        drop.x = Math.random() * CONFIG.MAP_WIDTH;
      }

      this.graphics.moveTo(drop.x, drop.y);
      this.graphics.lineTo(drop.x, drop.y + 10);
      this.graphics.stroke();
    });
  }

  private drawCloudyOverlay(): void {
    this.graphics.rect(0, 0, CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    this.graphics.fill({ color: 0x808080, alpha: 0.2 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

#### Task 5.3: main.ts에 효과 추가

```typescript
import { TimeEffect } from "./effects/time-effect";
import { WeatherEffect } from "./effects/weather-effect";

// ... 기존 코드 ...

async function main() {
  // ... 기존 초기화 코드 ...

  // 효과 시스템 초기화
  const timeEffect = new TimeEffect();
  const weatherEffect = new WeatherEffect();

  // 게임 루프
  gameRenderer.ticker.add((ticker) => {
    entityManager.update(ticker.deltaTime);
    weatherEffect.update(ticker.deltaTime);
  });

  // 클린업
  window.addEventListener("beforeunload", () => {
    webSocketManager.disconnect();
    entityManager.destroy();
    timeEffect.destroy();
    weatherEffect.destroy();
    gameRenderer.destroy();
  });
}
```

---

### Phase 6: 폴리싱 및 최적화 (2-3일)

#### Task 6.1: 이동 보간 개선 (`src/utils/interpolation.ts`)

```typescript
import { Position } from "../types/events";

// 선형 보간
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

// 2D 위치 보간
export function lerpPosition(
  current: Position,
  target: Position,
  t: number
): Position {
  return {
    x: lerp(current.x, target.x, t),
    y: lerp(current.y, target.y, t),
  };
}

// Ease-out 보간 (더 자연스러운 감속)
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Ease-in-out 보간
export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// 거리 기반 보간 속도 계산
export function calculateInterpolationSpeed(
  current: Position,
  target: Position,
  baseSpeed: number
): number {
  const distance = Math.sqrt(
    Math.pow(target.x - current.x, 2) + Math.pow(target.y - current.y, 2)
  );

  // 거리가 멀수록 더 빠르게 보간
  return baseSpeed * Math.min(distance / 50, 2);
}
```

#### Task 6.2: 스프라이트 로더 최적화 (`src/utils/sprite-loader.ts`)

```typescript
import { Assets, Texture } from "pixi.js";

class SpriteLoader {
  private loadedTextures: Map<string, Texture> = new Map();
  private loadingPromises: Map<string, Promise<Texture>> = new Map();

  async preload(paths: string[]): Promise<void> {
    const promises = paths.map((path) => this.load(path));
    await Promise.all(promises);
    console.log(`[SpriteLoader] Preloaded ${paths.length} sprites`);
  }

  async load(path: string): Promise<Texture> {
    // 이미 로드된 경우
    if (this.loadedTextures.has(path)) {
      return this.loadedTextures.get(path)!;
    }

    // 로딩 중인 경우
    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path)!;
    }

    // 새로 로드
    const loadPromise = Assets.load(path).then((texture) => {
      this.loadedTextures.set(path, texture);
      this.loadingPromises.delete(path);
      return texture;
    });

    this.loadingPromises.set(path, loadPromise);
    return loadPromise;
  }

  getTexture(path: string): Texture | undefined {
    return this.loadedTextures.get(path);
  }

  unload(path: string): void {
    const texture = this.loadedTextures.get(path);
    if (texture) {
      texture.destroy();
      this.loadedTextures.delete(path);
    }
  }

  clear(): void {
    this.loadedTextures.forEach((texture) => texture.destroy());
    this.loadedTextures.clear();
    this.loadingPromises.clear();
  }
}

export const spriteLoader = new SpriteLoader();
```

#### Task 6.3: 연결 상태 UI (`src/ui/connection-status.ts`)

```typescript
import { Container, Text, Graphics, TextStyle } from "pixi.js";
import { gameRenderer } from "../engine/game-renderer";
import { webSocketManager } from "../network/websocket-manager";
import { CONFIG } from "../config/constants";

export class ConnectionStatus {
  private container: Container;
  private background: Graphics;
  private text: Text;

  constructor() {
    this.container = new Container();

    // 배경
    this.background = new Graphics();
    this.container.addChild(this.background);

    // 텍스트
    const style = new TextStyle({
      fontSize: 12,
      fill: 0xffffff,
      fontFamily: "Arial",
    });
    this.text = new Text({ text: "", style });
    this.text.x = 8;
    this.text.y = 4;
    this.container.addChild(this.text);

    // 위치 (우상단)
    this.container.x = CONFIG.MAP_WIDTH - 120;
    this.container.y = 10;

    gameRenderer.addToLayer(CONFIG.LAYERS.UI, this.container);
    this.setupListeners();
    this.updateStatus(false);
  }

  private setupListeners(): void {
    webSocketManager.onConnect(() => this.updateStatus(true));
    webSocketManager.onDisconnect(() => this.updateStatus(false));
  }

  private updateStatus(connected: boolean): void {
    this.background.clear();

    if (connected) {
      this.text.text = "Connected";
      this.background.roundRect(0, 0, 100, 24, 4);
      this.background.fill({ color: 0x00aa00, alpha: 0.8 });
    } else {
      this.text.text = "Disconnected";
      this.background.roundRect(0, 0, 100, 24, 4);
      this.background.fill({ color: 0xaa0000, alpha: 0.8 });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
```

---

## 6. Vite 설정

### `vite.config.ts`

```typescript
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: "esnext",
    minify: "terser",
  },
});
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

---

## 7. 중요 고려사항

### 7.1 성능 최적화

1. **오브젝트 풀링**: 자주 생성/삭제되는 엔티티는 오브젝트 풀 사용
2. **텍스처 아틀라스**: 여러 스프라이트를 단일 텍스처로 묶어 드로우 콜 감소
3. **Viewport Culling**: 화면 밖 엔티티는 렌더링에서 제외
4. **Ticker 최적화**: deltaTime 기반 업데이트로 프레임 독립적 로직

### 7.2 네트워크 처리

1. **이벤트 큐잉**: 짧은 시간에 많은 이벤트 수신 시 배치 처리
2. **재연결 백오프**: 지수 백오프로 서버 부하 방지
3. **상태 동기화**: 재연결 시 전체 상태 재요청 로직 필요

### 7.3 메모리 관리

1. **엔티티 정리**: 제거된 엔티티의 컨테이너/스프라이트 destroy 호출
2. **텍스처 언로드**: 사용하지 않는 텍스처 해제
3. **이벤트 리스너 정리**: 컴포넌트 파괴 시 리스너 해제

### 7.4 접근성

1. **고대비 모드**: 시각 장애 사용자를 위한 고대비 옵션
2. **모션 감소**: 애니메이션 비활성화 옵션
3. **상태 알림**: 연결 상태 변경 시 스크린 리더 알림

### 7.5 디버깅

```typescript
// 개발 모드에서 디버그 정보 표시
if (import.meta.env.DEV) {
  // FPS 카운터
  const stats = new Stats();
  document.body.appendChild(stats.dom);

  // 엔티티 바운딩 박스 표시
  entityManager.setDebugMode(true);
}
```

---

## 8. 테스트 계획

### 8.1 단위 테스트

- `EventDispatcher` 이벤트 라우팅
- `EntityManager` CRUD 동작
- 보간 유틸리티 함수

### 8.2 통합 테스트

- WebSocket 연결/재연결
- 이벤트 수신 → 렌더링 파이프라인
- 엔티티 생명주기

### 8.3 E2E 테스트

- 서버 연결 시나리오
- 다중 아바타 동시 이동
- 월드 효과 전환

---

## 9. 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 미리보기
npm run preview

# 타입 체크
npm run type-check

# 린트
npm run lint
```
