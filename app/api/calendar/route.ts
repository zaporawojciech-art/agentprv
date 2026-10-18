import { NextRequest, NextResponse } from 'next/server'

const TARGET_CALENDAR_EMAIL = 'zaporawojciech@gmail.com'

interface ParsedCalendarEvent {
  id: string
  time: string
  title: string
  meta: string
  type: 'routine' | 'work' | 'personal' | 'task'
  active: boolean
  dateStr: string // YYYY-MM-DD
}

function unfoldIcsLines(icsText: string): string[] {
  return icsText.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r?\n/)
}

function parseIcsDate(rawVal: string): Date | null {
  const val = rawVal.trim()
  // Format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS or YYYYMMDD
  const match = val.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/)
  if (!match) return null
  const [, y, m, d, hh = '09', mm = '00', ss = '00', isUtc] = match
  if (isUtc === 'Z') {
    return new Date(`${y}-${m}-${d}T${hh}:${mm}:${ss}Z`)
  }
  return new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss))
}

function parseIcsEvents(icsText: string): ParsedCalendarEvent[] {
  const lines = unfoldIcsLines(icsText)
  const events: ParsedCalendarEvent[] = []
  let inEvent = false
  let uid = ''
  let summary = ''
  let location = ''
  let dtStartRaw = ''
  let dtEndRaw = ''

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      uid = ''
      summary = ''
      location = ''
      dtStartRaw = ''
      dtEndRaw = ''
      continue
    }
    if (line === 'END:VEVENT') {
      inEvent = false
      const startDate = parseIcsDate(dtStartRaw)
      if (startDate && summary) {
        const endDate = parseIcsDate(dtEndRaw)
        const durationMin =
          endDate && endDate.getTime() > startDate.getTime()
            ? Math.round((endDate.getTime() - startDate.getTime()) / 60000)
            : 60

        const durationLabel =
          durationMin >= 60
            ? `${Math.round((durationMin / 60) * 10) / 10} godz.`
            : `${durationMin} min`

        const timeFormatter = new Intl.DateTimeFormat('pl-PL', {
          timeZone: 'Europe/Warsaw',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
        const dateFormatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Warsaw',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })

        const timeStr = timeFormatter.format(startDate)
        const dateStr = dateFormatter.format(startDate)
        const cleanSummary = summary
          .replace(/\\,/g, ',')
          .replace(/\\;/g, ';')
          .replace(/\\n/g, ' ')
          .trim()
        const cleanLocation = location
          .replace(/\\,/g, ',')
          .replace(/\\;/g, ';')
          .replace(/\\n/g, ' ')
          .trim()

        events.push({
          id: uid || `${dateStr}-${timeStr}-${cleanSummary}`,
          time: timeStr,
          title: cleanSummary,
          meta: cleanLocation
            ? `${cleanLocation} · ${durationLabel}`
            : `Google Calendar · ${durationLabel}`,
          type: 'work',
          active: startDate.getTime() < Date.now(),
          dateStr,
        })
      }
      continue
    }

    if (!inEvent) continue

    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue
    const keyPart = line.slice(0, colonIndex).toUpperCase()
    const valuePart = line.slice(colonIndex + 1)

    if (keyPart === 'UID') uid = valuePart
    else if (keyPart.startsWith('SUMMARY')) summary = valuePart
    else if (keyPart.startsWith('LOCATION')) location = valuePart
    else if (keyPart.startsWith('DTSTART')) dtStartRaw = valuePart
    else if (keyPart.startsWith('DTEND')) dtEndRaw = valuePart
  }

  return events.sort((a, b) => a.time.localeCompare(b.time))
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const dateParam = searchParams.get('date') // YYYY-MM-DD
  const customIcalUrl = searchParams.get('icalUrl')
  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  // 1. Try Google Calendar REST API v3 if OAuth access token or API key is available
  const apiKey = process.env.GOOGLE_CALENDAR_API_KEY
  if (accessToken || apiKey) {
    try {
      const targetDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date()
      const timeMin = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        1,
        0,
        0,
        0
      ).toISOString()
      const timeMax = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth() + 1,
        0,
        23,
        59,
        59
      ).toISOString()

      const calendarId = encodeURIComponent(TARGET_CALENDAR_EMAIL)
      const url = new URL(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`
      )
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('orderBy', 'startTime')
      url.searchParams.set('timeMin', timeMin)
      url.searchParams.set('timeMax', timeMax)
      if (apiKey && !accessToken) {
        url.searchParams.set('key', apiKey)
      }

      const res = await fetch(url.toString(), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        cache: 'no-store',
      })

      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data.items) ? data.items : []
        const mapped: ParsedCalendarEvent[] = items.map((item: Record<string, any>) => {
          const startIso: string = item.start?.dateTime || item.start?.date || ''
          const endIso: string = item.end?.dateTime || item.end?.date || ''
          const startDate = startIso ? new Date(startIso) : new Date()
          const endDate = endIso ? new Date(endIso) : new Date(startDate.getTime() + 3600000)

          const isAllDay = Boolean(item.start?.date && !item.start?.dateTime)
          const timeStr = isAllDay
            ? 'Cały dzień'
            : startDate.toLocaleTimeString('pl-PL', {
                timeZone: 'Europe/Warsaw',
                hour: '2-digit',
                minute: '2-digit',
              })
          const dateStr = isAllDay
            ? item.start.date
            : new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Europe/Warsaw',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
              }).format(startDate)

          const durationMin = Math.max(
            15,
            Math.round((endDate.getTime() - startDate.getTime()) / 60000)
          )
          const durationLabel = isAllDay
            ? 'Cały dzień'
            : durationMin >= 60
              ? `${Math.round((durationMin / 60) * 10) / 10} godz.`
              : `${durationMin} min`

          return {
            id: String(item.id || Math.random()),
            time: timeStr,
            title: String(item.summary || 'Wydarzenie bez tytułu'),
            meta: item.location
              ? `${item.location} · ${durationLabel}`
              : `Kalendarz Google · ${durationLabel}`,
            type: 'work',
            active: endDate.getTime() < Date.now(),
            dateStr,
          }
        })

        return NextResponse.json({
          connected: true,
          source: 'google-api',
          email: TARGET_CALENDAR_EMAIL,
          events: dateParam ? mapped.filter((e) => e.dateStr === dateParam) : mapped,
          allMonthEvents: mapped,
        })
      }
    } catch {
      // Fallback to iCal below
    }
  }

  // 2. Try iCal (.ics) feed (custom URL from settings, env GOOGLE_CALENDAR_ICAL_URL, or public feed for zaporawojciech@gmail.com)
  const icalUrl =
    customIcalUrl ||
    process.env.GOOGLE_CALENDAR_ICAL_URL ||
    `https://calendar.google.com/calendar/ical/${encodeURIComponent(TARGET_CALENDAR_EMAIL)}/public/basic.ics`

  try {
    const res = await fetch(icalUrl, { cache: 'no-store' })
    if (res.ok) {
      const icsText = await res.text()
      if (icsText.includes('BEGIN:VCALENDAR')) {
        const parsed = parseIcsEvents(icsText)
        return NextResponse.json({
          connected: true,
          source: 'ical',
          email: TARGET_CALENDAR_EMAIL,
          events: dateParam ? parsed.filter((e) => e.dateStr === dateParam) : parsed,
          allMonthEvents: parsed,
        })
      }
    }
  } catch {
    // Ignore fetch error
  }

  return NextResponse.json({
    connected: false,
    email: TARGET_CALENDAR_EMAIL,
    events: [],
    allMonthEvents: [],
    message:
      'Kalendarz zaporawojciech@gmail.com jest prywatny. Połącz konto Google (OAuth) lub wklej Tajny adres w formacie iCal z ustawień Kalendarza Google.',
  })
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null

  if (!accessToken) {
    return NextResponse.json(
      { error: 'Wymagana autoryzacja OAuth do zapisu w Kalendarzu Google' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const { title, dateStr, time } = body
    const startDateTime = new Date(`${dateStr}T${time || '12:00'}:00`)
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000)

    const calendarId = encodeURIComponent(TARGET_CALENDAR_EMAIL)
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: title,
          start: { dateTime: startDateTime.toISOString() },
          end: { dateTime: endDateTime.toISOString() },
        }),
      }
    )

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: errText }, { status: res.status })
    }

    const created = await res.json()
    return NextResponse.json({ ok: true, event: created })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
