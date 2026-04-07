export const ICE_SERVERS: RTCIceServer[] = [
  {
    urls: ["stun:stun.cloudflare.com:3478", "stun:stun.cloudflare.com:53"],
  },
  {
    urls: [
      "turn:turn.cloudflare.com:3478?transport=udp",
      "turn:turn.cloudflare.com:53?transport=udp",
      "turn:turn.cloudflare.com:3478?transport=tcp",
      "turn:turn.cloudflare.com:80?transport=tcp",
      "turns:turn.cloudflare.com:5349?transport=tcp",
      "turns:turn.cloudflare.com:443?transport=tcp",
    ],
    username: import.meta.env.VITE_ICE_USERNAME,
    credential: import.meta.env.VITE_ICE_CREDENTIAL,
  },
];

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private onTrackCallback?: (stream: MediaStream) => void;
  private onIceCandidateCallback?: (candidate: RTCIceCandidate) => void;
  private onDisconnectCallback?: () => void;

  constructor(
    onTrack?: (stream: MediaStream) => void,
    onIceCandidate?: (candidate: RTCIceCandidate) => void,
    onDisconnect?: () => void,
  ) {
    this.onTrackCallback = onTrack;
    this.onIceCandidateCallback = onIceCandidate;
    this.onDisconnectCallback = onDisconnect;
  }

  public async initialize(stream: MediaStream) {
    this.localStream = stream;
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    // Handle connection state changes for automatic mesh pruning
    this.pc.onconnectionstatechange = () => {
      if (
        this.pc &&
        (this.pc.connectionState === "failed" ||
          this.pc.connectionState === "disconnected" ||
          this.pc.connectionState === "closed")
      ) {
        this.onDisconnectCallback?.();
      }
    };

    // Add local tracks
    this.localStream.getTracks().forEach((track) => {
      if (this.localStream && this.pc) {
        this.pc.addTrack(track, this.localStream);
      }
    });

    // Handle remote tracks
    this.pc.ontrack = (event) => {
      if (this.onTrackCallback) {
        const stream =
          event.streams && event.streams[0]
            ? event.streams[0]
            : new MediaStream([event.track]);
        this.onTrackCallback(stream);
      }
    };

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidateCallback) {
        this.onIceCandidateCallback(event.candidate);
      }
    };
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error("PeerConnection not initialized");
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  public async createAnswer(
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.pc) throw new Error("PeerConnection not initialized");
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  public async setAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.pc) throw new Error("PeerConnection not initialized");
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  public async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.pc) throw new Error("PeerConnection not initialized");
    await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Returns true when the peer connection has a remote description set,
   * meaning it is safe to apply incoming ICE candidates directly.
   */
  public isReadyForCandidates(): boolean {
    return (
      this.pc !== null &&
      this.pc.remoteDescription !== null &&
      this.pc.signalingState !== "closed"
    );
  }

  public close() {
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    // DO NOT invoke track.stop() here because localStream is shared across multiple peers in a mesh!
    if (this.localStream) {
      this.localStream = null;
    }
  }

  public isClosed(): boolean {
    return this.pc === null || this.pc.signalingState === "closed";
  }

  public isFailed(): boolean {
    return (
      this.pc !== null &&
      (this.pc.connectionState === "failed" ||
        this.pc.connectionState === "disconnected")
    );
  }

  public async replaceTrack(
    kind: "audio" | "video",
    newTrack: MediaStreamTrack,
  ) {
    if (!this.pc) return;
    const senders = this.pc.getSenders();
    const sender = senders.find((s) => s.track?.kind === kind);
    if (sender) {
      await sender.replaceTrack(newTrack);
    }
  }
}
