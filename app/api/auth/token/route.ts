import { NextRequest, NextResponse } from 'next/server'

export const HARDCODED_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  ['830194892733', 'f3l35ir305lvmip8qhptatjdg29gn85k.apps.googleusercontent.com'].join('-')

export const HARDCODED_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || ''

export const TARGET_EMAIL = 'zaporawojciech@gmail.com'

/**
 * Obsługuje wymianę kodu autoryzacji (OAuth code) na access_token i trwały refresh_token,
 * oraz bezpośrednie odświeżanie tokenu (refresh_token grant).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code, refresh_token, redirectUri } = body

    const clientId = HARDCODED_CLIENT_ID
    const clientSecret = HARDCODED_CLIENT_SECRET

    // 1. Wymiana jednorazowego authorization_code na access_token + refresh_token
    if (code) {
      const targetRedirectUri = redirectUri || 'https://agentprv-liart.vercel.app/'

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: targetRedirectUri,
          grant_type: 'authorization_code',
        }),
        cache: 'no-store',
      })

      const data = await tokenRes.json()

      if (!tokenRes.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: data.error || 'Token exchange failed',
            error_description: data.error_description || 'Nie udało się wymienić kodu autoryzacji',
          },
          { status: tokenRes.status }
        )
      }

      return NextResponse.json({
        ok: true,
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        scope: data.scope,
        account: TARGET_EMAIL,
      })
    }

    // 2. Odświeżenie access_tokenu przy użyciu refresh_token
    const tokenToRefresh = refresh_token || process.env.GOOGLE_REFRESH_TOKEN

    if (tokenToRefresh) {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tokenToRefresh,
          grant_type: 'refresh_token',
        }),
        cache: 'no-store',
      })

      const data = await tokenRes.json()

      if (!tokenRes.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: data.error,
            error_description: data.error_description,
          },
          { status: tokenRes.status }
        )
      }

      return NextResponse.json({
        ok: true,
        access_token: data.access_token,
        expires_in: data.expires_in,
        account: TARGET_EMAIL,
      })
    }

    return NextResponse.json(
      { ok: false, error: 'Brak parametru code lub refresh_token' },
      { status: 400 }
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: 'Błąd serwera wymiany tokenów', details: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    clientId: HARDCODED_CLIENT_ID,
    account: TARGET_EMAIL,
    configured: Boolean(HARDCODED_CLIENT_ID && HARDCODED_CLIENT_SECRET),
  })
}
