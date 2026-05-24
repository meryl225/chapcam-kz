import { NextRequest, NextResponse } from 'next/server'
import { AccessToken } from 'livekit-server-sdk'

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomName, participantName, userId, isPublisher } = body

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error('[LiveKit] Missing API credentials')
      return NextResponse.json(
        { success: false, error: 'LiveKit non configure' },
        { status: 500 }
      )
    }

    // Creer un token d'acces
    const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: userId || participantName,
      name: participantName,
      ttl: '6h', // Token valide 6 heures
    })

    // Ajouter les permissions pour la room
    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: isPublisher !== false,
      canSubscribe: true,
      canPublishData: true,
    })

    const token = await at.toJwt()

    return NextResponse.json({
      success: true,
      token,
      roomName,
      wsUrl: process.env.LIVEKIT_WS_URL || 'wss://chapcam.livekit.cloud',
    })
  } catch (error) {
    console.error('[LiveKit] Error creating token:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur creation token' },
      { status: 500 }
    )
  }
}
