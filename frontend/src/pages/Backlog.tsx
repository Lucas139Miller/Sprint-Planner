import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'
import StoryForm from './StoryForm'
import AiGenerateModal from './AiGenerateModal'

interface Story {
  id: number
  title: string
  description: string
  story_points: number
  label: string
  priority: number
  status: string
  sprint_id: number | null
  assignee_id: number | null
}

interface SprintMini { id: number; name: string; status: string }
interface Member { id: number; username: string; email: string }

interface BacklogProps {
  token: string
  projectId: number
  onBack: () => void
  embedded?: boolean
}

export default function Backlog({ token, projectId, onBack, embedded }: BacklogProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [sprints, setSprints] = useState<SprintMini[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [viewAll, setViewAll] = useState(false)

  // Carrega histórias, sprints e membros em paralelo (3 requests).
  // Membros são necessários para o seletor de responsável em cada card.
  async function refresh() {
    setLoading(true); setError('')
    try {
      const storiesPath = viewAll
        ? `/api/projects/${projectId}/stories?include=all`
        : `/api/projects/${projectId}/stories`
      const [storiesData, sprintsData, membersData] = await Promise.all([
        apiFetch<Story[]>(storiesPath),
        apiFetch<SprintMini[]>(`/api/projects/${projectId}/sprints`),
        apiFetch<Member[]>(`/api/projects/${projectId}/members`),
      ])
      setStories(storiesData); setSprints(sprintsData); setMembers(membersData)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [projectId, token, viewAll])

  // Move uma história para um sprint específico (ou null = backlog).
  // Usa endpoint dedicado /move-to-sprint que valida cross-project IDOR.
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

  // Atribui ou remove o responsável da história. null = sem responsável.
  // Backend valida que o assignee é membro do projeto.
  async function assignMember(storyId: number, assigneeId: number | null) {
    try {
      await apiFetch(`/api/stories/${storyId}`, {
        method: 'PUT', body: JSON.stringify({ assignee_id: assigneeId }),
      })
      refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atribuir responsável')
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja remover esta história?')) return
    try {
      await apiFetch(`/api/stories/${id}`, { method: 'DELETE' })
      refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover')
    }
  }

  // Sprints disponíveis = planning + active (sprints completed não aceitam histórias)
  const availableSprints = sprints.filter(s => s.status !== 'completed')

  const backlogPoints = stories.filter(s => !s.sprint_id).reduce((sum, s) => sum + (s.story_points || 0), 0)

  const labelColors: Record<string, string> = {
    'feature': 'bg-blue-100 text-blue-700',
    'bug': 'bg-red-100 text-red-700',
    'tech_debt': 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {!embedded && (
        <button onClick={onBack} className="text-blue-600 hover:underline mb-4">← Voltar</button>
      )}

      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Backlog do Produto</h2>
          <p className="text-xs text-gray-500 mt-1">
            {stories.filter(s => !s.sprint_id).length} histórias · {backlogPoints} pontos
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm text-gray-600 flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={viewAll} onChange={e => setViewAll(e.target.checked)} />
            Mostrar histórias em sprints
          </label>
          <button onClick={() => setShowAi(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm">
            ✨ Gerar com IA
          </button>
          <button onClick={() => { setEditingStory(null); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
            + Nova História
          </button>
        </div>
      </div>

      {loading && <p className="text-gray-500 text-center py-8">Carregando...</p>}
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
              story.sprint_id ? 'border-gray-200 opacity-90' : 'border-gray-200'
            }`}>
            <div className="flex justify-between items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className={`text-xs px-2 py-0.5 rounded ${labelColors[story.label] || 'bg-gray-100 text-gray-700'} flex-shrink-0`}>
                  {story.label}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">#{story.id}</span>
                <h3 className="font-medium text-gray-800 text-sm truncate">{story.title}</h3>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-700">
                  {story.story_points} pts
                </span>

                {/* Seletor de Sprint - select nativo confiável (substitui dropdown custom)
                    value vazio = backlog (sprint_id = null) */}
                <select value={story.sprint_id || ''}
                  onChange={e => moveToSprint(story.id, e.target.value ? Number(e.target.value) : null)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-blue-500 cursor-pointer hover:border-blue-400"
                  title="Mover para sprint">
                  <option value="">📋 Backlog</option>
                  {availableSprints.map(s => (
                    <option key={s.id} value={s.id}>
                      🏃 {s.name} {s.status === 'active' ? '(ativo)' : ''}
                    </option>
                  ))}
                </select>

                {/* Seletor de Responsável - mostra todos os membros do projeto */}
                <select value={story.assignee_id || ''}
                  onChange={e => assignMember(story.id, e.target.value ? Number(e.target.value) : null)}
                  className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-blue-500 cursor-pointer hover:border-blue-400"
                  title="Atribuir responsável">
                  <option value="">👤 Sem responsável</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>👤 {m.username}</option>
                  ))}
                </select>

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

      {showAi && (
        <AiGenerateModal projectId={projectId}
          onClose={() => setShowAi(false)}
          onCreated={refresh} />
      )}
    </div>
  )
}
