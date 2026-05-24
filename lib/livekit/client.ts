"use client"

import { Room, RoomEvent, VideoPresets, ConnectionState, Track, LocalVideoTrack } from 'livekit-client'

export interface LiveKitConfig {
  url: string
  token: string
  roomName: string
}

export interface RoomCallbacks {
  onConnected?: () => void
  onDisconnected?: () => void
  onParticipantConnected?: (participantId: string) => void
  onParticipantDisconnected?: (participantId: string) => void
  onTrackPublished?: (track: Track) => void
  onError?: (error: Error) => void
}

export class LiveKitClient {
  private room: Room | null = null
  private callbacks: RoomCallbacks = {}

  async connect(config: LiveKitConfig, callbacks?: RoomCallbacks): Promise<Room> {
    this.callbacks = callbacks || {}

    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
        facingMode: 'user',
      },
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    })

    // Setup event listeners
    this.setupEventListeners()

    // Connect to room
    await this.room.connect(config.url, config.token, {
      autoSubscribe: true,
    })

    return this.room
  }

  private setupEventListeners() {
    if (!this.room) return

    this.room.on(RoomEvent.Connected, () => {
      console.log('[v0] LiveKit: Connected to room')
      this.callbacks.onConnected?.()
    })

    this.room.on(RoomEvent.Disconnected, () => {
      console.log('[v0] LiveKit: Disconnected from room')
      this.callbacks.onDisconnected?.()
    })

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      console.log('[v0] LiveKit: Participant connected:', participant.identity)
      this.callbacks.onParticipantConnected?.(participant.identity)
    })

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      console.log('[v0] LiveKit: Participant disconnected:', participant.identity)
      this.callbacks.onParticipantDisconnected?.(participant.identity)
    })

    this.room.on(RoomEvent.TrackPublished, (publication) => {
      console.log('[v0] LiveKit: Track published:', publication.trackSid)
      if (publication.track) {
        this.callbacks.onTrackPublished?.(publication.track)
      }
    })

    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      console.log('[v0] LiveKit: Connection state changed:', state)
      if (state === ConnectionState.Disconnected) {
        this.callbacks.onError?.(new Error('Connection lost'))
      }
    })
  }

  async enableCamera(enabled: boolean = true): Promise<LocalVideoTrack | undefined> {
    if (!this.room) throw new Error('Room not connected')
    await this.room.localParticipant.setCameraEnabled(enabled)
    
    const videoTrack = this.room.localParticipant.getTrackPublication(Track.Source.Camera)
    return videoTrack?.track as LocalVideoTrack | undefined
  }

  async enableMicrophone(enabled: boolean = true): Promise<void> {
    if (!this.room) throw new Error('Room not connected')
    await this.room.localParticipant.setMicrophoneEnabled(enabled)
  }

  getLocalVideoTrack(): LocalVideoTrack | undefined {
    if (!this.room) return undefined
    const videoTrack = this.room.localParticipant.getTrackPublication(Track.Source.Camera)
    return videoTrack?.track as LocalVideoTrack | undefined
  }

  getRoom(): Room | null {
    return this.room
  }

  async disconnect(): Promise<void> {
    if (this.room) {
      await this.room.disconnect()
      this.room = null
    }
  }

  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected
  }

  getConnectionState(): ConnectionState | null {
    return this.room?.state || null
  }
}

// Singleton instance
let liveKitClient: LiveKitClient | null = null

export function getLiveKitClient(): LiveKitClient {
  if (!liveKitClient) {
    liveKitClient = new LiveKitClient()
  }
  return liveKitClient
}
