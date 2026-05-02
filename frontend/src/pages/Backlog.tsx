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
}

interface Sprint {
  id: number
  name: string
  status: string
}

interface BacklogProps {
  token: string
  projectId: number
  onBack: () => void
  // Callbacks recebem o sprintId real (descoberto via API), não mais hardcoded
  onOpenDashboard?: (sprintId: number) => void
  onOpenKanban?: (sprintId: number) => void
  onOpenSprintBoard?: (sprintId: number) => void
}

export default function Backlog({ token, projectId, onBack, onOpenDashboard, onOpenKanban, onOpenSprintBoard }: BacklogProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingStory, setEditingStory] = useState<Story | null>(null)

  // Busca histórias e sprints em paralelo. Sprints serve para os botões
  // saberem qual sprintId real usar (em vez do hardcoded 1).
  async function refresh() {
    setLoading(true); setError('')
    try {
      const [storiesData, sprintsData] = await Promise.all([
        apiFetch<Story[]>(`/api/projects/${projectId}/stories`),
        apiFetch<Sprint[]>(`/api/projects/${projectId}/sprints`),
      ])
      setStories(storiesData); setSprints(sprintsData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [projectId, token])

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja remover esta história?')) return
    try {
      await apiFetch(`/api/stories/${id}`, { method: 'DELETE' })
      refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover história')
    }
  }

  // Sprint ativo (active) ou primeiro disponível, usado para os botões de ação rápida
  const activeSprint = sprints.find(s => s.status === 'active') || sprints[0]

  const labelColors: Record<string, string> = {
    'feature': 'bg-blue-100 text-blue-700',
    'bug': 'bg-red-100 text-red-700',
    'tech_debt': 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={onBack} className="text-blue-600 hover:underline mb-4">
        ← Voltar aos projetos
      </button>

      <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
        <h2 className="text-2xl font-bold text-gray-800">Backlog</h2>
        <div className="flex gap-2 flex-wrap">
          {/* Botões de ação só aparecem se houver pelo menos um sprint criado */}
          {activeSprint && onOpenSprintBoard && (
            <button onClick={() => onOpenSprintBoard(activeSprint.id)}
              className="bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700 text-sm">
              📊 Mover para Sprint
            </button>
          )}
          {activeSprint && onOpenKanban && (
            <button onClick={() => onOpenKanban(activeSprint.id)}
              className="bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700 text-sm">
              📋 Kanban
            </button>
          )}
          {activeSprint && onOpenDashboard && (
            <button onClick={() => onOpenDashboard(activeSprint.id)}
              className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 text-sm">
              📈 Dashboard
            </button>
          )}
          <button onClick={() => { setEditingStory(null); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + Nova História
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500 text-center mt-12">Carregando...</p>}
      {error && <p className="text-red-500 text-center mt-12">{error}</p>}
      {!loading && !error && stories.length === 0 && !showForm && (
        <p className="text-gray-500 text-center mt-12">
          Nenhuma história no backlog. Adicione a primeira!
        </p>
      )}

      <div className="space-y-3">
        {stories.map(story => (
          <div key={story.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded ${labelColors[story.label] || 'bg-gray-100 text-gray-700'}`}>
                    {story.label}
                  </span>
                  <span className="text-xs text-gray-500">#{story.id}</span>
                </div>
                <h3 className="font-medium text-gray-800">{story.title}</h3>
                {story.description && (
                  <p className="text-sm text-gray-600 mt-1">{story.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium text-gray-700">
                  {story.story_points} pts
                </span>
                <button onClick={() => { setEditingStory(story); setShowForm(true) }}
                  className="text-blue-600 hover:underline text-sm">Editar</button>
                <button onClick={() => handleDelete(story.id)}
                  className="text-red-600 hover:underline text-sm">Remover</button>
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
