import { Container, Sprite, Texture, Assets, Graphics } from 'pixi.js';

/**
 * BackgroundManager handles the game background.
 * Supports WebRTC video stream or static image fallback.
 *
 * Environment variables:
 * - VITE_WEBRTC_URL: WebRTC signaling server URL
 * - VITE_WEBRTC_ENABLED: Set to 'true' to enable WebRTC background
 */
export class BackgroundManager {
  private container: Container;
  private videoElement: HTMLVideoElement | null = null;
  private videoTexture: Texture | null = null;
  private backgroundSprite: Sprite | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private isWebRTCEnabled: boolean;
  private webrtcUrl: string | undefined;

  constructor() {
    this.container = new Container();
    this.isWebRTCEnabled = import.meta.env.VITE_WEBRTC_ENABLED === 'true';
    this.webrtcUrl = import.meta.env.VITE_WEBRTC_URL;
  }

  async initialize(gameContainer: Container, width: number, height: number): Promise<void> {
    // Insert background at the back (index 0)
    gameContainer.addChildAt(this.container, 0);

    if (this.isWebRTCEnabled && this.webrtcUrl) {
      console.log('[BackgroundManager] WebRTC mode enabled');
      await this.initializeWebRTC(width, height);
    } else {
      console.log('[BackgroundManager] Static image mode');
      await this.initializeStaticBackground(width, height);
    }
  }

  private async initializeStaticBackground(width: number, height: number): Promise<void> {
    try {
      const texture = await Assets.load('/dido_sunny.png');
      this.backgroundSprite = new Sprite(texture);

      // Scale to fit the screen while maintaining aspect ratio
      const scaleX = width / texture.width;
      const scaleY = height / texture.height;
      const scale = Math.max(scaleX, scaleY);

      this.backgroundSprite.scale.set(scale);

      // Center the background
      this.backgroundSprite.x = (width - texture.width * scale) / 2;
      this.backgroundSprite.y = (height - texture.height * scale) / 2;

      this.container.addChild(this.backgroundSprite);
      console.log('[BackgroundManager] Static background loaded');
    } catch (error) {
      console.error('[BackgroundManager] Failed to load static background:', error);
      this.createFallbackBackground(width, height);
    }
  }

  private async initializeWebRTC(width: number, height: number): Promise<void> {
    try {
      // Create video element
      this.videoElement = document.createElement('video');
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      this.videoElement.style.display = 'none';
      document.body.appendChild(this.videoElement);

      // Create RTCPeerConnection
      const config: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      };

      this.peerConnection = new RTCPeerConnection(config);

      // Handle incoming video track
      this.peerConnection.ontrack = (event) => {
        console.log('[BackgroundManager] Received video track');
        if (this.videoElement && event.streams[0]) {
          this.videoElement.srcObject = event.streams[0];
          this.videoElement.play().catch(console.error);
        }
      };

      // Handle ICE connection state changes
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('[BackgroundManager] ICE state:', this.peerConnection?.iceConnectionState);
        if (this.peerConnection?.iceConnectionState === 'failed' ||
            this.peerConnection?.iceConnectionState === 'disconnected') {
          console.warn('[BackgroundManager] WebRTC connection failed, falling back to static image');
          this.fallbackToStaticBackground(width, height);
        }
      };

      // Connect to signaling server
      await this.connectToSignalingServer();

      // Create video texture from video element
      this.videoTexture = Texture.from(this.videoElement);
      this.backgroundSprite = new Sprite(this.videoTexture);

      // Scale to cover the screen
      this.backgroundSprite.width = width;
      this.backgroundSprite.height = height;

      this.container.addChild(this.backgroundSprite);
      console.log('[BackgroundManager] WebRTC background initialized');
    } catch (error) {
      console.error('[BackgroundManager] WebRTC initialization failed:', error);
      await this.fallbackToStaticBackground(width, height);
    }
  }

  private async connectToSignalingServer(): Promise<void> {
    if (!this.webrtcUrl || !this.peerConnection) {
      throw new Error('WebRTC URL or PeerConnection not available');
    }

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.webrtcUrl!);

      ws.onopen = async () => {
        console.log('[BackgroundManager] Connected to signaling server');

        // Send offer request to get video stream
        ws.send(JSON.stringify({ type: 'request_offer' }));
      };

      ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data as string) as {
            type: string;
            sdp?: string;
            candidate?: RTCIceCandidateInit
          };

          if (message.type === 'offer' && message.sdp) {
            // Set remote description (offer from server)
            await this.peerConnection!.setRemoteDescription(
              new RTCSessionDescription({ type: 'offer', sdp: message.sdp })
            );

            // Create and send answer
            const answer = await this.peerConnection!.createAnswer();
            await this.peerConnection!.setLocalDescription(answer);

            ws.send(JSON.stringify({
              type: 'answer',
              sdp: answer.sdp
            }));

            resolve();
          } else if (message.type === 'ice_candidate' && message.candidate) {
            // Add ICE candidate
            await this.peerConnection!.addIceCandidate(
              new RTCIceCandidate(message.candidate)
            );
          }
        } catch (error) {
          console.error('[BackgroundManager] Signaling error:', error);
          reject(error);
        }
      };

      ws.onerror = (error) => {
        console.error('[BackgroundManager] WebSocket error:', error);
        reject(error);
      };

      ws.onclose = () => {
        console.log('[BackgroundManager] Signaling connection closed');
      };

      // Send ICE candidates to server
      this.peerConnection!.onicecandidate = (event) => {
        if (event.candidate) {
          ws.send(JSON.stringify({
            type: 'ice_candidate',
            candidate: event.candidate.toJSON()
          }));
        }
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        reject(new Error('WebRTC connection timeout'));
      }, 10000);
    });
  }

  private async fallbackToStaticBackground(width: number, height: number): Promise<void> {
    this.cleanupWebRTC();
    await this.initializeStaticBackground(width, height);
  }

  private createFallbackBackground(width: number, height: number): void {
    // Create a simple colored rectangle as ultimate fallback
    const graphics = new Graphics();
    graphics.rect(0, 0, width, height);
    graphics.fill(0x1a1a2e);
    this.container.addChild(graphics);
  }

  /**
   * Update video texture (call this in game loop for WebRTC)
   */
  update(): void {
    if (this.videoTexture && this.videoElement && !this.videoElement.paused) {
      this.videoTexture.source.update();
    }
  }

  private cleanupWebRTC(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement.remove();
      this.videoElement = null;
    }

    if (this.videoTexture) {
      this.videoTexture.destroy();
      this.videoTexture = null;
    }
  }

  destroy(): void {
    this.cleanupWebRTC();

    if (this.backgroundSprite) {
      this.backgroundSprite.destroy();
      this.backgroundSprite = null;
    }

    this.container.destroy({ children: true });
  }

  get isUsingWebRTC(): boolean {
    return this.isWebRTCEnabled && this.peerConnection !== null;
  }
}
