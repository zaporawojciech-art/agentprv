import { NextRequest, NextResponse } from 'next/server'

const TODOIST_API_BASE = 'https://api.todoist.com/rest/v2'

export interface TodoistTaskDTO {
  id: string
  content: string
  completed: boolean
  priority: 1 | 2 | 3 | 4 // UI: 1 = najwyższy (P1), 4 = zwykły (P4)
  dueDate?: string
  dueString?: string
  url?: string
}

interface TodoistApiTask {
  id: string
  content: string
  is_completed?: boolean
  priority?: number // Todoist API: 4 = P1 (urgent), 3 = P2, 2 = P3, 1 = P4 (normal)
  due?: {
    date?: string
    string?: string
  } | null
  url?: string
}

function getTodoistToken(request: NextRequest): string | null {
  const headerToken = request.headers.get('x-todoist-token')?.trim()
  if (headerToken) return headerToken
  const envToken = process.env.TODOIST_API_TOKEN?.trim()
  return envToken || null
}

// Todoist REST API v2 używa odwróconej skali priorytetów (4 = P1, 1 = P4)
function apiPriorityToUi(apiPriority?: number): 1 | 2 | 3 | 4 {
  switch (apiPriority) {
    case 4:
      return 1
    case 3:
      return 2
    case 2:
      return 3
    default:
      return 4
  }
}

function uiPriorityToApi(uiPriority?: number): number {
  switch (uiPriority) {
    case 1:
      return 4
    case 2:
      return 3
    case 3:
      return 2
    default:
      return 1
  }
}

function mapTask(task: TodoistApiTask): TodoistTaskDTO {
  return {
    id: task.id,
    content: task.content,
    completed: Boolean(task.is_completed),
    priority: apiPriorityToUi(task.priority),
    dueDate: task.due?.date,
    dueString: task.due?.string,
    url: task.url,
  }
}

export async function GET(request: NextRequest) {
  const token = getTodoistToken(request)
  if (!token) {
    return NextResponse.json({
      connected: false,
      mode: 'local',
      tasks: [],
    })
  }

  try {
    const res = await fetch(`${TODOIST_API_BASE}/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      return NextResponse.json(
        {
          connected: false,
          mode: 'local',
          error: `Błąd Todoist API (${res.status})`,
          details: errorText,
          tasks: [],
        },
        { status: res.status === 401 || res.status === 403 ? 401 : 502 }
      )
    }

    const rawTasks: TodoistApiTask[] = await res.json()
    const tasks = rawTasks.map(mapTask)

    return NextResponse.json({
      connected: true,
      mode: 'todoist',
      tasks,
    })
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        mode: 'local',
        error: error instanceof Error ? error.message : 'Błąd połączenia z Todoist',
        tasks: [],
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const token = getTodoistToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Brak tokena Todoist' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const content = typeof body?.content === 'string' ? body.content.trim() : ''
    if (!content) {
      return NextResponse.json({ error: 'Treść zadania jest wymagana' }, { status: 400 })
    }

    const payload: Record<string, unknown> = {
      content,
      priority: uiPriorityToApi(Number(body?.priority)),
    }
    if (typeof body?.due_string === 'string' && body.due_string.trim()) {
      payload.due_string = body.due_string.trim()
    }

    const res = await fetch(`${TODOIST_API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Nie udało się dodać zadania (${res.status})` },
        { status: res.status }
      )
    }

    const created: TodoistApiTask = await res.json()
    return NextResponse.json({ task: mapTask(created) }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd tworzenia zadania' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  const token = getTodoistToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Brak tokena Todoist' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const id = typeof body?.id === 'string' ? body.id.trim() : ''
    const completed = Boolean(body?.completed)

    if (!id) {
      return NextResponse.json({ error: 'ID zadania jest wymagane' }, { status: 400 })
    }

    const action = completed ? 'close' : 'reopen'
    const res = await fetch(`${TODOIST_API_BASE}/tasks/${encodeURIComponent(id)}/${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Nie udało się zaktualizować zadania (${res.status})` },
        { status: res.status }
      )
    }

    return NextResponse.json({ ok: true, id, completed })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd aktualizacji zadania' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const token = getTodoistToken(request)
  if (!token) {
    return NextResponse.json({ error: 'Brak tokena Todoist' }, { status: 400 })
  }

  const id = request.nextUrl.searchParams.get('id')?.trim()
  if (!id) {
    return NextResponse.json({ error: 'ID zadania jest wymagane' }, { status: 400 })
  }

  try {
    const res = await fetch(`${TODOIST_API_BASE}/tasks/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Nie udało się usunąć zadania (${res.status})` },
        { status: res.status }
      )
    }

    return NextResponse.json({ ok: true, id })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Błąd usuwania zadania' },
      { status: 500 }
    )
  }
}
