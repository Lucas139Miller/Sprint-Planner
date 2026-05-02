import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'
import StoryForm from './StoryForm'

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

interface SprintMini { id: number; name: string; status: string }

interface BacklogProps {
  token: string
  projectId: number
  onBack: () => void
  embedded?: boolean
}

export default function Backlog({ token, projectId, onBack, embedded }: BacklogProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [sprints, setSprints] = useState<SprintMini[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [viewAll, setViewAll] = useState(false)

  async function refresh() {
    setLoading(true); setError('')
    try {
      const storiesPath = viewAll
        ? `/api/projects/${projectId}/stories?include=all`
        : `/api/projects/${projectId}/stories`
      const [storiesData, sprintsData] = await Promise.all([
        apiFetch<Story[]>(storiesPath),
        apiFetch<SprintMini[]>(`/api/projects/${projectId}/sprints`),
      ])
      setStories(storiesData); setSprints(sprintsData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar histórias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [projectId, token, viewAll])

  // Move uma história para um sprint específico ou de volta ao backlog (null)
  async function moveToSprint(storyId: number, sprintId: number | null) {
    try {
      await apiFetch(`/api/stories/${storyId}/move-to-sprint`, {
        method: 'PUT', body: JSON.stringify({ sprint_id: sprintId }),
      })
      refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao mover história')
    }
  }

  // Sprint ativo é o destino default ao mover histórias do backlog
  const activeSprint = sprints.find(s => s.status === 'active') || sprints.find(s => s.status === 'planning')

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja remover esta história?')) return
    try {
      await apiFetch(`/api/stories/${id}`, { method: 'DELETE' })
      refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover')
    }
  }

  // Total de pontos no backlog (sem sprint) - útil para PO planejar
  const backlogPoints = stories.filter(s => !s.sprint_id).reduce((sum, s) => sum + (s.story_points || 0), 0)

  const labelColors: Record<string, string> = {
    'feature': 'bg-blue-100 text-blue-700',
    'bug': 'bg-red-100 text-red-700',
    'tech_debt': 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {!embedded && (
        <button onClick={onBack} className="text-blue-600 hover:underline mb-4">
          ← Voltar
        </button>
      )}

      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Backlog do Produto</h2>
          <p className="text-xs text-gray-500 mt-1">
            {stories.filter(s => !s.sprint_id).length} histórias · {backlogPoints} pontos
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Toggle: ver só backlog vs ver todas (inclui histórias em sprints) */}
          <label className="text-sm text-gray-600 flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={viewAll} onChange={e => setViewAll(e.target.checked)} />
            Mostrar histórias em sprints
          </label>
          <button onClick={() => { setEditingStory(null); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
            + Nova História
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500 text-center py-8">Carregando histórias...</p>}
      {error && <p className="text-red-500 text-center py-8">{error}</p>}
      {!loading && !error && stories.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500 mb-3">Nenhuma história ainda.</p>
          <button onClick={() => { setEditingStory(null); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + Criar primeira história
          </button>
        </div>
      )}

      <div className="space-y-2">
        {stories.map(story => (
          <div key={story.id}
            className={`bg-white p-3 rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
              story.sprint_id ? 'border-gray-200 opacity-70' : 'border-gray-200'
            }`}>
            <div className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-xs px-2 py-0.5 rounded ${labelColors[story.label] || 'bg-gray-100 text-gray-700'} flex-shrink-0`}>
                  {story.label}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">#{story.id}</span>
                <h3 className="font-medium text-gray-800 text-sm truncate">{story.title}</h3>
                {story.sprint_id && (
                  <span className="text-xs text-blue-600 flex-shrink-0">🏃 sprint</span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-700">
                  {story.story_points} pts
                </span>
                {/* Quick action: mover backlog → sprint ativo. Substitui o SprintBoard separado */}
                {!story.sprint_id && activeSprint && (
                  <button onClick={() => moveToSprint(story.id, activeSprint.id)}
                    title={`Mover para ${activeSprint.name}`}
                    className="text-xs bg-orange-50 text-orange-700 hover:bg-orange-100 px-2 py-1 rounded">
                    → Sprint
                  </button>
                )}
                {story.sprint_id && (
                  <button onClick={() => moveToSprint(story.id, null)}
                    title="Voltar ao backlog"
                    className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 px-2 py-1 rounded">
                    ← Backlog
                  </button>
                )}
                <button onClick={() => { setEditingStory(story); setShowForm(true) }}
                  className="text-blue-600 hover:underline text-xs">Editar</button>
                <button onClick={() => handleDelete(story.id)}
                  className="text-red-600 hover:underline text-xs">Remover</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <StoryForm token={token} projectId={projectId} story={editingStory}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refresh() }} />
      )}
    </div>
  )
}
