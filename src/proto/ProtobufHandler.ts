import protobuf from 'protobufjs';
import { MessageType } from '../network/WebSocketManager';

// Type definitions for protobuf messages
interface AvatarCreatePayload {
  id: string;
  x: number;
  y: number;
  name?: string;
  spriteUrl?: string;
}

interface AvatarMovePayload {
  id: string;
  x: number;
  y: number;
}

interface AvatarRemovePayload {
  id: string;
}

interface ObjectCreatePayload {
  id: string;
  x: number;
  y: number;
  type?: string;
  spriteUrl?: string;
}

interface ObjectPickupPayload {
  objectId: string;
  avatarId: string;
}

export type MessagePayload =
  | AvatarCreatePayload
  | AvatarMovePayload
  | AvatarRemovePayload
  | ObjectCreatePayload
  | ObjectPickupPayload;

export interface DecodedMessage {
  type: MessageType;
  payload: MessagePayload;
}

export class ProtobufHandler {
  private root: protobuf.Root | null = null;
  private gameMessage: protobuf.Type | null = null;
  private isInitialized = false;

  async initialize(protoPath: string = '/src/proto/game.proto'): Promise<void> {
    try {
      this.root = await protobuf.load(protoPath);
      this.gameMessage = this.root.lookupType('game.GameMessage');
      this.isInitialized = true;
      console.log('[ProtobufHandler] Initialized');
    } catch (error) {
      console.error('[ProtobufHandler] Failed to initialize:', error);
      throw error;
    }
  }

  encode(type: MessageType, payload: MessagePayload): Uint8Array {
    if (!this.isInitialized || !this.gameMessage) {
      throw new Error('ProtobufHandler not initialized');
    }

    const message = {
      type,
      [this.getPayloadFieldName(type)]: payload,
    };

    const errMsg = this.gameMessage.verify(message);
    if (errMsg) {
      throw new Error(`Invalid message: ${errMsg}`);
    }

    const encoded = this.gameMessage.create(message);
    return this.gameMessage.encode(encoded).finish();
  }

  decode(buffer: Uint8Array): DecodedMessage {
    if (!this.isInitialized || !this.gameMessage) {
      throw new Error('ProtobufHandler not initialized');
    }

    const message = this.gameMessage.decode(buffer) as protobuf.Message & {
      type: MessageType;
      avatarCreate?: AvatarCreatePayload;
      avatarMove?: AvatarMovePayload;
      avatarRemove?: AvatarRemovePayload;
      objectCreate?: ObjectCreatePayload;
      objectPickup?: ObjectPickupPayload;
    };
    const type = message.type as MessageType;
    const payloadField = this.getPayloadFieldName(type);
    const payload = message[payloadField as keyof typeof message] as MessagePayload;

    return { type, payload };
  }

  private getPayloadFieldName(type: MessageType): string {
    const fieldMap: Record<MessageType, string> = {
      [MessageType.AVATAR_CREATE]: 'avatarCreate',
      [MessageType.AVATAR_MOVE]: 'avatarMove',
      [MessageType.AVATAR_REMOVE]: 'avatarRemove',
      [MessageType.OBJECT_CREATE]: 'objectCreate',
      [MessageType.OBJECT_PICKUP]: 'objectPickup',
      [MessageType.NPC_SPAWN]: 'npcSpawn',
      [MessageType.NPC_MOVE]: 'npcMove',
      [MessageType.WORLD_TIME]: 'worldTime',
      [MessageType.WORLD_WEATHER]: 'worldWeather',
    };

    return fieldMap[type] || 'unknown';
  }
}

export const protobufHandler = new ProtobufHandler();
