import { useState, useEffect } from 'react'
import SprintForm from './SprintForm'

// Tipo de um sprint conforme retorno da API (rotas em routes/sprints.js)
// Datas são strings ISO YYYY-MM-DD - string no frontend porque inputs date trabalham assim
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
  const [showForm, setShowForm] = useState(false)
  // editingSprint = null → criar novo; objeto → editar existente
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)

  // Carrega a lista de sprints do projeto ao montar e quando o projectId mudar
  function fetchSprints() {
    fetch(`http://localhost:3001/api/projects/${projectId}/sprints`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setSprints(data) })
  }

  useEffect(() => { fetchSprints() }, [projectId, token])

  // Remove sprint após confirmar (DELETE /api/sprints/:id)
  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja remover este sprint?')) return
    await fetch(`http://localhost:3001/api/sprints/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    fetchSprints()
  }

  // Cores dos badges por status do sprint (exigido pela US4)
  const statusColors: Record<string, string> = {
    'planning': 'bg-yellow-100 text-yellow-700',
    'active': 'bg-green-100 text-green-700',
    'completed': 'bg-gray-100 text-gray-700',
  }

  // Tradução para PT-BR para exibir no badge
  const statusLabels: Record<string, string> = {
    'planning': 'Planejamento',
    'active': 'Em andamento',
    'completed': 'Concluído',
  }

  // Formata "YYYY-MM-DD" para "DD/MM/YYYY" (formato BR), ou exibe traço se null
  function formatDate(d: string | null): string {
    if (!d) return '—'
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
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

      {/* Estado vazio - guia o usuário a criar o primeiro sprint */}
      {sprints.length === 0 && !showForm && (
        <p className="text-gray-500 text-center mt-12">
          Nenhum sprint criado ainda. Crie o primeiro!
        </p>
      )}

      {/* Lista de sprints (cards) - cada card mostra nome, badge, meta e datas */}
      <div className="space-y-3">
        {sprints.map(sprint => (
          <div key={sprint.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-800">{sprint.name}</h3>
                  {/* Badge de status com cor distinta por estado */}
                  <span className={`text-xs px-2 py-1 rounded ${statusColors[sprint.status]}`}>
                    {statusLabels[sprint.status]}
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

      {/* Modal de criar/editar sprint - mesmo componente para ambos casos */}
      {showForm && (
        <SprintForm token={token} projectId={projectId} sprint={editingSprint}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchSprints() }} />
      )}
    </div>
  )
}
