import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'
import SprintForm from './SprintForm'
import AiSummaryModal from './AiSummaryModal'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonList } from '../components/Skeleton'

export interface Sprint {
  id: number
  project_id: number
  name: string
  goal: string
  start_date: string | null
  end_date: string | null
  status: 'planning' | 'active' | 'completed'
  created_at: string
}

interface SprintsProps {
  token: string
  projectId: number
  onBack: () => void
  embedded?: boolean
  onSprintsChanged?: () => void   // Avisa o workspace pra recarregar o seletor
}

export default function Sprints({ token, projectId, onBack, embedded, onSprintsChanged }: SprintsProps) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)
  const [aiSprint, setAiSprint] = useState<Sprint | null>(null)
  // Sprint pendente de exclusão (substitui confirm() nativo)
  const [confirmDelete, setConfirmDelete] = useState<Sprint | null>(null)

  async function fetchSprints() {
    setLoading(true); setError('')
    try {
      const data = await apiFetch<Sprint[]>(`/api/projects/${projectId}/sprints`)
      setSprints(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar sprints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSprints() }, [projectId, token])

  async function doDelete() {
    if (!confirmDelete) return
    const id = confirmDelete.id
    setConfirmDelete(null)
    try {
      await apiFetch(`/api/sprints/${id}`, { method: 'DELETE' })
      fetchSprints(); onSprintsChanged?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover sprint')
    }
  }

  // Atalho: ativar sprint diretamente do card (mais rápido que abrir modal)
  async function setStatus(sprint: Sprint, newStatus: Sprint['status']) {
    try {
      await apiFetch(`/api/sprints/${sprint.id}`, {
        method: 'PUT', body: JSON.stringify({ status: newStatus }),
      })
      fetchSprints(); onSprintsChanged?.()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao mudar status')
    }
  }

  const statusColors: Record<string, string> = {
    'planning': 'bg-yellow-100 text-yellow-700 border-yellow-300',
    'active': 'bg-green-100 text-green-700 border-green-300',
    'completed': 'bg-gray-100 text-gray-700 border-gray-300',
  }

  const statusLabels: Record<string, string> = {
    'planning': 'Planejamento',
    'active': 'Em andamento',
    'completed': 'Concluído',
  }

  function formatDate(d: string | null): string {
    if (!d) return '—'
    const date = new Date(d)
    if (isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {!embedded && (
        <button onClick={onBack} className="text-blue-600 hover:underline mb-4">← Voltar</button>
      )}

      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Sprints</h2>
          <p className="text-xs text-gray-500 mt-1">{sprints.length} sprint(s)</p>
        </div>
        <button onClick={() => { setEditingSprint(null); setShowForm(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
          + Novo Sprint
        </button>
      </div>

      {loading && <SkeletonList count={3} />}
      {error && <p className="text-red-500 text-center py-8">{error}</p>}
      {!loading && !error && sprints.length === 0 && !showForm && (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500 mb-3">Nenhum sprint criado ainda.</p>
          <button onClick={() => { setEditingSprint(null); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + Criar primeiro sprint
          </button>
        </div>
      )}

      <div className="space-y-3">
        {sprints.map(sprint => (
          <div key={sprint.id}
            className={`bg-white p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow ${
              sprint.status === 'active' ? 'border-green-300 ring-1 ring-green-200' : 'border-gray-200'
            }`}>
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-800">{sprint.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded border ${statusColors[sprint.status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
                    {statusLabels[sprint.status] || sprint.status}
                  </span>
                </div>
                {sprint.goal && (<p className="text-sm text-gray-600 mb-2">{sprint.goal}</p>)}
                <p className="text-xs text-gray-500">
                  📅 {formatDate(sprint.start_date)} → {formatDate(sprint.end_date)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {/* Atalhos rápidos de mudança de status (sem abrir modal) */}
                {sprint.status === 'planning' && (
                  <button onClick={() => setStatus(sprint, 'active')}
                    className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded">
                    ▶ Iniciar
                  </button>
                )}
                {sprint.status === 'active' && (
                  <button onClick={() => setStatus(sprint, 'completed')}
                    className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-2 py-1 rounded">
                    ✓ Concluir
                  </button>
                )}
                {/* Resumo IA disponível pra qualquer sprint que já tenha histórias */}
                <button onClick={() => setAiSprint(sprint)}
                  className="text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-2 py-1 rounded">
                  ✨ Resumo IA
                </button>
                <div className="flex gap-2 text-xs">
                  <button onClick={() => { setEditingSprint(sprint); setShowForm(true) }}
                    className="text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => setConfirmDelete(sprint)}
                    className="text-red-600 hover:underline">Remover</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <SprintForm token={token} projectId={projectId} sprint={editingSprint}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchSprints(); onSprintsChanged?.() }} />
      )}

      {aiSprint && (
        <AiSummaryModal sprintId={aiSprint.id} sprintName={aiSprint.name}
          onClose={() => setAiSprint(null)} />
      )}

      <ConfirmModal
        open={confirmDelete !== null}
        title="Remover sprint?"
        message={confirmDelete ? `O sprint "${confirmDelete.name}" será removido. As histórias dele voltarão para o backlog.` : ''}
        confirmLabel="Remover"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
