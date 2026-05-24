import { NextRequest, NextResponse } from 'next/server'

const PAYDUNYA_BASE_URL = 'https://app.paydunya.com/api/v1'

interface PaymentRequest {
  plan: string
  amount: number
  points: number
  duration: string
  userEmail: string
  userName: string
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentRequest = await request.json()
    const { plan, amount, points, duration, userEmail, userName } = body

    // Verifier les cles API
    const masterKey = process.env.PAYDUNYA_MASTER_KEY
    const privateKey = process.env.PAYDUNYA_PRIVATE_KEY
    const token = process.env.PAYDUNYA_TOKEN

    if (!masterKey || !privateKey || !token) {
      console.error('[PayDunya] Missing API keys:', {
        hasMasterKey: !!masterKey,
        hasPrivateKey: !!privateKey,
        hasToken: !!token
      })
      return NextResponse.json(
        { success: false, error: 'Configuration PayDunya incomplete. Contactez le support.' },
        { status: 500 }
      )
    }

    // Configuration PayDunya
    const headers = {
      'Content-Type': 'application/json',
      'PAYDUNYA-MASTER-KEY': masterKey,
      'PAYDUNYA-PRIVATE-KEY': privateKey,
      'PAYDUNYA-TOKEN': token,
    }

    // Creer la facture PayDunya
    const invoiceData = {
      invoice: {
        total_amount: amount,
        description: `ChapCam - Plan ${plan} (${points} points, ${duration})`,
      },
      store: {
        name: 'ChapCam',
        tagline: 'Face Swap en Temps Reel',
        postal_address: 'Abidjan, Cote d\'Ivoire',
        phone: '+225 05 55 56 01 89',
        logo_url: 'https://chapcam.com/favicon.jpg',
        website_url: 'https://chapcam.com',
      },
      custom_data: {
        plan,
        points: points.toString(),
        duration,
        user_email: userEmail,
        user_name: userName,
      },
      actions: {
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chapcam.com'}/api/payment/callback`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chapcam.com'}/dashboard/payment-success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://chapcam.com'}/dashboard/recharge`,
      },
    }

    console.log('[PayDunya] Creating invoice with URL:', `${PAYDUNYA_BASE_URL}/checkout-invoice/create`)

    const response = await fetch(`${PAYDUNYA_BASE_URL}/checkout-invoice/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(invoiceData),
    })

    const data = await response.json()
    console.log('[PayDunya] Response:', data)

    if (data.response_code === '00') {
      return NextResponse.json({
        success: true,
        token: data.token,
        invoice_url: data.response_text,
      })
    } else {
      console.error('[PayDunya Error]', data)
      return NextResponse.json(
        { success: false, error: data.response_text || 'Erreur lors de la creation de la facture' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('[PayDunya Error]', error)
    return NextResponse.json(
      { success: false, error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
