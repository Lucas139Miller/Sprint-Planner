import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'

interface Story {
  id: number
  title: string
  description: string
  story_points: number
  label: string
  priority: number
  status: string
  sprint_id: number | null
}

interface SprintBoardProps {
  token: string
  projectId: number
  sprintId: number
  onBack: () => void
}

export default function SprintBoard({ token, projectId, sprintId, onBack }: SprintBoardProps) {
  const [backlog, setBacklog] = useState<Story[]>([])
  const [sprintStories, setSprintStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function fetchBoth() {
    setError('')
    try {
      const [bl, sp] = await Promise.all([
        apiFetch<Story[]>(`/api/projects/${projectId}/stories`),
        apiFetch<Story[]>(`/api/sprints/${sprintId}/stories`),
      ])
      setBacklog(bl); setSprintStories(sp)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar histórias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBoth() }, [projectId, sprintId, token])

  async function moveStory(storyId: number, newSprintId: number | null) {
    try {
      await apiFetch(`/api/stories/${storyId}/move-to-sprint`, {
        method: 'PUT',
        body: JSON.stringify({ sprint_id: newSprintId }),
      })
      fetchBoth()
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

  function renderCard(story: Story, action: 'to-sprint' | 'to-backlog') {
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
        {action === 'to-sprint' ? (
          <button onClick={() => moveStory(story.id, sprintId)}
            className="w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-1 rounded">
            → Mover para Sprint
          </button>
        ) : (
          <button onClick={() => moveStory(story.id, null)}
            className="w-full text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 py-1 rounded">
            ← Voltar ao Backlog
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button onClick={onBack} className="text-blue-600 hover:underline mb-4">
        ← Voltar
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Sprint Board <span className="text-base text-gray-500">(sprint #{sprintId})</span>
      </h2>

      {loading && <p className="text-gray-500 text-center mt-12">Carregando...</p>}
      {error && <p className="text-red-500 text-center mt-12">{error}</p>}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">📋 Backlog</h3>
              <span className="text-sm text-gray-500">
                {backlog.length} histórias · {totalPoints(backlog)} pts
              </span>
            </div>
            <div className="space-y-2">
              {backlog.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Backlog vazio</p>
              ) : (
                backlog.map(s => renderCard(s, 'to-sprint'))
              )}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-700">🚀 Sprint Atual</h3>
              <span className="text-sm text-gray-500">
                {sprintStories.length} histórias · {totalPoints(sprintStories)} pts
              </span>
            </div>
            <div className="space-y-2">
              {sprintStories.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Nenhuma história no sprint</p>
              ) : (
                sprintStories.map(s => renderCard(s, 'to-backlog'))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
