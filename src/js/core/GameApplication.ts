import { Application, Container } from 'pixi.js';
import { Avatar, type AvatarData } from '../entities/Avatar';
import { GameObject, type GameObjectData } from '../entities/GameObject';
import { WebSocketManager } from '../network/WebSocketManager';
import { protobufHandler, MessageType, type MessagePayload } from '../proto/ProtobufHandler';

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
      backgroundAlpha: 0,
      antialias: true,
    });

    container.appendChild(this.app.canvas);
    this.app.stage.addChild(this.gameContainer);

    this.setupWebSocketHandlers();
    this.setupGameLoop();

    // WebSocket 연결
    this.wsManager.connect();

    // Initialize Protobuf (non-blocking - game works without it)
    protobufHandler.initialize().catch((error) => {
      console.warn('[GameApplication] Protobuf init failed, using JSON fallback:', error);
    });

    console.log('[GameApplication] Initialized');
  }

  private setupWebSocketHandlers(): void {
    this.wsManager.onMessage((data: ArrayBuffer) => {
      try {
        const decoded = protobufHandler.decode(new Uint8Array(data));
        this.handleGameMessage(decoded.type, decoded.payload);
      } catch (error) {
        console.error('[Game] Failed to decode message:', error);
      }
    });
  }

  private handleGameMessage(type: MessageType, payload: MessagePayload): void {
    switch (type) {
      case MessageType.AVATAR_CREATE:
        this.createAvatar(payload as AvatarData);
        break;
      case MessageType.AVATAR_MOVE:
        const moveData = payload as { id: string; x: number; y: number };
        this.moveAvatar(moveData.id, moveData.x, moveData.y);
        break;
      case MessageType.AVATAR_REMOVE:
        const removeData = payload as { id: string };
        this.removeAvatar(removeData.id);
        break;
      case MessageType.OBJECT_CREATE:
        this.createObject(payload as GameObjectData);
        break;
      case MessageType.OBJECT_PICKUP:
        const pickupData = payload as { objectId: string; avatarId: string };
        this.pickupObject(pickupData.objectId, pickupData.avatarId);
        break;
      default:
        console.warn(`[Game] Unhandled message type: ${type}`);
    }
  }

  private setupGameLoop(): void {
    this.app.ticker.add((ticker) => {
      const deltaTime = ticker.deltaTime;

      // 모든 아바타 업데이트 (이동 보간 + 애니메이션 전환)
      this.avatars.forEach(avatar => avatar.update(deltaTime));
    });
  }

  // Public API for creating entities

  async createAvatar(data: AvatarData): Promise<void> {
    if (this.avatars.has(data.id)) {
      console.warn(`[Game] Avatar ${data.id} already exists`);
      return;
    }

    try {
      const avatar = await Avatar.create(data, this.gameContainer);
      this.avatars.set(data.id, avatar);
      console.log(`[Game] Avatar created: ${data.id}`);
    } catch (error) {
      console.error(`[Game] Failed to create avatar ${data.id}:`, error);
    }
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

  async createObject(data: GameObjectData): Promise<void> {
    if (this.gameObjects.has(data.id)) {
      console.warn(`[Game] Object ${data.id} already exists`);
      return;
    }

    try {
      const gameObject = await GameObject.create(data, this.gameContainer);
      this.gameObjects.set(data.id, gameObject);
      console.log(`[Game] Object created: ${data.id}`);
    } catch (error) {
      console.error(`[Game] Failed to create object ${data.id}:`, error);
    }
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
    this.createAvatar({ id, x, y, spriteUrl});
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
