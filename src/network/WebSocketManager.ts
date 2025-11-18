export const MessageType = {
  AVATAR_CREATE: 'AVATAR_CREATE',
  AVATAR_MOVE: 'AVATAR_MOVE',
  OBJECT_CREATE: 'OBJECT_CREATE',
  OBJECT_PICKUP: 'OBJECT_PICKUP',
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

export interface GameMessage {
  type: MessageType;
  data: any;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private messageHandlers: Map<MessageType, Set<(data: any) => void>> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;
  private isConnecting: boolean = false;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.isConnecting = false;
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private async handleMessage(data: ArrayBuffer | string): Promise<void> {
    try {
      let message: GameMessage;

      if (data instanceof ArrayBuffer) {
        // Decode protobuf message
        // This is a placeholder - you'll need to define your actual protobuf schema
        const uint8Array = new Uint8Array(data);
        message = await this.decodeProtobufMessage(uint8Array);
      } else {
        // Handle JSON fallback
        message = JSON.parse(data);
      }

      // Dispatch to registered handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach((handler) => handler(message.data));
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  private async decodeProtobufMessage(data: Uint8Array): Promise<GameMessage> {
    // Placeholder for protobuf decoding
    // You'll need to replace this with your actual protobuf schema
    // For now, we'll use JSON as a fallback
    const jsonString = new TextDecoder().decode(data);
    return JSON.parse(jsonString);
  }

  on(messageType: MessageType, handler: (data: any) => void): void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);
  }

  off(messageType: MessageType, handler: (data: any) => void): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  send(message: GameMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // For now, send as JSON. Replace with protobuf encoding later
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not open. Current state:', this.ws?.readyState);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
