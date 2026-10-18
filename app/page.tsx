'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Command,
  Link2,
  ListTodo,
  MapPin,
  Maximize2,
  Mic,
  Minimize2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Sparkles,
  Sun,
  SunMedium,
  X,
} from 'lucide-react'

const GOOGLE_CALENDAR_EMAIL = 'zaporawojciech@gmail.com'

interface HourlyForecastItem {
  hour: string
  temp: number
  code: number
}

interface CalendarEventItem {
  id?: string
  time: string
  title: string
  meta: string
  type: string
  active: boolean
  dateStr?: string
}

const fallbackHourlyForecast: HourlyForecastItem[] = [
  { hour: '07:00', temp: 7, code: 2 },
  { hour: '08:00', temp: 9, code: 2 },
  { hour: '09:00', temp: 11, code: 1 },
  { hour: '10:00', temp: 13, code: 1 },
  { hour: '11:00', temp: 14, code: 0 },
  { hour: '12:00', temp: 15, code: 0 },
  { hour: '13:00', temp: 16, code: 1 },
  { hour: '14:00', temp: 16, code: 1 },
  { hour: '15:00', temp: 15, code: 2 },
  { hour: '16:00', temp: 14, code: 2 },
  { hour: '17:00', temp: 12, code: 3 },
  { hour: '18:00', temp: 11, code: 2 },
]

function getWeatherLabel(code: number): string {
  if (code === 0) return 'Bezchmurnie'
  if (code === 1 || code === 2) return 'Pogodnie'
  if (code === 3) return 'Zachmurzenie'
  if (code === 45 || code === 48) return 'Mgła'
  if (code >= 51 && code <= 67) return 'Opady deszczu'
  if (code >= 71 && code <= 77) return 'Opady śniegu'
  if (code >= 80 && code <= 82) return 'Przelotny deszcz'
  if (code >= 95) return 'Burza'
  return 'Umiarkowanie'
}

function WeatherIcon({ code, size = 14 }: { code: number; size?: number }) {
  if (code === 0) return <Sun size={size} className="text-[#e5c07b]" />
  if (code === 1 || code === 2) return <CloudSun size={size} className="text-[#d8d8d6]" />
  if (code === 45 || code === 48) return <CloudFog size={size} className="text-[#8e9092]" />
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82))
    return <CloudRain size={size} className="text-[#8ab4f8]" />
  if (code >= 71 && code <= 86) return <CloudSnow size={size} className="text-[#cbe1ff]" />
  if (code >= 95) return <CloudLightning size={size} className="text-[#e5c07b]" />
  return <Cloud size={size} className="text-[#9a9c9e]" />
}

const weekDays = [
  { day: 'Pon', date: 12, count: 4, focus: 'Porządek i plan' },
  { day: 'Wt', date: 13, count: 5, focus: 'Spotkania zespołu' },
  { day: 'Śr', date: 14, count: 5, focus: 'Praca głęboka · Atlas' },
  { day: 'Czw', date: 15, count: 3, focus: 'Warsztaty produktowe' },
  { day: 'Pt', date: 16, count: 4, focus: 'Podsumowanie tygodnia' },
  { day: 'Sob', date: 17, count: 2, focus: 'Odpoczynek i dom' },
  { day: 'Nd', date: 18, count: 1, focus: 'Spokojny wieczór' },
]

const initialEvents: CalendarEventItem[] = [
  { time: '08:30', title: 'Poranny spacer', meta: 'Rutyna · 30 min', type: 'routine', active: true },
  { time: '10:00', title: 'Praca głęboka', meta: 'Projekt Atlas · 2 godz.', type: 'work', active: false },
  { time: '12:30', title: 'Lunch z Martą', meta: 'Bistro Młyńska · 1 godz.', type: 'personal', active: false },
  { time: '15:00', title: 'Odebrać paczkę', meta: 'Zadanie · do wykonania', type: 'task', active: false },
  { time: '18:30', title: 'Wieczorna rutyna', meta: 'Dom · 45 min', type: 'routine', active: false },
]

const initialRoutines = [
  { id: 1, title: 'Nawodnić rośliny', subtitle: 'Rutyna poranna', done: true },
  { id: 2, title: 'Przygotować listę zakupów', subtitle: 'Do końca dnia', done: false },
  { id: 3, title: 'Zamówić filtry do wody', subtitle: 'Bez terminu', done: false },
  { id: 4, title: 'Przewietrzyć sypialnię', subtitle: 'Rutyna wieczorna', done: false },
]

const calendarCells = [
  ...Array.from({ length: 3 }, () => null),
  ...Array.from({ length: 31 }, (_, index) => index + 1),
]

export default function Page() {
  const [selectedDate, setSelectedDate] = useState(18)
  const [view, setView] = useState<'Dzień' | 'Tydzień'>('Dzień')
  const [events, setEvents] = useState<CalendarEventItem[]>(initialEvents)
  const [allMonthEvents, setAllMonthEvents] = useState<CalendarEventItem[]>([])
  const [routines, setRoutines] = useState(initialRoutines)
  const [showComposer, setShowComposer] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('20:00')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [ambientDim, setAmbientDim] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [assistantPrompt, setAssistantPrompt] = useState('„Zaplanuj mi spokojne popołudnie”')
  const [currentTime, setCurrentTime] = useState('21:30')
  const [currentWeather, setCurrentWeather] = useState<{ temp: number; code: number }>({
    temp: 11,
    code: 2,
  })
  const [hourlyForecast, setHourlyForecast] =
    useState<HourlyForecastItem[]>(fallbackHourlyForecast)

  // Google Calendar state (zaporawojciech@gmail.com)
  const [gcalConnected, setGcalConnected] = useState(false)
  const [gcalLoading, setGcalLoading] = useState(false)
  const [showGcalModal, setShowGcalModal] = useState(false)
  const [icalInput, setIcalInput] = useState('')
  const [oauthTokenInput, setOauthTokenInput] = useState('')
  const [googleClientIdInput, setGoogleClientIdInput] = useState(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''
  )
  const [gcalStatusMsg, setGcalStatusMsg] = useState('')

  const completed = useMemo(() => events.filter((event) => event.active).length, [events])
  const progressPercent = useMemo(
    () => (events.length > 0 ? Math.round((completed / events.length) * 100) : 0),
    [completed, events.length]
  )

  const datesWithGoogleEvents = useMemo(() => {
    const set = new Set<number>()
    for (const ev of allMonthEvents) {
      if (ev.dateStr) {
        const dayNum = Number(ev.dateStr.split('-')[2])
        if (!Number.isNaN(dayNum)) set.add(dayNum)
      }
    }
    return set
  }, [allMonthEvents])

  const syncGoogleCalendar = useCallback(
    async (day: number, customIcal?: string, customToken?: string) => {
      setGcalLoading(true)
      try {
        const year = new Date().getFullYear()
        const month = String(new Date().getMonth() + 1).padStart(2, '0')
        const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`

        const savedIcal =
          customIcal !== undefined
            ? customIcal
            : typeof window !== 'undefined'
              ? localStorage.getItem('gcal_ical_url') || ''
              : ''
        const savedToken =
          customToken !== undefined
            ? customToken
            : typeof window !== 'undefined'
              ? localStorage.getItem('gcal_oauth_token') || ''
              : ''

        const params = new URLSearchParams({ date: dateStr })
        if (savedIcal) params.set('icalUrl', savedIcal)

        const res = await fetch(`/api/calendar?${params.toString()}`, {
          headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : undefined,
        })
        if (!res.ok) return
        const data = await res.json()

        if (data.connected) {
          setGcalConnected(true)
          setGcalStatusMsg(`Połączono z ${GOOGLE_CALENDAR_EMAIL}`)
          if (Array.isArray(data.allMonthEvents)) {
            setAllMonthEvents(data.allMonthEvents)
          }
          if (Array.isArray(data.events) && data.events.length > 0) {
            setEvents(data.events)
          } else if (Array.isArray(data.events)) {
            setEvents([])
          }
        } else {
          setGcalConnected(false)
          if (data.message) setGcalStatusMsg(data.message)
        }
      } catch {
        // Ignoruj błędy sieciowe w trybie offline
      } finally {
        setGcalLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedIcal = localStorage.getItem('gcal_ical_url') || ''
      const savedToken = localStorage.getItem('gcal_oauth_token') || ''
      const savedClientId =
        localStorage.getItem('gcal_client_id') ||
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        ''
      setIcalInput(savedIcal)
      setOauthTokenInput(savedToken)
      setGoogleClientIdInput(savedClientId)
    }
    syncGoogleCalendar(selectedDate)
  }, [selectedDate, syncGoogleCalendar])

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
        })
      )
    }
    updateClock()
    const timer = setInterval(updateClock, 15000)

    // Pobierz aktualną pogodę dla Mińska Mazowieckiego (52.1794° N, 21.5725° E)
    // oraz 12 kolejnych godzin dziennych (z pominięciem godzin nocnych 22:00 - 06:00)
    const fetchMinskWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=52.1794&longitude=21.5725&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&timezone=Europe%2FWarsaw&forecast_days=3'
        )
        if (!res.ok) return
        const data = await res.json()

        if (data?.current) {
          setCurrentWeather({
            temp: Math.round(data.current.temperature_2m),
            code: data.current.weather_code ?? 1,
          })
        }

        if (data?.hourly?.time && data?.hourly?.temperature_2m) {
          const now = new Date()
          const currentHourTimestamp = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            now.getHours(),
            0,
            0
          ).getTime()

          const nextDaytimeHours: HourlyForecastItem[] = []

          for (let i = 0; i < data.hourly.time.length; i++) {
            const isoTime: string = data.hourly.time[i]
            const itemDate = new Date(isoTime)
            if (itemDate.getTime() < currentHourTimestamp) continue

            const hourNum = itemDate.getHours()
            // Pomijamy godziny nocne 22:00 - 06:00 (zostawiamy godziny dzienne 07:00 - 21:00)
            if (hourNum >= 22 || hourNum <= 6) continue

            const hourLabel = `${String(hourNum).padStart(2, '0')}:00`
            nextDaytimeHours.push({
              hour: hourLabel,
              temp: Math.round(data.hourly.temperature_2m[i]),
              code: data.hourly.weather_code?.[i] ?? 1,
            })

            if (nextDaytimeHours.length >= 12) break
          }

          if (nextDaytimeHours.length > 0) {
            setHourlyForecast(nextDaytimeHours)
          }
        }
      } catch {
        // Zachowaj dane zapasowe w trybie offline
      }
    }

    fetchMinskWeather()
    const weatherTimer = setInterval(fetchMinskWeather, 15 * 60 * 1000)

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      clearInterval(timer)
      clearInterval(weatherTimer)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  function handleSaveGcalSettings() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gcal_ical_url', icalInput.trim())
      localStorage.setItem('gcal_oauth_token', oauthTokenInput.trim())
      localStorage.setItem('gcal_client_id', googleClientIdInput.trim())
    }
    syncGoogleCalendar(selectedDate, icalInput.trim(), oauthTokenInput.trim())
    setShowGcalModal(false)
  }

  function startGoogleOAuthPopup() {
    const clientId = googleClientIdInput.trim()
    if (!clientId) {
      setGcalStatusMsg(
        'Aby użyć logowania OAuth jednym kliknięciem, wpisz Google OAuth Client ID poniżej lub wklej bezpośrednio Tajny adres w formacie iCal (.ics).'
      )
      return
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('gcal_client_id', clientId)
    }

    const redirectUri = window.location.origin
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar.events')
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${scope}&login_hint=${encodeURIComponent(
      GOOGLE_CALENDAR_EMAIL
    )}&prompt=consent`

    window.location.href = authUrl
  }

  // Odbierz token OAuth z hash URL po przekierowaniu z Google
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.location.hash.includes('access_token=')) {
      const params = new URLSearchParams(window.location.hash.slice(1))
      const token = params.get('access_token')
      if (token) {
        localStorage.setItem('gcal_oauth_token', token)
        setOauthTokenInput(token)
        window.history.replaceState(null, '', window.location.pathname)
        syncGoogleCalendar(selectedDate, undefined, token)
      }
    }
  }, [selectedDate, syncGoogleCalendar])

  async function toggleFullscreen() {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (mode: string) => Promise<void>
        }
        await orientation?.lock?.('landscape').catch(() => {})
      } catch {
        document.documentElement.requestFullscreen?.().catch(() => {})
      }
    } else {
      document.exitFullscreen?.().catch(() => {})
    }
  }

  function toggleEvent(index: number) {
    setEvents((current) =>
      current.map((event, eventIndex) =>
        eventIndex === index ? { ...event, active: !event.active } : event
      )
    )
  }

  function toggleRoutine(id: number) {
    setRoutines((current) =>
      current.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    )
  }

  async function addTask() {
    if (!newTask.trim()) return
    const title = newTask.trim()
    const time = newTaskTime || '20:00'

    setEvents((current) => [
      ...current,
      {
        time,
        title,
        meta: gcalConnected
          ? `${GOOGLE_CALENDAR_EMAIL} · dodane teraz`
          : 'Zadanie · dodane teraz',
        type: 'task',
        active: false,
      },
    ])
    setNewTask('')
    setShowComposer(false)

    // Jeśli mamy token OAuth, zapisz wydarzenie również bezpośrednio w Kalendarzu Google zaporawojciech@gmail.com
    const savedToken =
      typeof window !== 'undefined' ? localStorage.getItem('gcal_oauth_token') : null
    if (savedToken) {
      const year = new Date().getFullYear()
      const month = String(new Date().getMonth() + 1).padStart(2, '0')
      const dateStr = `${year}-${month}-${String(selectedDate).padStart(2, '0')}`
      await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${savedToken}`,
        },
        body: JSON.stringify({ title, dateStr, time }),
      }).catch(() => {})
      syncGoogleCalendar(selectedDate)
    }
  }

  return (
    <main
      className={`pwa-safe-area flex h-dvh w-dvw flex-col overflow-hidden bg-[#0d0e0f] text-[#eee] transition-opacity duration-500 selection:bg-[#444] ${
        ambientDim ? 'brightness-75' : ''
      }`}
    >
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-4">
        {/* Top Bar — Horizontal Tablet Header */}
        <header className="flex shrink-0 items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#151617]/90 px-5 py-2.5 backdrop-blur-md">
          <div className="flex min-w-0 flex-1 items-center gap-5">
            {/* Greeting */}
            <div className="shrink-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#737578]">
                Dzisiaj · {selectedDate} października · {currentTime}
              </p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-[-0.04em] text-[#f3f3f1]">
                Dzień dobry, Wojtek.
              </h1>
            </div>

            <div className="hidden h-9 w-px shrink-0 bg-white/[0.08] md:block" />

            {/* Horizontal Weather Widget — Mińsk Mazowiecki (Aktualna + 12h dziennych bez 22:00-06:00) */}
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/[0.07] bg-[#1b1c1d] px-3 py-1.5">
              {/* Current weather in Mińsk Mazowiecki */}
              <div className="flex shrink-0 items-center gap-2.5 border-r border-white/[0.08] pr-3">
                <div className="flex size-8 items-center justify-center rounded-lg bg-[#252628]">
                  <WeatherIcon code={currentWeather.code} size={17} />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-[#7c7e81]">
                    <MapPin size={10} className="text-[#8e9092]" />
                    <span>Mińsk Maz.</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-semibold tabular-nums text-[#f3f3f1]">
                      {currentWeather.temp}°C
                    </span>
                    <span className="text-[11px] text-[#8e9092]">
                      {getWeatherLabel(currentWeather.code)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 12-hour horizontal daytime forecast (skipping 22:00 - 06:00) */}
              <div className="custom-scroll flex min-w-0 flex-1 items-center justify-between gap-1 overflow-x-auto py-0.5">
                {hourlyForecast.map((slot) => (
                  <div
                    key={slot.hour}
                    className="flex min-w-[42px] shrink-0 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 transition hover:bg-white/[0.05]"
                  >
                    <span className="text-[10px] tabular-nums text-[#77797c]">{slot.hour}</span>
                    <WeatherIcon code={slot.code} size={13} />
                    <span className="text-[11px] font-medium tabular-nums text-[#e2e2e0]">
                      {slot.temp}°
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setAmbientDim((prev) => !prev)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition active:scale-[0.98] ${
                ambientDim
                  ? 'border-white/[0.22] bg-white/[0.1] text-white'
                  : 'border-white/[0.1] bg-[#1b1c1d] text-[#a7a8a8] hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <SunMedium size={15} />
              <span className="hidden xl:inline">
                {ambientDim ? 'Tryb nocny: Wł.' : 'Tryb nocny'}
              </span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-[#1b1c1d] px-3 py-2.5 text-xs font-medium text-[#a7a8a8] transition hover:bg-white/[0.06] hover:text-white active:scale-[0.98]"
              title="Przełącz pełny ekran PWA (ukryj pasek baterii i nawigacji)"
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span className="hidden xl:inline">{isFullscreen ? 'Okno' : 'Pełny ekran'}</span>
            </button>

            <button
              onClick={() => setShowComposer(true)}
              className="flex items-center gap-2 rounded-xl bg-[#e9e9e7] px-4 py-2.5 text-xs font-semibold text-[#171819] transition hover:bg-white active:scale-[0.98]"
            >
              <Plus size={15} />
              <span>Dodaj</span>
            </button>
          </div>
        </header>

        {/* Main 3-Column Horizontal Tablet Workspace */}
        <section className="grid min-h-0 flex-1 grid-cols-12 gap-4">
          {/* Column 1: Compact Calendar & Day Summary (4 cols) */}
          <div className="col-span-4 flex min-h-0 flex-col gap-4">
            {/* Compact Calendar Card */}
            <div className="flex flex-1 flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#151617] p-4">
              <div>
                <div className="mb-3 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#1b1c1d] px-2 py-1.5">
                  <button
                    onClick={() => setSelectedDate((d) => Math.max(1, d - 1))}
                    className="flex size-8 items-center justify-center rounded-lg text-[#85878a] transition hover:bg-white/[0.06] hover:text-white active:scale-95"
                    aria-label="Poprzedni dzień"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="flex items-center gap-2 text-xs font-medium text-[#e2e2e0]">
                    <CalendarDays size={14} className="text-[#85878a]" />
                    <span>Październik 2026</span>
                  </div>
                  <button
                    onClick={() => setSelectedDate((d) => Math.min(31, d + 1))}
                    className="flex size-8 items-center justify-center rounded-lg text-[#85878a] transition hover:bg-white/[0.06] hover:text-white active:scale-95"
                    aria-label="Następny dzień"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-[#66686b]">
                  {weekDays.map((item) => (
                    <span key={item.date} className="py-1">
                      {item.day}
                    </span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((date, index) => {
                    const hasEvent = date ? datesWithGoogleEvents.has(date) || date === 18 : false
                    return (
                      <button
                        key={index}
                        onClick={() => date && setSelectedDate(date)}
                        disabled={!date}
                        className={`relative flex h-8 items-center justify-center rounded-lg text-xs tabular-nums transition xl:h-9 ${
                          date === selectedDate
                            ? 'bg-[#eeeeec] font-semibold text-[#171819] shadow-sm'
                            : date === 18
                              ? 'bg-white/[0.05] text-[#f2f2f0]'
                              : 'text-[#888a8c] hover:bg-white/[0.06] hover:text-white'
                        } ${
                          hasEvent && date !== selectedDate
                            ? 'after:absolute after:bottom-1 after:size-1 after:rounded-full after:bg-[#999]'
                            : ''
                        }`}
                      >
                        {date}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3">
                <button
                  className="text-xs font-medium text-[#8e9092] transition hover:text-white"
                  onClick={() => setSelectedDate(18)}
                >
                  Wróć do dziś
                </button>
                <button
                  type="button"
                  onClick={() => setShowGcalModal(true)}
                  className="flex items-center gap-1.5 text-[11px] text-[#8e9092] transition hover:text-white"
                  title="Konfiguracja synchronizacji Kalendarza Google"
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      gcalConnected ? 'bg-emerald-400' : 'bg-[#888]'
                    }`}
                  />
                  <span className="truncate max-w-[165px]">{GOOGLE_CALENDAR_EMAIL}</span>
                </button>
              </div>
            </div>

            {/* Day Stats Summary Card */}
            <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-[#151617] p-4">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#737578]">
                    Twój dzień
                  </p>
                  <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-[#f3f3f1]">
                    {selectedDate} października
                  </h2>
                </div>
                <button
                  onClick={() => setShowGcalModal(true)}
                  className="rounded-lg p-1.5 text-[#77797c] transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Ustawienia Kalendarza Google"
                >
                  <MoreHorizontal size={17} />
                </button>
              </div>

              <div className="mb-3.5 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#292a2b]">
                  <div
                    className="h-full rounded-full bg-[#d8d8d6] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-[#737578]">
                  {completed}/{events.length} gotowe
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-[#1d1e1f] py-2.5">
                  <p className="text-base font-semibold text-[#f3f3f1]">{events.length}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#6f7174]">
                    wydarzeń
                  </p>
                </div>
                <div className="rounded-xl bg-[#1d1e1f] py-2.5">
                  <p className="text-base font-semibold text-[#f3f3f1]">2h</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#6f7174]">
                    skupienia
                  </p>
                </div>
                <div className="rounded-xl bg-[#1d1e1f] py-2.5">
                  <p className="text-base font-semibold text-[#f3f3f1]">
                    {routines.filter((r) => !r.done).length}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#6f7174]">
                    zadania
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Column 2: Center Timeline / Schedule View (5 cols) */}
          <div className="col-span-5 flex min-h-0 flex-col rounded-2xl border border-white/[0.08] bg-[#151617] p-5">
            <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#737578]">
                    Harmonogram
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowGcalModal(true)}
                    className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#1b1c1d] px-2 py-0.5 text-[10px] text-[#9a9c9e] transition hover:border-white/[0.2] hover:text-white"
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        gcalConnected ? 'bg-emerald-400' : 'bg-amber-400/80'
                      }`}
                    />
                    <span className="truncate">{GOOGLE_CALENDAR_EMAIL}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => syncGoogleCalendar(selectedDate)}
                    className="rounded-md p-1 text-[#77797c] transition hover:bg-white/[0.06] hover:text-white"
                    title="Odśwież Kalendarz Google"
                  >
                    <RefreshCw size={12} className={gcalLoading ? 'animate-spin text-white' : ''} />
                  </button>
                </div>
                <h2 className="mt-0.5 text-base font-semibold text-[#f3f3f1]">
                  {view === 'Dzień' ? 'Oś czasu dnia' : 'Przegląd tygodnia'}
                </h2>
              </div>

              <div className="flex shrink-0 rounded-xl border border-white/[0.08] bg-[#0d0e0f] p-1">
                <button
                  onClick={() => setView('Dzień')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                    view === 'Dzień'
                      ? 'bg-[#303132] text-white shadow-sm'
                      : 'text-[#77797c] hover:text-white'
                  }`}
                >
                  Dzień
                </button>
                <button
                  onClick={() => setView('Tydzień')}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
                    view === 'Tydzień'
                      ? 'bg-[#303132] text-white shadow-sm'
                      : 'text-[#77797c] hover:text-white'
                  }`}
                >
                  Tydzień
                </button>
              </div>
            </div>

            {view === 'Dzień' ? (
              events.length > 0 ? (
                <div className="custom-scroll relative flex min-h-0 flex-1 flex-col overflow-y-auto pl-2 pr-1">
                  {events.map((event, index) => (
                    <div
                      key={`${event.title}-${index}`}
                      onClick={() => toggleEvent(index)}
                      className="group flex cursor-pointer gap-4 border-l border-white/[0.09] pb-3.5 pl-5 last:pb-1"
                    >
                      <div
                        className={`absolute -ml-[25px] mt-3.5 size-2.5 rounded-full border-2 border-[#151617] transition ${
                          event.active
                            ? 'bg-[#eee] ring-2 ring-[#eee]/30'
                            : 'bg-[#666] ring-1 ring-[#666]/40 group-hover:bg-[#999]'
                        }`}
                      />
                      <div className="w-12 shrink-0 pt-2.5 text-xs font-medium tabular-nums text-[#7c7e81]">
                        {event.time}
                      </div>
                      <div
                        className={`flex flex-1 items-center justify-between rounded-xl border px-4 py-3 transition active:scale-[0.99] ${
                          event.active
                            ? 'border-white/[0.05] bg-[#1a1b1c]/60'
                            : 'border-white/[0.08] bg-[#1b1c1d] group-hover:border-white/[0.16]'
                        }`}
                      >
                        <div>
                          <p
                            className={`text-sm font-medium transition ${
                              event.active ? 'text-[#7e8082] line-through' : 'text-[#ededeb]'
                            }`}
                          >
                            {event.title}
                          </p>
                          <p className="mt-0.5 text-xs text-[#6f7174]">{event.meta}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleEvent(index)
                          }}
                          className={`flex size-8 items-center justify-center rounded-full transition ${
                            event.active
                              ? 'bg-[#dededc] text-[#171819]'
                              : 'text-[#686a6d] hover:bg-white/[0.08] hover:text-white'
                          }`}
                          aria-label={
                            event.active ? 'Oznacz jako nieukończone' : 'Oznacz jako ukończone'
                          }
                        >
                          {event.active ? <Check size={15} /> : <Circle size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] p-6 text-center">
                  <p className="text-sm font-medium text-[#bfc0be]">
                    Brak zaplanowanych wydarzeń na {selectedDate} października
                  </p>
                  <p className="mt-1 text-xs text-[#6f7174]">
                    Kalendarz Google ({GOOGLE_CALENDAR_EMAIL}) nie zawiera wpisów w tym dniu.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowComposer(true)}
                    className="mt-4 flex items-center gap-1.5 rounded-xl bg-white/[0.08] px-3.5 py-2 text-xs font-medium text-white hover:bg-white/[0.14]"
                  >
                    <Plus size={14} /> Dodaj wydarzenie
                  </button>
                </div>
              )
            ) : (
              <div className="custom-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                {weekDays.map((item) => {
                  const isSelected = item.date === selectedDate
                  return (
                    <button
                      key={item.date}
                      onClick={() => {
                        setSelectedDate(item.date)
                        setView('Dzień')
                      }}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-white/[0.2] bg-[#222325] text-white'
                          : 'border-white/[0.07] bg-[#1b1c1d] text-[#bfc0be] hover:border-white/[0.14]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`flex size-10 flex-col items-center justify-center rounded-lg text-xs font-semibold ${
                            isSelected
                              ? 'bg-[#eeeeec] text-[#171819]'
                              : 'bg-[#151617] text-[#9a9c9e]'
                          }`}
                        >
                          <span className="text-[10px] uppercase opacity-75">{item.day}</span>
                          <span>{item.date}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#ededeb]">{item.focus}</p>
                          <p className="mt-0.5 text-xs text-[#6f7174]">
                            {GOOGLE_CALENDAR_EMAIL} · kliknij, aby otworzyć dzień
                          </p>
                        </div>
                      </div>
                      <span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs tabular-nums text-[#9a9c9e]">
                        {item.count} wyd.
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Column 3: Routines & Voice Assistant Dock (3 cols) */}
          <aside className="col-span-3 flex min-h-0 flex-col gap-4">
            {/* Routines & Tasks Card */}
            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/[0.08] bg-[#151617] p-4">
              <div className="mb-3.5 flex shrink-0 items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo size={16} className="text-[#929497]" />
                  <h2 className="text-sm font-semibold text-[#f3f3f1]">Rutyny i zadania</h2>
                </div>
                <button
                  onClick={() => setShowComposer(true)}
                  className="text-xs font-medium text-[#8d8f91] transition hover:text-white"
                >
                  + Dodaj
                </button>
              </div>

              <div className="custom-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                {routines.map((routine) => (
                  <button
                    key={routine.id}
                    type="button"
                    onClick={() => toggleRoutine(routine.id)}
                    className="flex w-full items-start gap-3 rounded-xl border border-white/[0.06] bg-[#1b1c1d] p-3 text-left transition hover:border-white/[0.14] active:scale-[0.99]"
                  >
                    <div
                      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full transition ${
                        routine.done
                          ? 'bg-[#dededc] text-[#171819]'
                          : 'border border-[#55575a] text-transparent'
                      }`}
                    >
                      <Check size={12} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm transition ${
                          routine.done ? 'text-[#7e8082] line-through' : 'text-[#d7d7d5]'
                        }`}
                      >
                        {routine.title}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#616366]">{routine.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Voice Assistant Card */}
            <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-[#151617] p-4">
              <div className="flex items-center justify-between text-[#9a9c9e]">
                <div className="flex items-center gap-2">
                  <Mic size={16} className={isListening ? 'animate-pulse text-white' : ''} />
                  <span className="text-xs font-medium">Zapytaj swojego asystenta</span>
                </div>
                <Sparkles size={14} className="text-[#6f7174]" />
              </div>

              <p className="mt-2.5 text-sm leading-relaxed text-[#9a9c9e]">{assistantPrompt}</p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  '„Zaplanuj mi spokojne popołudnie”',
                  '„Przesuń blok pracy na 11:00”',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setAssistantPrompt(suggestion)}
                    className="rounded-lg border border-white/[0.06] bg-[#1b1c1d] px-2.5 py-1 text-[11px] text-[#77797c] transition hover:border-white/[0.15] hover:text-[#bfc0be]"
                  >
                    {suggestion.replace(/[„”]/g, '')}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsListening((prev) => !prev)}
                className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-medium transition active:scale-[0.99] ${
                  isListening
                    ? 'bg-[#e9e9e7] text-[#171819]'
                    : 'bg-[#252627] text-[#bfc0be] hover:bg-[#303132]'
                }`}
              >
                <Command size={14} />
                <span>{isListening ? 'Słucham… dotknij, aby zakończyć' : 'Naciśnij, aby mówić'}</span>
              </button>
            </div>
          </aside>
        </section>
      </div>

      {/* Modal: Dodaj zadanie / wydarzenie */}
      {showComposer && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#1b1c1d] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-[#f3f3f1]">Dodaj do planu dnia</h2>
                <p className="text-[11px] text-[#77797c]">
                  {selectedDate} października · {GOOGLE_CALENDAR_EMAIL}
                </p>
              </div>
              <button
                onClick={() => setShowComposer(false)}
                className="rounded-lg p-1 text-[#85878a] hover:bg-white/[0.06] hover:text-white"
                aria-label="Zamknij"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex gap-2.5">
              <input
                type="time"
                value={newTaskTime}
                onChange={(event) => setNewTaskTime(event.target.value)}
                className="w-28 rounded-xl border border-white/[0.1] bg-[#121314] px-3 py-3 text-sm text-white outline-none focus:border-white/[0.3]"
              />
              <input
                autoFocus
                value={newTask}
                onChange={(event) => setNewTask(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addTask()}
                placeholder="Np. spotkanie projektowe"
                className="flex-1 rounded-xl border border-white/[0.1] bg-[#121314] px-4 py-3 text-sm text-white outline-none placeholder:text-[#5c5e60] focus:border-white/[0.3]"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowComposer(false)}
                className="rounded-xl px-4 py-2.5 text-xs text-[#85878a] hover:text-white"
              >
                Anuluj
              </button>
              <button
                onClick={addTask}
                className="rounded-xl bg-[#e9e9e7] px-4 py-2.5 text-xs font-semibold text-[#171819] transition hover:bg-white"
              >
                Dodaj zadanie
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Połączenie z Kalendarzem Google (zaporawojciech@gmail.com) */}
      {showGcalModal && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#1b1c1d] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-white/[0.07]">
                  <Link2 size={17} className="text-[#e9e9e7]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#f3f3f1]">
                    Kalendarz Google · {GOOGLE_CALENDAR_EMAIL}
                  </h2>
                  <p className="text-xs text-[#7c7e81]">
                    Synchronizacja wydarzeń z kontem {GOOGLE_CALENDAR_EMAIL}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGcalModal(false)}
                className="rounded-lg p-1 text-[#85878a] hover:bg-white/[0.06] hover:text-white"
                aria-label="Zamknij"
              >
                <X size={18} />
              </button>
            </div>

            {gcalStatusMsg && (
              <div className="mb-4 rounded-xl border border-white/[0.08] bg-[#121314] px-3.5 py-2.5 text-xs text-[#bfc0be]">
                {gcalStatusMsg}
              </div>
            )}

            <div className="flex flex-col gap-4">
              {/* Opcja 1: Tajny adres iCal (.ics) — działa od razu bez Google Cloud Console */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[#d7d7d5]">
                  1. Tajny adres w formacie iCal (.ics) dla {GOOGLE_CALENDAR_EMAIL}
                </label>
                <input
                  value={icalInput}
                  onChange={(e) => setIcalInput(e.target.value)}
                  placeholder="https://calendar.google.com/calendar/ical/zaporawojciech%40gmail.com/private-.../basic.ics"
                  className="w-full rounded-xl border border-white/[0.1] bg-[#121314] px-3.5 py-2.5 text-xs text-white outline-none placeholder:text-[#55575a] focus:border-white/[0.3]"
                />
                <p className="mt-1 text-[11px] text-[#6f7174]">
                  Znajdziesz go w: Ustawienia Kalendarza Google → {GOOGLE_CALENDAR_EMAIL} →
                  Integrowanie kalendarza → Tajny adres w formacie iCal.
                </p>
              </div>

              {/* Opcja 2: Google OAuth 2.0 (pełny odczyt i zapis) */}
              <div className="border-t border-white/[0.07] pt-3.5">
                <label className="mb-1.5 block text-xs font-medium text-[#d7d7d5]">
                  2. Pełna synchronizacja dwukierunkowa (OAuth 2.0)
                </label>
                <div className="flex gap-2">
                  <input
                    value={googleClientIdInput}
                    onChange={(e) => setGoogleClientIdInput(e.target.value)}
                    placeholder="Google OAuth Client ID (opcjonalnie)"
                    className="flex-1 rounded-xl border border-white/[0.1] bg-[#121314] px-3.5 py-2 text-xs text-white outline-none placeholder:text-[#55575a] focus:border-white/[0.3]"
                  />
                  <button
                    type="button"
                    onClick={startGoogleOAuthPopup}
                    className="shrink-0 rounded-xl border border-white/[0.14] bg-[#252628] px-3.5 py-2 text-xs font-medium text-white transition hover:bg-[#303133]"
                  >
                    Autoryzuj z Google
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGcalModal(false)}
                className="rounded-xl px-4 py-2 text-xs text-[#85878a] hover:text-white"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleSaveGcalSettings}
                className="rounded-xl bg-[#e9e9e7] px-4 py-2 text-xs font-semibold text-[#171819] transition hover:bg-white"
              >
                Zapisz i synchronizuj
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
