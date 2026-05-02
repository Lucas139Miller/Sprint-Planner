import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'
import SprintForm from './SprintForm'

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
}

export default function Sprints({ token, projectId, onBack }: SprintsProps) {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)

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

  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja remover este sprint?')) return
    try {
      await apiFetch(`/api/sprints/${id}`, { method: 'DELETE' })
      fetchSprints()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover sprint')
    }
  }

  const statusColors: Record<string, string> = {
    'planning': 'bg-yellow-100 text-yellow-700',
    'active': 'bg-green-100 text-green-700',
    'completed': 'bg-gray-100 text-gray-700',
  }

  const statusLabels: Record<string, string> = {
    'planning': 'Planejamento',
    'active': 'Em andamento',
    'completed': 'Concluído',
  }

  // Usa Date para evitar bug com timestamps ISO completos (não só YYYY-MM-DD)
  function formatDate(d: string | null): string {
    if (!d) return '—'
    const date = new Date(d)
    if (isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={onBack} className="text-blue-600 hover:underline mb-4">
        ← Voltar ao projeto
      </button>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sprints</h2>
        <button onClick={() => { setEditingSprint(null); setShowForm(true) }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Novo Sprint
        </button>
      </div>

      {loading && <p className="text-gray-500 text-center mt-12">Carregando sprints...</p>}
      {error && <p className="text-red-500 text-center mt-12">{error}</p>}
      {!loading && !error && sprints.length === 0 && !showForm && (
        <p className="text-gray-500 text-center mt-12">
          Nenhum sprint criado ainda. Crie o primeiro!
        </p>
      )}

      <div className="space-y-3">
        {sprints.map(sprint => (
          <div key={sprint.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-800">{sprint.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${statusColors[sprint.status] || 'bg-gray-100 text-gray-700'}`}>
                    {statusLabels[sprint.status] || sprint.status}
                  </span>
                </div>
                {sprint.goal && (
                  <p className="text-sm text-gray-600 mb-2">{sprint.goal}</p>
                )}
                <p className="text-xs text-gray-500">
                  📅 {formatDate(sprint.start_date)} → {formatDate(sprint.end_date)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setEditingSprint(sprint); setShowForm(true) }}
                  className="text-blue-600 hover:underline text-sm">Editar</button>
                <button onClick={() => handleDelete(sprint.id)}
                  className="text-red-600 hover:underline text-sm">Remover</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <SprintForm token={token} projectId={projectId} sprint={editingSprint}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchSprints() }} />
      )}
    </div>
  )
}
