'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Flag, Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react'
import type { TodoistTaskDTO } from '@/app/api/todoist/route'

const LOCAL_TASKS_STORAGE_KEY = 'agentprv_local_tasks'

const PRIORITY_STYLES: Record<
  1 | 2 | 3 | 4,
  { ring: string; fill: string; badge: string; label: string }
> = {
  1: {
    ring: 'border-rose-500/80 hover:bg-rose-500/15',
    fill: 'border-rose-500 bg-rose-500 text-white',
    badge: 'text-rose-400',
    label: 'P1',
  },
  2: {
    ring: 'border-amber-400/80 hover:bg-amber-400/15',
    fill: 'border-amber-400 bg-amber-400 text-[#151617]',
    badge: 'text-amber-400',
    label: 'P2',
  },
  3: {
    ring: 'border-sky-400/80 hover:bg-sky-400/15',
    fill: 'border-sky-400 bg-sky-400 text-[#151617]',
    badge: 'text-sky-400',
    label: 'P3',
  },
  4: {
    ring: 'border-[#686a6d] hover:border-white/60 hover:bg-white/[0.06]',
    fill: 'border-[#dededc] bg-[#dededc] text-[#151617]',
    badge: 'text-[#737578]',
    label: 'P4',
  },
}

interface TodoistTasksPanelProps {
  todoistToken: string
  onOpenSettings: () => void
  onConnectionChange?: (connected: boolean) => void
}

export function TodoistTasksPanel({
  todoistToken,
  onOpenSettings,
  onConnectionChange,
}: TodoistTasksPanelProps) {
  const [tasks, setTasks] = useState<TodoistTaskDTO[]>([])
  const [mode, setMode] = useState<'todoist' | 'local'>('local')
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  const [newContent, setNewContent] = useState('')
  const [newPriority, setNewPriority] = useState<1 | 2 | 3 | 4>(4)
  const [submitting, setSubmitting] = useState(false)

  const readLocalTasks = useCallback((): TodoistTaskDTO[] => {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LOCAL_TASKS_STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [])

  const writeLocalTasks = useCallback((next: TodoistTaskDTO[]) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(LOCAL_TASKS_STORAGE_KEY, JSON.stringify(next))
  }, [])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const headers: HeadersInit = {}
      if (todoistToken) {
        headers['x-todoist-token'] = todoistToken
      }
      const res = await fetch('/api/todoist', { headers, cache: 'no-store' })
      const data = await res.json()

      if (res.ok && data.connected && data.mode === 'todoist') {
        setMode('todoist')
        setTasks(Array.isArray(data.tasks) ? data.tasks : [])
        onConnectionChange?.(true)
      } else {
        setMode('local')
        setTasks(readLocalTasks())
        onConnectionChange?.(false)
        if (data?.error && todoistToken) {
          setErrorMsg(data.error)
        }
      }
    } catch {
      setMode('local')
      setTasks(readLocalTasks())
      onConnectionChange?.(false)
    } finally {
      setLoading(false)
    }
  }, [todoistToken, onConnectionChange, readLocalTasks])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  async function handleAddTask() {
    const content = newContent.trim()
    if (!content || submitting) return

    setSubmitting(true)
    setErrorMsg('')

    if (mode === 'local') {
      const created: TodoistTaskDTO = {
        id: `local-${Date.now()}`,
        content,
        completed: false,
        priority: newPriority,
        dueString: 'Dziś',
      }
      const next = [created, ...tasks]
      setTasks(next)
      writeLocalTasks(next)
      setNewContent('')
      setNewPriority(4)
      setSubmitting(false)
      return
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (todoistToken) headers['x-todoist-token'] = todoistToken

      const res = await fetch('/api/todoist', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content,
          priority: newPriority,
          due_string: 'today',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.task) {
        setErrorMsg(data?.error || 'Nie udało się dodać zadania')
      } else {
        setTasks((prev) => [data.task, ...prev])
        setNewContent('')
        setNewPriority(4)
      }
    } catch {
      setErrorMsg('Błąd sieci podczas dodawania zadania')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleToggleTask(task: TodoistTaskDTO) {
    const nextCompleted = !task.completed
    const previous = tasks

    setTasks((prev) =>
      prev.map((item) => (item.id === task.id ? { ...item, completed: nextCompleted } : item))
    )

    if (mode === 'local') {
      const next = previous.map((item) =>
        item.id === task.id ? { ...item, completed: nextCompleted } : item
      )
      writeLocalTasks(next)
      return
    }

    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' }
      if (todoistToken) headers['x-todoist-token'] = todoistToken

      const res = await fetch('/api/todoist', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ id: task.id, completed: nextCompleted }),
      })
      if (!res.ok) {
        setTasks(previous)
        setErrorMsg('Nie udało się zaktualizować zadania w Todoist')
      }
    } catch {
      setTasks(previous)
      setErrorMsg('Błąd sieci podczas aktualizacji zadania')
    }
  }

  async function handleDeleteTask(taskId: string) {
    const previous = tasks
    const next = tasks.filter((item) => item.id !== taskId)
    setTasks(next)

    if (mode === 'local') {
      writeLocalTasks(next)
      return
    }

    try {
      const headers: HeadersInit = {}
      if (todoistToken) headers['x-todoist-token'] = todoistToken

      const res = await fetch(`/api/todoist?id=${encodeURIComponent(taskId)}`, {
        method: 'DELETE',
        headers,
      })
      if (!res.ok) {
        setTasks(previous)
        setErrorMsg('Nie udało się usunąć zadania z Todoist')
      }
    } catch {
      setTasks(previous)
      setErrorMsg('Błąd sieci podczas usuwania zadania')
    }
  }

  const activeCount = tasks.filter((t) => !t.completed).length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Quick-add composer */}
      <div className="flex shrink-0 items-center gap-2 rounded-xl border border-white/[0.08] bg-[#1b1c1d] px-3 py-2 focus-within:border-white/20">
        <Plus size={16} className="shrink-0 text-[#77797c]" />
        <input
          type="text"
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
          placeholder="Dodaj zadanie w stylu Todoist..."
          className="min-w-0 flex-1 bg-transparent text-sm text-[#ededeb] placeholder:text-[#6f7174] focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setNewPriority((p) => (p === 4 ? 1 : ((p + 1) as 1 | 2 | 3 | 4)))}
          title="Zmień priorytet (P1–P4)"
          className={`flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#151617] px-2 py-1 text-[11px] font-medium transition hover:border-white/20 ${PRIORITY_STYLES[newPriority].badge}`}
        >
          <Flag size={11} />
          <span>{PRIORITY_STYLES[newPriority].label}</span>
        </button>
        <button
          type="button"
          onClick={handleAddTask}
          disabled={!newContent.trim() || submitting}
          className="rounded-lg bg-[#303132] px-3 py-1 text-xs font-medium text-white transition hover:bg-[#3d3f41] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Dodaj
        </button>
      </div>

      {errorMsg && (
        <div className="shrink-0 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-3 rounded-xl border border-white/[0.06] bg-[#1b1c1d] px-3.5 py-3"
            >
              <div className="size-5 shrink-0 rounded-full bg-white/[0.08]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-44 rounded bg-white/[0.07]" />
                <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
              </div>
            </div>
          ))}
        </div>
      ) : tasks.length > 0 ? (
        <div className="custom-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {tasks.map((task) => {
            const pStyle = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES[4]
            return (
              <div
                key={task.id}
                onClick={() => handleToggleTask(task)}
                className={`group flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 transition active:scale-[0.99] ${
                  task.completed
                    ? 'border-white/[0.05] bg-[#1a1b1c]/55'
                    : 'border-white/[0.08] bg-[#1b1c1d] hover:border-white/[0.16]'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleToggleTask(task)
                    }}
                    aria-label={task.completed ? 'Oznacz jako nieukończone' : 'Oznacz jako ukończone'}
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      task.completed ? pStyle.fill : pStyle.ring
                    }`}
                  >
                    {task.completed && <Check size={12} strokeWidth={3} />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium transition ${
                        task.completed ? 'text-[#7e8082] line-through' : 'text-[#ededeb]'
                      }`}
                    >
                      {task.content}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[#6f7174]">
                      {task.priority < 4 && (
                        <span className={`font-medium ${pStyle.badge}`}>{pStyle.label}</span>
                      )}
                      {(task.dueString || task.dueDate) && (
                        <span>{task.dueString || task.dueDate}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteTask(task.id)
                  }}
                  aria-label="Usuń zadanie"
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[#686a6d] opacity-0 transition hover:bg-white/[0.08] hover:text-rose-400 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.08] p-6 text-center">
          <p className="text-sm font-medium text-[#bfc0be]">Brak zadań na liście</p>
          <p className="mt-1 text-xs text-[#6f7174]">
            Wpisz zadanie powyżej lub połącz swoje konto Todoist w ustawieniach poniżej.
          </p>
        </div>
      )}

      {/* Footer status bar */}
      <div className="flex shrink-0 items-center justify-between border-t border-white/[0.06] pt-2.5 text-[11px] text-[#737578]">
        <div className="flex items-center gap-2">
          <span
            className={`size-1.5 rounded-full ${
              mode === 'todoist' ? 'bg-emerald-400' : 'bg-amber-400/80'
            }`}
          />
          <span>
            {mode === 'todoist' ? 'Todoist Live' : 'Tryb lokalny'} · {activeCount} aktywnych
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTasks}
            title="Odśwież zadania"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-[#9a9c9e] transition hover:bg-white/[0.06] hover:text-white"
          >
            <RefreshCw size={12} />
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#1b1c1d] px-2.5 py-1 text-[#bfc0be] transition hover:border-white/20 hover:text-white"
          >
            <Settings2 size={12} />
            <span>Konfiguruj Todoist</span>
          </button>
        </div>
      </div>
    </div>
  )
}
