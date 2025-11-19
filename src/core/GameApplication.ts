import { Application, Container } from 'pixi.js';
import { Avatar, type AvatarData } from '../entities/Avatar';
import { GameObject, type GameObjectData } from '../entities/GameObject';
import { WebSocketManager, MessageType } from '../network/WebSocketManager';

export class GameApplication {
  private app: Application;
  private gameContainer: Container;
  private avatars: Map<string, Avatar> = new Map();
  private gameObjects: Map<string, GameObject> = new Map();
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

    // WebSocket 연결
    this.wsManager.connect();

    console.log('[GameApplication] Initialized');
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

    // 오브젝트 생성
    this.wsManager.on(MessageType.OBJECT_CREATE, (payload) => {
      const data = payload as GameObjectData;
      this.createObject(data);
    });

    // 오브젝트 픽업
    this.wsManager.on(MessageType.OBJECT_PICKUP, (payload) => {
      const { objectId, avatarId } = payload as { objectId: string; avatarId: string };
      this.pickupObject(objectId, avatarId);
    });
  }

  private setupGameLoop(): void {
    this.app.ticker.add((ticker) => {
      const deltaTime = ticker.deltaTime;

      // 모든 아바타 업데이트 (이동 보간 + 애니메이션 전환)
      this.avatars.forEach(avatar => avatar.update(deltaTime));
    });
  }

  // Public API for creating entities

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
    } else {
      console.warn(`[Game] Avatar not found: ${id}`);
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

  createObject(data: GameObjectData): void {
    if (this.gameObjects.has(data.id)) {
      console.warn(`[Game] Object ${data.id} already exists`);
      return;
    }

    const gameObject = new GameObject(data, this.gameContainer);
    this.gameObjects.set(data.id, gameObject);
    console.log(`[Game] Object created: ${data.id}`);
  }

  async pickupObject(objectId: string, _avatarId: string): Promise<void> {
    const gameObject = this.gameObjects.get(objectId);
    if (gameObject) {
      await gameObject.pickup();
      gameObject.destroy();
      this.gameObjects.delete(objectId);
      console.log(`[Game] Object picked up: ${objectId}`);
    }
  }

  removeObject(id: string): void {
    const gameObject = this.gameObjects.get(id);
    if (gameObject) {
      gameObject.destroy();
      this.gameObjects.delete(id);
      console.log(`[Game] Object removed: ${id}`);
    }
  }

  // Test methods for development

  testCreateAvatar(id: string, x: number, y: number, spriteUrl?: string): void {
    this.createAvatar({ id, x, y, spriteUrl });
  }

  testMoveAvatar(id: string, x: number, y: number): void {
    this.moveAvatar(id, x, y);
  }

  testCreateObject(id: string, x: number, y: number, spriteUrl?: string): void {
    this.createObject({ id, x, y, spriteUrl });
  }

  // Getters

  getAvatar(id: string): Avatar | undefined {
    return this.avatars.get(id);
  }

  getObject(id: string): GameObject | undefined {
    return this.gameObjects.get(id);
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  get stage(): Container {
    return this.app.stage;
  }

  // Cleanup

  destroy(): void {
    this.wsManager.disconnect();

    this.avatars.forEach(avatar => avatar.destroy());
    this.avatars.clear();

    this.gameObjects.forEach(obj => obj.destroy());
    this.gameObjects.clear();

    this.app.destroy(true);
    console.log('[GameApplication] Destroyed');
  }
}
