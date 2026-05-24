import { NextRequest, NextResponse } from 'next/server'
import { RoomServiceClient } from 'livekit-server-sdk'

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET
const LIVEKIT_HOST = process.env.LIVEKIT_HOST || 'https://chapcam.livekit.cloud'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { roomName, userId, maxParticipants = 2 } = body

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      console.error('[LiveKit] Missing API credentials')
      return NextResponse.json(
        { success: false, error: 'LiveKit non configure' },
        { status: 500 }
      )
    }

    const roomService = new RoomServiceClient(LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

    // Creer une room unique pour la session de swap
    const finalRoomName = roomName || `swap-${userId}-${Date.now()}`
    
    const room = await roomService.createRoom({
      name: finalRoomName,
      emptyTimeout: 300, // 5 minutes sans participant = suppression
      maxParticipants,
      metadata: JSON.stringify({
        userId,
        createdAt: Date.now(),
        type: 'swap-session'
      })
    })

    return NextResponse.json({
      success: true,
      room: {
        name: room.name,
        sid: room.sid,
        maxParticipants: room.maxParticipants,
      }
    })
  } catch (error) {
    console.error('[LiveKit] Error creating room:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur creation room' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomName = searchParams.get('roomName')

    if (!roomName) {
      return NextResponse.json(
        { success: false, error: 'roomName requis' },
        { status: 400 }
      )
    }

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return NextResponse.json(
        { success: false, error: 'LiveKit non configure' },
        { status: 500 }
      )
    }

    const roomService = new RoomServiceClient(LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)
    await roomService.deleteRoom(roomName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[LiveKit] Error deleting room:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur suppression room' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomName = searchParams.get('roomName')

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return NextResponse.json(
        { success: false, error: 'LiveKit non configure' },
        { status: 500 }
      )
    }

    const roomService = new RoomServiceClient(LIVEKIT_HOST, LIVEKIT_API_KEY, LIVEKIT_API_SECRET)

    if (roomName) {
      // Obtenir les infos d'une room specifique
      const participants = await roomService.listParticipants(roomName)
      return NextResponse.json({
        success: true,
        participants: participants.map(p => ({
          identity: p.identity,
          name: p.name,
          state: p.state,
          joinedAt: p.joinedAt,
        }))
      })
    } else {
      // Lister toutes les rooms actives
      const rooms = await roomService.listRooms()
      return NextResponse.json({
        success: true,
        rooms: rooms.map(r => ({
          name: r.name,
          sid: r.sid,
          numParticipants: r.numParticipants,
          creationTime: r.creationTime,
        }))
      })
    }
  } catch (error) {
    console.error('[LiveKit] Error listing rooms:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur listing rooms' },
      { status: 500 }
    )
  }
}
