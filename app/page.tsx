'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
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
  DollarSign,
  Flame,
  Footprints,
  Heart,
  Link2,
  ListTodo,
  MapPin,
  Maximize2,
  Minimize2,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Sun,
  SunMedium,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react'

const GOOGLE_CALENDAR_EMAIL = 'zaporawojciech@gmail.com'

interface HourlyForecastItem {
  id: string
  hour: string
  temp: number
  code: number
  isNow?: boolean
  isTomorrow?: boolean
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

interface StockHolding {
  id: string
  ticker: string
  name: string
  shares: number
  invested: number
  currentPrice: number
  category: 'ETF' | 'US' | 'GPW'
}

interface HuaweiHealthData {
  steps: number
  stepsGoal: number
  calories: number
  caloriesGoal: number
  activeMinutes: number
  activeMinutesGoal: number
  heartRate: number
  heartRateResting: number
  distanceKm: number
  sleepDuration: string
  sleepScore: number
}

const defaultHealthData: HuaweiHealthData = {
  steps: 8420,
  stepsGoal: 10000,
  calories: 540,
  caloriesGoal: 600,
  activeMinutes: 45,
  activeMinutesGoal: 30,
  heartRate: 64,
  heartRateResting: 58,
  distanceKm: 6.2,
  sleepDuration: '7h 35m',
  sleepScore: 86,
}

function buildDynamicFallbackForecast(): HourlyForecastItem[] {
  const now = new Date()
  const result: HourlyForecastItem[] = []
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0)
  const todayDate = now.getDate()

  for (let step = 0; step < 48 && result.length < 12; step++) {
    const h = cursor.getHours()
    if (h < 22 && h > 6) {
      const isNow = step === 0
      const isTomorrow = cursor.getDate() !== todayDate
      const hourLabel = `${String(h).padStart(2, '0')}:00`
      const sampleTemp = h >= 12 && h <= 16 ? 15 : h >= 9 && h <= 18 ? 12 : 9
      const sampleCode = h >= 11 && h <= 15 ? 0 : 1
      result.push({
        id: `${cursor.getDate()}-${hourLabel}`,
        hour: hourLabel,
        temp: sampleTemp,
        code: sampleCode,
        isNow,
        isTomorrow,
      })
    }
    cursor.setHours(cursor.getHours() + 1)
  }
  return result
}

function getWeatherLabel(code: number): string {
  if (code === 0) return 'Słonecznie'
  if (code === 1 || code === 2) return 'Pogodnie'
  if (code === 3) return 'Pochmurno'
  if (code === 45 || code === 48) return 'Mgła'
  if (code >= 51 && code <= 67) return 'Deszcz'
  if (code >= 71 && code <= 77) return 'Śnieg'
  if (code >= 80 && code <= 82) return 'Przelotny deszcz'
  if (code >= 95) return 'Burza'
  return 'Umiarkowanie'
}

function getWeatherCardClasses(_code?: number): string {
  return 'border-white/[0.08] bg-[#1a1b1e] hover:border-white/[0.18] hover:bg-[#222428]'
}

function getTempColorClass(temp: number): string {
  if (temp >= 20) return 'text-orange-400'
  if (temp >= 14) return 'text-amber-300'
  if (temp >= 9) return 'text-emerald-400'
  return 'text-zinc-200'
}

function WeatherIcon({ code, size = 26 }: { code: number; size?: number }) {
  // 0: Bezchmurnie — pełne złocisto-żółte słońce z promieniami
  if (code === 0) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className="shrink-0 drop-shadow-[0_0_8px_rgba(250,204,21,0.65)]"
      >
        <g stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round">
          <line x1="16" y1="2.5" x2="16" y2="5.5" />
          <line x1="16" y1="26.5" x2="16" y2="29.5" />
          <line x1="2.5" y1="16" x2="5.5" y2="16" />
          <line x1="26.5" y1="16" x2="29.5" y2="16" />
          <line x1="6.4" y1="6.4" x2="8.6" y2="8.6" />
          <line x1="23.4" y1="23.4" x2="25.6" y2="25.6" />
          <line x1="25.6" y1="6.4" x2="23.4" y2="8.6" />
          <line x1="8.6" y1="23.4" x2="6.4" y2="25.6" />
        </g>
        <circle cx="16" cy="16" r="7.5" fill="#FACC15" stroke="#F59E0B" strokeWidth="1.5" />
        <circle cx="14" cy="14" r="3" fill="#FEF08A" opacity="0.65" />
      </svg>
    )
  }

  // 1, 2: Pogodnie — ŻÓŁTE słońce + CZYSTA BIAŁA chmurka
  if (code === 1 || code === 2) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        className="shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]"
      >
        {/* Promienie słońca (pomarańczowo-żółte) */}
        <g stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round">
          <line x1="11" y1="3" x2="11" y2="5.2" />
          <line x1="3" y1="11" x2="5.2" y2="11" />
          <line x1="5.3" y1="5.3" x2="6.9" y2="6.9" />
          <line x1="16.7" y1="5.3" x2="15.1" y2="6.9" />
        </g>
        {/* Żółta tarcza słońca */}
        <circle cx="11.5" cy="11.5" r="5.5" fill="#FACC15" stroke="#F59E0B" strokeWidth="1.2" />
        {/* Czysto biała chmura z neutralnym obrysem */}
        <path
          d="M11 25.5H23.5C26.26 25.5 28.5 23.26 28.5 20.5C28.5 17.92 26.55 15.8 24.04 15.53C23.42 11.83 20.2 9 16.3 9C12.35 9 9.1 11.9 8.54 15.68C6.25 16.22 4.5 18.27 4.5 20.75C4.5 23.37 6.63 25.5 9.25 25.5H11Z"
          fill="#FFFFFF"
          stroke="#94A3B8"
          strokeWidth="1.2"
        />
      </svg>
    )
  }

  // 45, 48: Mgła — biało-szara chmura + neutralne pasma mgły
  if (code === 45 || code === 48) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
        <path
          d="M9.5 20H23C25.48 20 27.5 17.98 27.5 15.5C27.5 13.18 25.75 11.27 23.48 11.03C22.92 7.89 20.18 5.5 16.85 5.5C13.48 5.5 10.7 7.96 10.22 11.18C8.15 11.67 6.5 13.52 6.5 15.75C6.5 18.1 8.4 20 10.75 20H9.5Z"
          fill="#E2E8F0"
          stroke="#94A3B8"
          strokeWidth="1.2"
        />
        <line x1="6" y1="23.5" x2="26" y2="23.5" stroke="#CBD5E1" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="9" y1="27" x2="23" y2="27" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  // 51..67, 80..82: Deszcz / Przelotny deszcz — żółty akcent słońca + biała chmura + krople deszczu
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
        <circle cx="10" cy="9.5" r="4.2" fill="#FACC15" />
        <path
          d="M9.5 21H23.5C26 21 28 19 28 16.5C28 14.18 26.25 12.27 23.98 12.03C23.42 8.89 20.68 6.5 17.35 6.5C13.98 6.5 11.2 8.96 10.72 12.18C8.65 12.67 7 14.52 7 16.75C7 19.1 8.9 21 11.25 21H9.5Z"
          fill="#FFFFFF"
          stroke="#94A3B8"
          strokeWidth="1.2"
        />
        <g stroke="#38BDF8" strokeWidth="2.3" strokeLinecap="round">
          <line x1="11.5" y1="24" x2="10" y2="28" />
          <line x1="16.5" y1="24" x2="15" y2="28" />
          <line x1="21.5" y1="24" x2="20" y2="28" />
        </g>
      </svg>
    )
  }

  // 71..86: Śnieg — biała chmura + śnieg
  if (code >= 71 && code <= 86) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
        <path
          d="M9.5 21H23.5C26 21 28 19 28 16.5C28 14.18 26.25 12.27 23.98 12.03C23.42 8.89 20.68 6.5 17.35 6.5C13.98 6.5 11.2 8.96 10.72 12.18C8.65 12.67 7 14.52 7 16.75C7 19.1 8.9 21 11.25 21H9.5Z"
          fill="#FFFFFF"
          stroke="#94A3B8"
          strokeWidth="1.2"
        />
        <circle cx="11.5" cy="25.5" r="1.8" fill="#E2E8F0" />
        <circle cx="16.5" cy="27" r="1.8" fill="#E2E8F0" />
        <circle cx="21.5" cy="25.5" r="1.8" fill="#E2E8F0" />
      </svg>
    )
  }

  // >= 95: Burza — ciemniejsza chmura + żółty piorun
  if (code >= 95) {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
        <path
          d="M9.5 20.5H23.5C26 20.5 28 18.5 28 16C28 13.68 26.25 11.77 23.98 11.53C23.42 8.39 20.68 6 17.35 6C13.98 6 11.2 8.46 10.72 11.68C8.65 12.17 7 14.02 7 16.25C7 18.6 8.9 20.5 11.25 20.5H9.5Z"
          fill="#475569"
          stroke="#334155"
          strokeWidth="1.2"
        />
        <polygon
          points="17,18 12.5,24.5 16,24.5 14.5,30 21,22.5 17.2,22.5"
          fill="#FACC15"
          stroke="#F59E0B"
          strokeWidth="0.8"
        />
      </svg>
    )
  }

  // 3 (Domyślnie: Pochmurno) — eleganckie, naturalne biało-szare chmury
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className="shrink-0">
      {/* Tylna szara chmura */}
      <path
        d="M14 19H25.5C27.7 19 29.5 17.2 29.5 15C29.5 12.95 27.95 11.27 25.95 11.05C25.45 8.2 22.98 6 20 6C16.95 6 14.43 8.28 14 11.2"
        fill="#64748B"
        opacity="0.6"
      />
      {/* Przednia czysta biała chmura z neutralnym obrysem */}
      <path
        d="M9.5 24.5H22.5C25.26 24.5 27.5 22.26 27.5 19.5C27.5 16.92 25.55 14.8 23.04 14.53C22.42 10.83 19.2 8 15.3 8C11.35 8 8.1 10.9 7.54 14.68C5.25 15.22 3.5 17.27 3.5 19.75C3.5 22.37 5.63 24.5 8.25 24.5H9.5Z"
        fill="#FFFFFF"
        stroke="#94A3B8"
        strokeWidth="1.2"
      />
    </svg>
  )
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

const initialHoldings: StockHolding[] = [
  {
    id: '1',
    ticker: 'VWCE',
    name: 'Vanguard FTSE All-World',
    shares: 1.85,
    invested: 1000,
    currentPrice: 565,
    category: 'ETF',
  },
  {
    id: '2',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    shares: 0.45,
    invested: 380,
    currentPrice: 920,
    category: 'US',
  },
  {
    id: '3',
    ticker: 'MSFT',
    name: 'Microsoft Corp.',
    shares: 0.25,
    invested: 400,
    currentPrice: 1720,
    category: 'US',
  },
  {
    id: '4',
    ticker: 'PKN',
    name: 'Orlen SA',
    shares: 6,
    invested: 390,
    currentPrice: 62.5,
    category: 'GPW',
  },
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
  
  // Portfel akcji (drobne kwoty, ułamkowe akcje, ETF)
  const [holdings, setHoldings] = useState<StockHolding[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agentprv_stocks_holdings')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        } catch {}
      }
    }
    return initialHoldings
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('agentprv_stocks_holdings', JSON.stringify(holdings))
    }
  }, [holdings])

  const portfolioSummary = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0)
    const totalInvested = holdings.reduce((sum, h) => sum + h.invested, 0)
    const totalProfit = totalValue - totalInvested
    const totalProfitPct = totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0
    return { totalValue, totalInvested, totalProfit, totalProfitPct }
  }, [holdings])

  // Dane ruchu i zdrowia z Huawei Watch GT 2
  const [healthData] = useState<HuaweiHealthData>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agentprv_huawei_health')
      if (saved) {
        try {
          return { ...defaultHealthData, ...JSON.parse(saved) }
        } catch {}
      }
    }
    return defaultHealthData
  })

  const [showComposer, setShowComposer] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [newTaskTime, setNewTaskTime] = useState('20:00')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [ambientDim, setAmbientDim] = useState(false)
  const [currentTime, setCurrentTime] = useState('21:30')
  const [currentWeather, setCurrentWeather] = useState<{ temp: number; code: number }>({
    temp: 11,
    code: 2,
  })
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastItem[]>(() =>
    buildDynamicFallbackForecast()
  )

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
          const todayDay = now.getDate()
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
            // Odrzuć wszystkie minione godziny (np. jeśli jest 10:00, odrzuca 07:00, 08:00, 09:00 z dzisiaj)
            if (itemDate.getTime() < currentHourTimestamp) continue

            const hourNum = itemDate.getHours()
            // Pomijamy godziny nocne 22:00 - 06:00 (zostawiamy godziny dzienne 07:00 - 21:00)
            if (hourNum >= 22 || hourNum <= 6) continue

            const hourLabel = `${String(hourNum).padStart(2, '0')}:00`
            const isNow = itemDate.getTime() === currentHourTimestamp
            const isTomorrow = itemDate.getDate() !== todayDay

            nextDaytimeHours.push({
              id: isoTime,
              hour: hourLabel,
              temp: Math.round(data.hourly.temperature_2m[i]),
              code: data.hourly.weather_code?.[i] ?? 1,
              isNow,
              isTomorrow,
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

    // Zapisz wydarzenie w Kalendarzu Google zaporawojciech@gmail.com (przez Service Account, Refresh Token lub OAuth)
    const savedToken =
      typeof window !== 'undefined' ? localStorage.getItem('gcal_oauth_token') : null
    if (gcalConnected || savedToken) {
      const year = new Date().getFullYear()
      const month = String(new Date().getMonth() + 1).padStart(2, '0')
      const dateStr = `${year}-${month}-${String(selectedDate).padStart(2, '0')}`
      await fetch('/api/calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(savedToken ? { Authorization: `Bearer ${savedToken}` } : {}),
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
            <div className="flex min-w-0 flex-1 items-center gap-3.5 rounded-2xl border border-white/[0.12] bg-[#181a1d] px-3.5 py-2 shadow-inner">
              {/* Current weather in Mińsk Mazowiecki */}
              <div
                className={`flex shrink-0 items-center gap-3 rounded-xl border px-3 py-1.5 ${getWeatherCardClasses(
                  currentWeather.code
                )}`}
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-black/35">
                  <WeatherIcon code={currentWeather.code} size={32} />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <MapPin size={11} className="text-zinc-400" />
                    <span>Mińsk Maz.</span>
                  </div>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span
                      className={`text-xl font-bold leading-none tabular-nums ${getTempColorClass(
                        currentWeather.temp
                      )}`}
                    >
                      {currentWeather.temp}°C
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {getWeatherLabel(currentWeather.code)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 12-hour horizontal daytime forecast (skipping 22:00 - 06:00) */}
              <div className="custom-scroll flex min-w-0 flex-1 items-center justify-between gap-2 overflow-x-auto py-0.5">
                {hourlyForecast.map((slot, idx) => {
                  const showTomorrowTag =
                    slot.isTomorrow && (idx === 0 || !hourlyForecast[idx - 1]?.isTomorrow)
                  return (
                    <div
                      key={`${slot.id ?? slot.hour}-${idx}`}
                      className={`flex min-w-[62px] flex-1 shrink-0 flex-col items-center gap-1.5 rounded-xl border px-2.5 py-2 transition hover:scale-[1.03] ${getWeatherCardClasses(
                        slot.code
                      )}`}
                    >
                      <span className="text-[11px] font-semibold tabular-nums text-white">
                        {slot.isNow
                          ? 'Teraz'
                          : showTomorrowTag
                            ? `Jutro ${slot.hour}`
                            : slot.hour}
                      </span>
                      <WeatherIcon code={slot.code} size={28} />
                      <span
                        className={`text-sm font-bold tabular-nums ${getTempColorClass(slot.temp)}`}
                      >
                        {slot.temp}°
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Main 3-Column Horizontal Tablet Workspace */}
        <section className="grid min-h-0 flex-1 grid-cols-12 gap-4">
          {/* Column 1: Aktywność i Zdrowie (Huawei GT 2) oraz Kompaktowy Kalendarz (4 cols) */}
          <div className="col-span-4 flex min-h-0 flex-col gap-3.5">
            {/* Health & Movement Card — Huawei Watch GT 2 (Główny priorytet) */}
            <div className="flex flex-1 flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#151617] p-4">
              <div>
                {/* Header */}
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                      <Activity size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-[#f3f3f1]">Ruch i Zdrowie</h2>
                      <p className="text-[10px] text-[#737578]">Huawei Watch GT 2</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] text-[#9a9c9e]">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    <span>Zsynchronizowano</span>
                  </div>
                </div>

                {/* Wskaźniki Ruchu (Kroki, Kalorie, Czas Aktywności) */}
                <div className="flex flex-col gap-2.5">
                  {/* Kroki */}
                  <div className="rounded-xl border border-white/[0.06] bg-[#1b1c1e] p-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-medium text-white">
                        <Footprints size={14} className="text-sky-400" />
                        <span>Kroki</span>
                      </div>
                      <div className="flex items-baseline gap-1 text-[11px] tabular-nums text-[#8e9093]">
                        <span className="font-semibold text-white">
                          {healthData.steps.toLocaleString('pl-PL')}
                        </span>
                        <span>/ {healthData.stepsGoal.toLocaleString('pl-PL')}</span>
                        <span className="font-semibold text-sky-400">
                          ({Math.round((healthData.steps / healthData.stepsGoal) * 100)}%)
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#25272a]">
                      <div
                        className="h-full rounded-full bg-sky-400 transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((healthData.steps / healthData.stepsGoal) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1.5 flex justify-between text-[10px] text-[#6f7174]">
                      <span>Dystans: {healthData.distanceKm} km</span>
                      <span>
                        Pozostało:{' '}
                        {(healthData.stepsGoal - healthData.steps).toLocaleString('pl-PL')}
                      </span>
                    </div>
                  </div>

                  {/* Kalorie & Czas Ruchu */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Spalone kalorie */}
                    <div className="rounded-xl border border-white/[0.06] bg-[#1b1c1e] p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                          <Flame size={14} className="text-amber-400" />
                          <span>Kalorie</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-400">
                          {Math.round((healthData.calories / healthData.caloriesGoal) * 100)}%
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <p className="text-lg font-bold tabular-nums leading-none text-white">
                          {healthData.calories}{' '}
                          <span className="text-xs font-normal text-[#8e9093]">kcal</span>
                        </p>
                        <p className="mt-1 text-[10px] text-[#6f7174]">
                          cel: {healthData.caloriesGoal} kcal
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#25272a]">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round((healthData.calories / healthData.caloriesGoal) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Aktywność / Trening */}
                    <div className="rounded-xl border border-white/[0.06] bg-[#1b1c1e] p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-white">
                          <Activity size={14} className="text-emerald-400" />
                          <span>Aktywność</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-400">
                          {Math.round((healthData.activeMinutes / healthData.activeMinutesGoal) * 100)}%
                        </span>
                      </div>
                      <div className="mt-1.5">
                        <p className="text-lg font-bold tabular-nums leading-none text-white">
                          {healthData.activeMinutes}{' '}
                          <span className="text-xs font-normal text-[#8e9093]">min</span>
                        </p>
                        <p className="mt-1 text-[10px] text-[#6f7174]">
                          cel: {healthData.activeMinutesGoal} min
                        </p>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#25272a]">
                        <div
                          className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (healthData.activeMinutes / healthData.activeMinutesGoal) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Biometria (Tętno TruSeen & Sen TruSleep) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Tętno */}
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#1b1c1e] p-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                        <Heart size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold tabular-nums leading-none text-white">
                          {healthData.heartRate}{' '}
                          <span className="text-[10px] font-normal text-[#8e9093]">bpm</span>
                        </p>
                        <p className="mt-1 text-[10px] text-[#6f7174]">
                          Spoczynkowe {healthData.heartRateResting}
                        </p>
                      </div>
                    </div>

                    {/* Sen */}
                    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-[#1b1c1e] p-2.5">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                        <Moon size={15} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold tabular-nums leading-none text-white">
                          {healthData.sleepDuration}
                        </p>
                        <p className="mt-1 text-[10px] text-[#6f7174]">
                          TruSleep {healthData.sleepScore} pkt
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compact Month Calendar Card — nowoczesna, zwięzła forma */}
            <div className="shrink-0 rounded-2xl border border-white/[0.08] bg-[#151617] p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#f3f3f1]">
                  <CalendarDays size={13} className="text-[#8e9092]" />
                  <span>Październik 2026</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedDate((d) => Math.max(1, d - 1))}
                    className="flex size-6 items-center justify-center rounded-md text-[#85878a] transition hover:bg-white/[0.06] hover:text-white"
                    aria-label="Poprzedni dzień"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(18)}
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium text-[#8e9092] transition hover:bg-white/[0.06] hover:text-white"
                  >
                    Dziś
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDate((d) => Math.min(31, d + 1))}
                    className="flex size-6 items-center justify-center rounded-md text-[#85878a] transition hover:bg-white/[0.06] hover:text-white"
                    aria-label="Następny dzień"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Dni tygodnia */}
              <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[9px] font-medium uppercase tracking-wider text-[#66686b]">
                {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>

              {/* Siatka dni */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarCells.map((date, index) => {
                  const hasEvent = date ? datesWithGoogleEvents.has(date) || date === 18 : false
                  const isSelected = date === selectedDate
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => date && setSelectedDate(date)}
                      disabled={!date}
                      className={`relative flex h-6 items-center justify-center rounded-md text-[11px] tabular-nums transition ${
                        isSelected
                          ? 'bg-[#eeeeec] font-bold text-[#171819] shadow-sm'
                          : date === 18
                          ? 'bg-white/[0.08] font-semibold text-white'
                          : 'text-[#888a8c] hover:bg-white/[0.06] hover:text-white'
                      } ${
                        hasEvent && !isSelected
                          ? 'after:absolute after:bottom-0.5 after:size-1 after:rounded-full after:bg-emerald-400'
                          : ''
                      }`}
                    >
                      {date}
                    </button>
                  )
                })}
              </div>

              {/* Status Google Calendar */}
              <div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-1.5 text-[10px] text-[#737578]">
                <span>Wybrany dzień: {selectedDate} paź</span>
                <button
                  type="button"
                  onClick={() => setShowGcalModal(true)}
                  className="flex items-center gap-1 transition hover:text-white"
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      gcalConnected ? 'bg-emerald-400' : 'bg-[#888]'
                    }`}
                  />
                  <span className="truncate max-w-[140px]">{GOOGLE_CALENDAR_EMAIL}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Center Timeline / Schedule View (5 cols) */}
          <div className="col-span-5 flex min-h-0 flex-col rounded-2xl border border-white/[0.08] bg-[#151617] p-5">
            <div className="mb-4 flex shrink-0 items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-[#f3f3f1]">
                {view === 'Dzień' ? 'Oś czasu dnia' : 'Przegląd tygodnia'}
              </h2>

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
                </div>
              )
            ) : (
              <div className="custom-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1">
                {Array.from({ length: 7 }, (_, idx) => {
                  const baseDay = Math.min(25, Math.max(1, selectedDate - ((selectedDate - 1) % 7)))
                  const dayNum = baseDay + idx
                  const dayNames = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd']
                  const dayEvents = allMonthEvents.filter(
                    (ev) => ev.dateStr && Number(ev.dateStr.split('-')[2]) === dayNum
                  )
                  const summaryText =
                    dayEvents.length > 0
                      ? dayEvents.map((e) => `${e.time} ${e.title}`).join(' · ')
                      : 'Brak zaplanowanych wydarzeń'
                  const isSelected = dayNum === selectedDate
                  return (
                    <button
                      key={dayNum}
                      onClick={() => {
                        setSelectedDate(dayNum)
                        setView('Dzień')
                      }}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                        isSelected
                          ? 'border-white/[0.2] bg-[#222325] text-white'
                          : 'border-white/[0.07] bg-[#1b1c1d] text-[#bfc0be] hover:border-white/[0.14]'
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3.5 pr-3">
                        <div
                          className={`flex size-10 shrink-0 flex-col items-center justify-center rounded-lg text-xs font-semibold ${
                            isSelected
                              ? 'bg-[#eeeeec] text-[#171819]'
                              : 'bg-[#151617] text-[#9a9c9e]'
                          }`}
                        >
                          <span className="text-[10px] uppercase opacity-75">
                            {dayNames[idx]}
                          </span>
                          <span>{dayNum}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#ededeb]">
                            {summaryText}
                          </p>
                          <p className="mt-0.5 text-xs text-[#6f7174]">
                            {GOOGLE_CALENDAR_EMAIL} · kliknij, aby otworzyć dzień
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs tabular-nums text-[#9a9c9e]">
                        {dayEvents.length} wyd.
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Column 3: Portfel Akcji (3 cols) — wertykalnie responsywny podgląd */}
          <aside className="col-span-3 flex min-h-0 flex-col items-start">
            {/* Portfolio Card — wysokość dostosowuje się dynamicznie do liczby pozycji */}
            <div className="flex w-full max-h-full flex-col rounded-2xl border border-white/[0.08] bg-[#151617] p-4.5 transition-all">
              {/* Header */}
              <div className="mb-3.5 flex shrink-0 items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-[#f3f3f1]">Portfel akcji</h2>
                    <p className="text-[10px] text-[#737578]">Podgląd inwestycji · Drobne kwoty</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-[#9a9c9e]">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  <span>Podgląd</span>
                </div>
              </div>

              {/* Portfolio Summary Banner */}
              <div className="mb-3 shrink-0 rounded-xl border border-white/[0.07] bg-[#1a1b1d] p-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[#737578]">
                    Wartość portfela
                  </span>
                  <div
                    className={`flex items-center gap-1 text-xs font-semibold tabular-nums ${
                      portfolioSummary.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {portfolioSummary.totalProfit >= 0 ? (
                      <TrendingUp size={13} />
                    ) : (
                      <TrendingDown size={13} />
                    )}
                    <span>
                      {portfolioSummary.totalProfit >= 0 ? '+' : ''}
                      {portfolioSummary.totalProfit.toFixed(2)} zł ({portfolioSummary.totalProfit >= 0 ? '+' : ''}
                      {portfolioSummary.totalProfitPct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="text-xl font-bold tracking-tight text-white tabular-nums">
                    {portfolioSummary.totalValue.toLocaleString('pl-PL', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    zł
                  </p>
                  <span className="text-[11px] text-[#737578] tabular-nums">
                    wkład: {portfolioSummary.totalInvested.toLocaleString('pl-PL', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    zł
                  </span>
                </div>
              </div>

              {/* Stock Holdings List — Read-only Preview */}
              <div className="custom-scroll flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
                {holdings.map((stock) => {
                  const val = stock.shares * stock.currentPrice
                  const profit = val - stock.invested
                  const profitPct = stock.invested > 0 ? (profit / stock.invested) * 100 : 0
                  const isProfit = profit >= 0
                  const shareOfPortfolio =
                    portfolioSummary.totalValue > 0
                      ? Math.round((val / portfolioSummary.totalValue) * 100)
                      : 0

                  return (
                    <div
                      key={stock.id}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#1a1b1d] p-3 transition hover:border-white/[0.12]"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold tracking-wide text-white">
                            {stock.ticker}
                          </span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              stock.category === 'ETF'
                                ? 'bg-blue-500/15 text-blue-400'
                                : stock.category === 'US'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-emerald-500/15 text-emerald-400'
                            }`}
                          >
                            {stock.category}
                          </span>
                          <span className="text-[10px] text-[#6f7174] tabular-nums">
                            {shareOfPortfolio}%
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-[#8e9093]">
                          {stock.name} · {stock.shares} {stock.shares === 1 ? 'akcja' : 'akcji'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-semibold tabular-nums text-white">
                          {val.toLocaleString('pl-PL', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          zł
                        </p>
                        <p
                          className={`mt-0.5 text-[10px] font-medium tabular-nums ${
                            isProfit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isProfit ? '+' : ''}
                          {profit.toFixed(2)} zł ({isProfit ? '+' : ''}
                          {profitPct.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
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
