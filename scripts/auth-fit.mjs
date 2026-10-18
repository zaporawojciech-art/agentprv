import http from 'http'
import fs from 'fs'
import path from 'path'
import readline from 'readline'
import { exec } from 'child_process'

const SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/fitness.heart_rate.read',
  'https://www.googleapis.com/auth/fitness.sleep.read',
  'https://www.googleapis.com/auth/calendar.events.readonly',
].join(' ')

const TARGET_EMAIL = 'zaporawojciech@gmail.com'
const PORT = 3004
const REDIRECT_URI = `http://localhost:${PORT}/callback`

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close()
      resolve(ans.trim())
    })
  )
}

async function main() {
  console.log('\n===============================================================')
  console.log('  AUTOMATYCZNA AUTORYZACJA GOOGLE FIT DLA zaporawojciech@gmail.com')
  console.log('===============================================================\n')

  const envPath = path.resolve(process.cwd(), '.env.local')
  let envContent = ''
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  let clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId) {
    console.log('KROK 1: Potrzebujemy Google OAuth Client ID oraz Client Secret z projektu Google Cloud.')
    console.log('Utworzysz je w 1 minutę tutaj: https://console.cloud.google.com/apis/credentials\n')
    clientId = await prompt('Wklej Google Client ID: ')
  }

  if (!clientSecret) {
    clientSecret = await prompt('Wklej Google Client Secret: ')
  }

  if (!clientId || !clientSecret) {
    console.error('Błąd: Wymagane są Client ID oraz Client Secret.')
    process.exit(1)
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://localhost:${PORT}`)
      if (url.pathname === '/callback') {
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`<h1>Błąd autoryzacji: ${error}</h1><p>Zamknij to okno i spróbuj ponownie.</p>`)
          console.error(`Błąd z Google: ${error}`)
          server.close()
          return
        }

        if (code) {
          console.log('\nOdebrano kod autoryzacji z Google. Wymieniam na stały Refresh Token...')

          const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: clientId,
              client_secret: clientSecret,
              code,
              grant_type: 'authorization_code',
              redirect_uri: REDIRECT_URI,
            }),
          })

          const tokenData = await tokenRes.json()

          if (!tokenRes.ok || !tokenData.refresh_token) {
            console.error('Błąd wymiany tokenu:', tokenData)
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
            res.end(`<h1>Błąd: ${tokenData.error_description || tokenData.error || 'Brak refresh_token'}</h1>`)
            server.close()
            return
          }

          const refreshToken = tokenData.refresh_token
          console.log('\nSUKCES! Pomyślnie uzyskano Refresh Token dla zaporawojciech@gmail.com.')

          // Zapisz do .env.local
          let updatedEnv = envContent
          const appendOrReplace = (key, val) => {
            const regex = new RegExp(`^${key}=.*$`, 'm')
            if (regex.test(updatedEnv)) {
              updatedEnv = updatedEnv.replace(regex, `${key}="${val}"`)
            } else {
              updatedEnv += `\n${key}="${val}"`
            }
          }

          appendOrReplace('NEXT_PUBLIC_GOOGLE_CLIENT_ID', clientId)
          appendOrReplace('GOOGLE_CLIENT_ID', clientId)
          appendOrReplace('GOOGLE_CLIENT_SECRET', clientSecret)
          appendOrReplace('GOOGLE_REFRESH_TOKEN', refreshToken)

          fs.writeFileSync(envPath, updatedEnv.trim() + '\n')
          console.log('Zaktualizowano plik .env.local z nowym stałym tokenem GOOGLE_REFRESH_TOKEN.')

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(`
            <div style="font-family: system-ui, sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; border-radius: 12px; background: #151617; color: white;">
              <h2 style="color: #4ade80;">Autoryzacja zakończona sukcesem!</h2>
              <p>Konto <b>${TARGET_EMAIL}</b> zostało połączone z Google Fit na stałe.</p>
              <p style="color: #9ca3af; font-size: 13px;">Wszystkie dane na tablecie będą teraz odświeżać się w 100% z automatu w tle. Możesz zamknąć tę kartę.</p>
            </div>
          `)

          console.log('\nGotowe! Tablet będzie teraz pobierał dane z Google Fit całkowicie automatycznie.')
          server.close()
          process.exit(0)
        }
      }
    } catch (err) {
      console.error('Błąd serwera autoryzacji:', err)
    }
  })

  server.listen(PORT, () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&response_type=code&scope=${encodeURIComponent(
      SCOPES
    )}&access_type=offline&prompt=consent&login_hint=${encodeURIComponent(TARGET_EMAIL)}`

    console.log(`Serwer nasłuchuje na ${REDIRECT_URI}`)
    console.log(`Otwieram okno przeglądarki w celu jednorazowej zgody konta ${TARGET_EMAIL}...\n`)
    console.log(`Jeśli przeglądarka się nie otworzy, kliknij ten link:\n${authUrl}\n`)

    exec(`open "${authUrl}"`)
  })
}

main()
