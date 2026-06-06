import { AccessToken, RoomServiceClient, VideoGrant } from 'livekit-server-sdk'

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://chapcam.livekit.cloud'

export interface TokenOptions {
  roomName: string
  participantName: string
  participantIdentity: string
  metadata?: string
  ttl?: number // Time to live in seconds
}

export interface RoomMetadata {
  avatarUrl: string
  userId: string
  userTier: 'free' | 'premium'
  gpuEndpoint: string
  quality: '480p' | '720p' | '1080p'
  maxFps: number
}

export function createAccessToken(options: TokenOptions): string {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: options.participantIdentity,
    name: options.participantName,
    ttl: options.ttl || 3600, // 1 hour default
    metadata: options.metadata,
  })

  const videoGrant: VideoGrant = {
    room: options.roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  }

  at.addGrant(videoGrant)

  return at.toJwt()
}

export function createRoomServiceClient(): RoomServiceClient {
  // Extract host from WebSocket URL
  const host = LIVEKIT_URL.replace('wss://', 'https://').replace('ws://', 'http://')
  return new RoomServiceClient(host, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
}

export async function createRoom(roomName: string, metadata?: RoomMetadata): Promise<void> {
  const client = createRoomServiceClient()
  
  try {
    await client.createRoom({
      name: roomName,
      emptyTimeout: 300, // 5 minutes
      maxParticipants: 2, // User + GPU processor
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    })
  } catch (error) {
    // Room might already exist, which is fine
    console.log('[v0] Room creation:', error)
  }
}

export async function deleteRoom(roomName: string): Promise<void> {
  const client = createRoomServiceClient()
  await client.deleteRoom(roomName)
}

export async function listRooms(): Promise<string[]> {
  const client = createRoomServiceClient()
  const rooms = await client.listRooms()
  return rooms.map(room => room.name)
}

export async function getParticipantCount(roomName: string): Promise<number> {
  const client = createRoomServiceClient()
  const participants = await client.listParticipants(roomName)
  return participants.length
}

export function generateRoomName(userId: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  return `chapcam-${userId}-${timestamp}-${random}`
}

export function parseRoomMetadata(metadataString: string | undefined): RoomMetadata | null {
  if (!metadataString) return null
  try {
    return JSON.parse(metadataString) as RoomMetadata
  } catch {
    return null
  }
}
