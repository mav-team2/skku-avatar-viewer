export interface WebRTCConfig {
  whepUrl: string;
  iceServers?: RTCIceServer[];
}

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private videoElement: HTMLVideoElement;
  private config: WebRTCConfig;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(videoElement: HTMLVideoElement, config: WebRTCConfig) {
    this.videoElement = videoElement;
    this.config = {
      ...config,
      iceServers: config.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    };
  }

  async connect(): Promise<void> {
    if (this.connectionState === 'connecting' || this.connectionState === 'connected') {
      return;
    }

    this.connectionState = 'connecting';
    console.log('[WebRTC] Connecting via WHEP...');

    try {
      await this.setupWhepConnection();
    } catch (error) {
      console.error('[WebRTC] Connection failed:', error);
      this.connectionState = 'failed';
      this.attemptReconnect();
    }
  }

  private async setupWhepConnection(): Promise<void> {
    this.setupPeerConnection();

    if (!this.peerConnection) {
      throw new Error('Failed to create peer connection');
    }

    // Add transceiver for receiving video/audio
    this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
    this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });

    // Create offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Wait for ICE gathering
    await this.waitForIceGathering();

    // Send offer to WHEP endpoint
    const response = await fetch(this.config.whepUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
      },
      body: this.peerConnection.localDescription?.sdp,
    });

    if (!response.ok) {
      throw new Error(`WHEP request failed: ${response.status} ${response.statusText}`);
    }

    // Get answer from server
    const answerSdp = await response.text();
    console.log('[WebRTC] Received WHEP answer');

    await this.peerConnection.setRemoteDescription({
      type: 'answer',
      sdp: answerSdp,
    });

    console.log('[WebRTC] WHEP connection established');
  }

  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.peerConnection) {
        resolve();
        return;
      }

      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (this.peerConnection?.iceGatheringState === 'complete') {
          this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      this.peerConnection.addEventListener('icegatheringstatechange', checkState);

      // Timeout after 3 seconds
      setTimeout(() => {
        this.peerConnection?.removeEventListener('icegatheringstatechange', checkState);
        resolve();
      }, 3000);
    });
  }

  private setupPeerConnection(): void {
    this.peerConnection = new RTCPeerConnection({
      iceServers: this.config.iceServers,
    });

    this.peerConnection.ontrack = (event) => {
      console.log('[WebRTC] Received remote track:', event.track.kind);
      if (event.streams && event.streams[0]) {
        this.videoElement.srcObject = event.streams[0];
        this.connectionState = 'connected';
        this.reconnectAttempts = 0;
        console.log('[WebRTC] Video stream attached');
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected') {
        this.connectionState = 'connected';
      } else if (this.peerConnection?.connectionState === 'failed') {
        this.connectionState = 'failed';
        this.attemptReconnect();
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', this.peerConnection?.iceConnectionState);
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebRTC] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebRTC] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.cleanup();
      this.connect();
    }, this.reconnectDelay);
  }

  private cleanup(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.videoElement.srcObject = null;
  }

  disconnect(): void {
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.cleanup();
    this.connectionState = 'disconnected';
    console.log('[WebRTC] Disconnected');
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  get isConnected(): boolean {
    return this.connectionState === 'connected';
  }
}
