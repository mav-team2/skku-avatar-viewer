import protobuf from 'protobufjs';
import { MessageType, type GameMessage } from '../network/WebSocketManager';

export class ProtobufHandler {
  private root: protobuf.Root | null = null;
  private GameMessageType: protobuf.Type | null = null;

  async loadSchema(protoPath: string): Promise<void> {
    try {
      this.root = await protobuf.load(protoPath);
      this.GameMessageType = this.root.lookupType('game.GameMessage');
      console.log('Protobuf schema loaded successfully');
    } catch (error) {
      console.error('Failed to load protobuf schema:', error);
      throw error;
    }
  }

  loadSchemaFromJSON(schemaJson: any): void {
    try {
      this.root = protobuf.Root.fromJSON(schemaJson);
      this.GameMessageType = this.root.lookupType('game.GameMessage');
      console.log('Protobuf schema loaded from JSON successfully');
    } catch (error) {
      console.error('Failed to load protobuf schema from JSON:', error);
      throw error;
    }
  }

  encode(message: GameMessage): Uint8Array {
    if (!this.GameMessageType) {
      throw new Error('Protobuf schema not loaded');
    }

    try {
      const protoMessage = this.convertToProtoMessage(message);
      const errMsg = this.GameMessageType.verify(protoMessage);
      if (errMsg) {
        throw new Error(errMsg);
      }

      const buffer = this.GameMessageType.encode(protoMessage).finish();
      return buffer;
    } catch (error) {
      console.error('Failed to encode message:', error);
      throw error;
    }
  }

  decode(buffer: Uint8Array): GameMessage {
    if (!this.GameMessageType) {
      throw new Error('Protobuf schema not loaded');
    }

    try {
      const decodedMessage = this.GameMessageType.decode(buffer);
      const protoMessage = this.GameMessageType.toObject(decodedMessage, {
        longs: String,
        enums: String,
        bytes: String,
      });

      return this.convertFromProtoMessage(protoMessage);
    } catch (error) {
      console.error('Failed to decode message:', error);
      throw error;
    }
  }

  private convertToProtoMessage(message: GameMessage): any {
    const protoMessage: any = {
      type: this.getProtoMessageType(message.type),
    };

    switch (message.type) {
      case MessageType.AVATAR_CREATE:
        protoMessage.avatarData = message.data;
        break;
      case MessageType.AVATAR_MOVE:
        protoMessage.movementData = message.data;
        break;
      case MessageType.OBJECT_CREATE:
        protoMessage.objectData = message.data;
        break;
      case MessageType.OBJECT_PICKUP:
        protoMessage.pickupData = message.data;
        break;
    }

    return protoMessage;
  }

  private convertFromProtoMessage(protoMessage: any): GameMessage {
    const messageType = this.getGameMessageType(protoMessage.type);
    let data: any;

    if (protoMessage.avatarData) {
      data = protoMessage.avatarData;
    } else if (protoMessage.movementData) {
      data = protoMessage.movementData;
    } else if (protoMessage.objectData) {
      data = protoMessage.objectData;
    } else if (protoMessage.pickupData) {
      data = protoMessage.pickupData;
    }

    return {
      type: messageType,
      data,
    };
  }

  private getProtoMessageType(type: MessageType): number {
    switch (type) {
      case MessageType.AVATAR_CREATE:
        return 0;
      case MessageType.AVATAR_MOVE:
        return 1;
      case MessageType.OBJECT_CREATE:
        return 2;
      case MessageType.OBJECT_PICKUP:
        return 3;
      default:
        return 0;
    }
  }

  private getGameMessageType(protoType: number | string): MessageType {
    const typeNum = typeof protoType === 'string' ? parseInt(protoType) : protoType;

    switch (typeNum) {
      case 0:
        return MessageType.AVATAR_CREATE;
      case 1:
        return MessageType.AVATAR_MOVE;
      case 2:
        return MessageType.OBJECT_CREATE;
      case 3:
        return MessageType.OBJECT_PICKUP;
      default:
        return MessageType.AVATAR_CREATE;
    }
  }
}
