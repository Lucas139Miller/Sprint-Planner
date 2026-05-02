import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'

interface Story {
  id: number
  title: string
  story_points: number
  label: string
  status: string
  sprint_id: number | null
  assignee_id: number | null
  assignee_username: string | null
}

interface Board {
  to_do: Story[]
  in_progress: Story[]
  in_review: Story[]
  done: Story[]
}

interface KanbanBoardProps {
  token: string
  projectId: number
  sprintId: number
  onBack: () => void
  embedded?: boolean
}

// Colunas estilo Jira/Linear: cinza → azul → amarelo → verde
const COLUMNS = [
  { key: 'to_do', label: 'A fazer', color: 'bg-gray-100', accent: 'border-gray-400' },
  { key: 'in_progress', label: 'Em andamento', color: 'bg-blue-50', accent: 'border-blue-400' },
  { key: 'in_review', label: 'Em revisão', color: 'bg-yellow-50', accent: 'border-yellow-400' },
  { key: 'done', label: 'Concluído', color: 'bg-green-50', accent: 'border-green-400' },
] as const

export default function KanbanBoard({ sprintId, onBack, embedded }: KanbanBoardProps) {
  const [board, setBoard] = useState<Board>({ to_do: [], in_progress: [], in_review: [], done: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [draggedId, setDraggedId] = useState<number | null>(null)

  async function fetchBoard() {
    setError('')
    try {
      const data = await apiFetch<Board>(`/api/sprints/${sprintId}/board`)
      setBoard({
        to_do: data.to_do || [], in_progress: data.in_progress || [],
        in_review: data.in_review || [], done: data.done || [],
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar board')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBoard() }, [sprintId])

  async function moveStory(storyId: number, newStatus: string) {
    try {
      await apiFetch(`/api/stories/${storyId}/status`, {
        method: 'PUT', body: JSON.stringify({ status: newStatus }),
      })
      fetchBoard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao mover história')
    }
  }

  // Drag & drop nativo do HTML5 - mais natural que botões ← →
  function onDragStart(id: number) { setDraggedId(id) }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDrop(status: string) {
    if (draggedId !== null) {
      moveStory(draggedId, status)
      setDraggedId(null)
    }
  }

  function totalPoints(stories: Story[]): number {
    return stories.reduce((sum, s) => sum + (s.story_points || 0), 0)
  }

  const labelColors: Record<string, string> = {
    'feature': 'bg-blue-100 text-blue-700',
    'bug': 'bg-red-100 text-red-700',
    'tech_debt': 'bg-yellow-100 text-yellow-700',
  }

  function renderCard(story: Story) {
    return (
      <div key={story.id} draggable onDragStart={() => onDragStart(story.id)}
        className={`bg-white p-3 rounded-lg shadow-sm border border-gray-200 cursor-move hover:shadow-md transition-shadow ${
          draggedId === story.id ? 'opacity-50' : ''
        }`}>
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className={`text-xs px-1.5 py-0.5 rounded ${labelColors[story.label] || 'bg-gray-100 text-gray-700'}`}>
            {story.label}
          </span>
          <span className="text-xs text-gray-400">#{story.id}</span>
          <span className="ml-auto bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-700">
            {story.story_points}
          </span>
        </div>
        <h4 className="font-medium text-gray-800 text-sm mb-2">{story.title}</h4>
        <div className="text-xs text-gray-500">
          {story.assignee_username ? `👤 ${story.assignee_username}` : '👤 sem responsável'}
        </div>
      </div>
    )
  }

  return (
    <div className={embedded ? 'p-6' : 'p-6 max-w-7xl mx-auto'}>
      {!embedded && (
        <button onClick={onBack} className="text-blue-600 hover:underline mb-4">← Voltar</button>
      )}

      {!embedded && (
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Kanban Board <span className="text-sm text-gray-500">(sprint #{sprintId})</span>
        </h2>
      )}

      {loading && <p className="text-gray-500 text-center py-8">Carregando board...</p>}
      {error && <p className="text-red-500 text-center py-8">{error}</p>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {COLUMNS.map(col => {
            const stories = board[col.key]
            return (
              <div key={col.key}
                onDragOver={onDragOver} onDrop={() => onDrop(col.key)}
                className={`${col.color} rounded-lg p-3 border-t-4 ${col.accent} min-h-[200px]`}>
                <div className="mb-3 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">{col.label}</h3>
                  <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">
                    {stories.length} · {totalPoints(stories)}pts
                  </span>
                </div>
                <div className="space-y-2">
                  {stories.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4 italic">Arraste cards para cá</p>
                  ) : (
                    stories.map(renderCard)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
