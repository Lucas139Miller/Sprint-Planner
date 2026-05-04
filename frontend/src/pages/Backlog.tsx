import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'
import StoryForm from './StoryForm'
import AiGenerateModal from './AiGenerateModal'
import Avatar from '../components/Avatar'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonList } from '../components/Skeleton'
import StoryDetailPanel from '../components/StoryDetailPanel'

interface Story {
  id: number
  title: string
  description: string
  acceptance_criteria: string
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
  // Permite o Backlog navegar pra tab Sprints quando o user precisa criar
  // o primeiro sprint. Opcional pra não quebrar callers antigos.
  onOpenSprints?: () => void
}

export default function Backlog({ token, projectId, onBack, embedded, onOpenSprints }: BacklogProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [sprints, setSprints] = useState<SprintMini[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [viewAll, setViewAll] = useState(false)
  // Painel slide-out: history selecionada para detail panel
  const [detailStory, setDetailStory] = useState<Story | null>(null)
  // Confirmação de delete: id pendente (null = modal fechado)
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

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
      // Atualiza detail panel se aberto - garante que reflita mudanças externas
      if (detailStory) {
        const updated = storiesData.find(s => s.id === detailStory.id)
        if (updated) setDetailStory(updated)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [projectId, token, viewAll])

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

  async function doDelete(id: number) {
    setConfirmDeleteId(null)
    try {
      await apiFetch(`/api/stories/${id}`, { method: 'DELETE' })
      if (detailStory?.id === id) setDetailStory(null)
      refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover')
    }
  }

  const availableSprints = sprints.filter(s => s.status !== 'completed')
  const backlogPoints = stories.filter(s => !s.sprint_id).reduce((sum, s) => sum + (s.story_points || 0), 0)

  const labelColors: Record<string, string> = {
    'feature': 'bg-blue-100 text-blue-700',
    'bug': 'bg-red-100 text-red-700',
    'tech_debt': 'bg-yellow-100 text-yellow-700',
  }

  const storyToDelete = stories.find(s => s.id === confirmDeleteId)

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
        <div className="flex gap-2 items-center flex-wrap">
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

      {/* Banner amarelo quando há histórias mas nenhum sprint disponível.
          Sem isso, usuário fica perdido vendo só "Backlog" no select. */}
      {!loading && stories.length > 0 && availableSprints.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-medium text-yellow-900">
              💡 Você ainda não tem sprints criados
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Para mover histórias do backlog, crie um sprint primeiro.
            </p>
          </div>
          {onOpenSprints && (
            <button onClick={onOpenSprints}
              className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700">
              🏃 Criar sprint
            </button>
          )}
        </div>
      )}

      {/* Skeleton loaders enquanto carrega - melhor que texto "Carregando..." */}
      {loading && <SkeletonList count={4} />}

      {error && <p className="text-red-500 text-center py-4 bg-red-50 rounded">{error}</p>}
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
        {!loading && stories.map(story => {
          const assignee = members.find(m => m.id === story.assignee_id)
          return (
            <div key={story.id}
              onClick={() => setDetailStory(story)}
              className={`bg-white p-3 rounded-lg shadow-sm border cursor-pointer hover:shadow-md hover:border-blue-300 transition-all ${
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

                {/* stopPropagation nos selects evita abrir detail panel ao mexer neles */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap" onClick={e => e.stopPropagation()}>
                  <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-700">
                    {story.story_points} pts
                  </span>

                  {/* Quando não há sprint disponível, vira um botão visual que
                      leva o usuário para criar um sprint - melhor UX que select
                      vazio com só "Backlog" */}
                  {availableSprints.length === 0 ? (
                    <button onClick={() => onOpenSprints?.()}
                      disabled={!onOpenSprints}
                      title="Crie um sprint primeiro"
                      className="text-xs border border-yellow-300 bg-yellow-50 text-yellow-800 rounded px-2 py-1 hover:bg-yellow-100 disabled:opacity-60">
                      🏃 Criar sprint para mover
                    </button>
                  ) : (
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
                  )}

                  {/* Avatar + select compacto pro responsável */}
                  <div className="flex items-center gap-1">
                    <Avatar username={assignee?.username} size="sm" />
                    <select value={story.assignee_id || ''}
                      onChange={e => assignMember(story.id, e.target.value ? Number(e.target.value) : null)}
                      className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-blue-500 cursor-pointer hover:border-blue-400"
                      title="Atribuir responsável">
                      <option value="">Sem responsável</option>
                      {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                    </select>
                  </div>

                  <button onClick={() => setConfirmDeleteId(story.id)}
                    className="text-red-600 hover:underline text-xs">Remover</button>
                </div>
              </div>
            </div>
          )
        })}
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

      {/* Detail panel slide-out à direita */}
      {detailStory && (
        <StoryDetailPanel story={detailStory} members={members} sprints={sprints}
          onClose={() => setDetailStory(null)}
          onUpdate={refresh}
          onDelete={(id) => setConfirmDeleteId(id)} />
      )}

      {/* Modal customizado em vez do confirm() nativo */}
      <ConfirmModal
        open={confirmDeleteId !== null}
        title="Remover história?"
        message={storyToDelete ? `"${storyToDelete.title}" será removida permanentemente. Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Remover"
        variant="danger"
        onConfirm={() => confirmDeleteId && doDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}
