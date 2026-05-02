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
}

const COLUMNS = [
  { key: 'to_do', label: 'A fazer', color: 'bg-gray-100' },
  { key: 'in_progress', label: 'Em andamento', color: 'bg-blue-50' },
  { key: 'in_review', label: 'Em revisão', color: 'bg-yellow-50' },
  { key: 'done', label: 'Concluído', color: 'bg-green-50' },
] as const

export default function KanbanBoard({ sprintId, onBack }: KanbanBoardProps) {
  const [board, setBoard] = useState<Board>({ to_do: [], in_progress: [], in_review: [], done: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchBoard() {
    setError('')
    try {
      const data = await apiFetch<Board>(`/api/sprints/${sprintId}/board`)
      // Defesa: garante que as 4 chaves existem mesmo se o backend mudar formato
      setBoard({
        to_do: data.to_do || [],
        in_progress: data.in_progress || [],
        in_review: data.in_review || [],
        done: data.done || [],
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
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      })
      fetchBoard()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao mover história')
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

  // Indices das colunas - usado para botões ← → (move para coluna adjacente)
  function colIndex(status: string): number {
    return COLUMNS.findIndex(c => c.key === status)
  }

  function renderCard(story: Story) {
    const idx = colIndex(story.status)
    const prev = idx > 0 ? COLUMNS[idx - 1] : null
    const next = idx >= 0 && idx < COLUMNS.length - 1 ? COLUMNS[idx + 1] : null

    return (
      <div key={story.id} className="bg-white p-3 rounded-lg shadow border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-1 rounded ${labelColors[story.label] || 'bg-gray-100 text-gray-700'}`}>
            {story.label}
          </span>
          <span className="text-xs text-gray-500">#{story.id}</span>
          <span className="ml-auto bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-700">
            {story.story_points} pts
          </span>
        </div>
        <h4 className="font-medium text-gray-800 text-sm mb-2">{story.title}</h4>

        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {story.assignee_username ? `👤 ${story.assignee_username}` : '👤 sem responsável'}
          </span>
          <div className="flex gap-1">
            <button disabled={!prev}
              onClick={() => prev && moveStory(story.id, prev.key)}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title={prev ? `Mover para ${prev.label}` : 'Já está na primeira coluna'}>
              ←
            </button>
            <button disabled={!next}
              onClick={() => next && moveStory(story.id, next.key)}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title={next ? `Mover para ${next.label}` : 'Já está na última coluna'}>
              →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button onClick={onBack} className="text-blue-600 hover:underline mb-4">
        ← Voltar
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Kanban Board <span className="text-base text-gray-500">(sprint #{sprintId})</span>
      </h2>

      {loading && <p className="text-gray-500 text-center mt-12">Carregando board...</p>}
      {error && <p className="text-red-500 text-center mt-12">{error}</p>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map(col => {
            const stories = board[col.key]
            return (
              <div key={col.key} className={`${col.color} rounded-lg p-4`}>
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-700">{col.label}</h3>
                  <span className="text-xs text-gray-500">
                    {stories.length} cards · {totalPoints(stories)} pts
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {stories.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">vazio</p>
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
