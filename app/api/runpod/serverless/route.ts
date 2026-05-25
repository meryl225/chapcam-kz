import { NextRequest, NextResponse } from 'next/server'

// RunPod Serverless API
// Facture uniquement quand un GPU est utilise (pay-per-second)

const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY
const RUNPOD_SERVERLESS_ID = process.env.RUNPOD_SERVERLESS_ID // ID de ton endpoint serverless

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, input } = body

    if (!RUNPOD_API_KEY || !RUNPOD_SERVERLESS_ID) {
      return NextResponse.json(
        { success: false, error: 'RunPod non configure' },
        { status: 500 }
      )
    }

    const endpoint = `https://api.runpod.ai/v2/${RUNPOD_SERVERLESS_ID}`

    switch (action) {
      case 'run': {
        // Lancer un job async (scale from zero si necessaire)
        const response = await fetch(`${endpoint}/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RUNPOD_API_KEY}`,
          },
          body: JSON.stringify({ input }),
        })

        const result = await response.json()
        return NextResponse.json({
          success: true,
          jobId: result.id,
          status: result.status,
        })
      }

      case 'runsync': {
        // Lancer un job synchrone (attend le resultat)
        const response = await fetch(`${endpoint}/runsync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RUNPOD_API_KEY}`,
          },
          body: JSON.stringify({ input }),
        })

        const result = await response.json()
        return NextResponse.json({
          success: true,
          output: result.output,
          status: result.status,
          executionTime: result.executionTime,
        })
      }

      case 'status': {
        // Verifier le statut d'un job
        const { jobId } = input
        const response = await fetch(`${endpoint}/status/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${RUNPOD_API_KEY}`,
          },
        })

        const result = await response.json()
        return NextResponse.json({
          success: true,
          status: result.status,
          output: result.output,
        })
      }

      case 'health': {
        // Verifier la sante de l'endpoint (nombre de workers actifs)
        const response = await fetch(`${endpoint}/health`, {
          headers: {
            'Authorization': `Bearer ${RUNPOD_API_KEY}`,
          },
        })

        const result = await response.json()
        return NextResponse.json({
          success: true,
          workers: result.workers,
          // workers: { idle, running, throttled }
        })
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Action non supportee' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('[RunPod Serverless] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur RunPod' },
      { status: 500 }
    )
  }
}

// GET pour verifier le statut de l'endpoint
export async function GET() {
  if (!RUNPOD_API_KEY || !RUNPOD_SERVERLESS_ID) {
    return NextResponse.json({
      configured: false,
      message: 'RunPod non configure - ajouter RUNPOD_API_KEY et RUNPOD_SERVERLESS_ID',
    })
  }

  try {
    const endpoint = `https://api.runpod.ai/v2/${RUNPOD_SERVERLESS_ID}/health`
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${RUNPOD_API_KEY}`,
      },
    })

    const result = await response.json()
    
    return NextResponse.json({
      configured: true,
      serverlessId: RUNPOD_SERVERLESS_ID,
      health: result,
      billing: 'pay-per-second (facture uniquement quand GPU actif)',
    })
  } catch (error) {
    return NextResponse.json({
      configured: true,
      serverlessId: RUNPOD_SERVERLESS_ID,
      error: 'Impossible de verifier la sante',
    })
  }
}
