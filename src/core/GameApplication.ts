import { Application, Container } from "pixi.js";
import { Avatar, type AvatarData } from "../entities/Avatar";
import { GameObject, type GameObjectData } from "../entities/GameObject";
import { WebSocketManager, MessageType } from "../network/WebSocketManager";
import { AdminPanel, type AdminPanelCallbacks } from "../ui/AdminPanel";
import { EasterEggHandler } from "../utils/EasterEggHandler";

export class GameApplication {
  private app: Application;
  private gameContainer: Container;
  private avatars: Map<string, Avatar> = new Map();
  private objects: Map<string, GameObject> = new Map();
  private wsManager: WebSocketManager;
  private isInitialized: boolean = false;
  private adminPanel: AdminPanel | null = null;
  private easterEggHandler: EasterEggHandler | null = null;

  constructor(serverUrl: string = "ws://localhost:8080") {
    this.app = new Application();
    this.gameContainer = new Container();
    this.wsManager = new WebSocketManager(serverUrl);
  }

  async init(): Promise<void> {
    if (this.isInitialized) {
      console.warn("Game already initialized");
      return;
    }

    // Initialize PixiJS application
    await this.app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a2e,
      resizeTo: window,
      antialias: true,
    });

    // Append canvas to document
    document.body.appendChild(this.app.canvas);

    // Add game container to stage
    this.app.stage.addChild(this.gameContainer);

    // Setup WebSocket event handlers
    this.setupWebSocketHandlers();

    // Start game loop
    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime / 60); // Convert to seconds
    });

    // Connect to game server
    try {
      await this.wsManager.connect();
      console.log("Connected to game server");
    } catch (error) {
      console.error("Failed to connect to game server:", error);
    }

    // Setup admin panel and easter egg
    this.setupAdminPanel();

    this.isInitialized = true;
  }

  private setupAdminPanel(): void {
    // Create admin panel callbacks
    const callbacks: AdminPanelCallbacks = {
      onCreateAvatar: (
        id: string,
        x: number,
        y: number,
        spriteUrl?: string
      ) => {
        this.createAvatar({ id, x, y, spriteUrl });
      },
      onMoveAvatar: (id: string, x: number, y: number) => {
        this.moveAvatar(id, x, y);
      },
      onCreateObject: (
        id: string,
        x: number,
        y: number,
        type: string,
        spriteUrl?: string
      ) => {
        this.createObject({ id, x, y, type, spriteUrl });
      },
      onPickupObject: (avatarId: string, objectId: string) => {
        this.pickupObject(avatarId, objectId);
      },
    };

    // Create admin panel
    this.adminPanel = new AdminPanel(callbacks);

    // Setup easter egg handler
    this.easterEggHandler = new EasterEggHandler(() => {
      if (this.adminPanel) {
        this.adminPanel.toggle();
      }
    });
  }

  private setupWebSocketHandlers(): void {
    // Avatar creation
    this.wsManager.on(MessageType.AVATAR_CREATE, (data: AvatarData) => {
      this.createAvatar(data);
    });

    // Avatar movement
    this.wsManager.on(
      MessageType.AVATAR_MOVE,
      (data: { id: string; x: number; y: number }) => {
        this.moveAvatar(data.id, data.x, data.y);
      }
    );

    // Object creation
    this.wsManager.on(MessageType.OBJECT_CREATE, (data: GameObjectData) => {
      this.createObject(data);
    });

    // Object pickup
    this.wsManager.on(
      MessageType.OBJECT_PICKUP,
      (data: { avatarId: string; objectId: string }) => {
        this.pickupObject(data.avatarId, data.objectId);
      }
    );
  }

  private createAvatar(data: AvatarData): Avatar {
    // Check if avatar already exists
    if (this.avatars.has(data.id)) {
      console.warn(`Avatar with id ${data.id} already exists`);
      return this.avatars.get(data.id)!;
    }

    const avatar = new Avatar(data, this.gameContainer);
    this.avatars.set(data.id, avatar);
    console.log(`Avatar created: ${data.id} at (${data.x}, ${data.y})`);
    return avatar;
  }

  private moveAvatar(avatarId: string, x: number, y: number): void {
    const avatar = this.avatars.get(avatarId);
    if (avatar) {
      avatar.moveTo(x, y);
    } else {
      console.warn(`Avatar ${avatarId} not found`);
    }
  }

  private createObject(data: GameObjectData): GameObject {
    // Check if object already exists
    if (this.objects.has(data.id)) {
      console.warn(`Object with id ${data.id} already exists`);
      return this.objects.get(data.id)!;
    }

    const obj = new GameObject(data, this.gameContainer);
    this.objects.set(data.id, obj);
    console.log(`Object created: ${data.id} at (${data.x}, ${data.y})`);
    return obj;
  }

  private pickupObject(avatarId: string, objectId: string): void {
    const avatar = this.avatars.get(avatarId);
    const object = this.objects.get(objectId);

    if (avatar && object) {
      avatar.pickupObject(objectId);
      object.destroy();
      this.objects.delete(objectId);
      console.log(`Avatar ${avatarId} picked up object ${objectId}`);
    } else {
      console.warn(
        `Failed to pickup: Avatar ${avatarId} or Object ${objectId} not found`
      );
    }
  }

  private update(deltaTime: number): void {
    // Update all avatars
    this.avatars.forEach((avatar) => {
      avatar.update(deltaTime);
    });
  }

  // Public API for testing without server
  public testCreateAvatar(id: string, x: number, y: number): void {
    this.createAvatar({ id, x, y });
  }

  public testMoveAvatar(id: string, x: number, y: number): void {
    this.moveAvatar(id, x, y);
  }

  public testCreateObject(
    id: string,
    x: number,
    y: number,
    type: string = "item"
  ): void {
    this.createObject({ id, x, y, type });
  }

  public testPickupObject(avatarId: string, objectId: string): void {
    this.pickupObject(avatarId, objectId);
  }

  destroy(): void {
    // Cleanup all avatars
    this.avatars.forEach((avatar) => avatar.destroy());
    this.avatars.clear();

    // Cleanup all objects
    this.objects.forEach((obj) => obj.destroy());
    this.objects.clear();

    // Cleanup admin panel and easter egg handler
    if (this.adminPanel) {
      this.adminPanel.destroy();
      this.adminPanel = null;
    }

    if (this.easterEggHandler) {
      this.easterEggHandler.destroy();
      this.easterEggHandler = null;
    }

    // Disconnect WebSocket
    this.wsManager.disconnect();

    // Destroy PixiJS application
    this.app.destroy(true, {
      children: true,
      texture: true,
      textureSource: true,
    });
  }
}
