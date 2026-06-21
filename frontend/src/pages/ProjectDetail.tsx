import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'

interface Member {
  id: number
  username: string
  email: string
  role: string
}

interface ProjectDetailProps {
  token: string
  projectId: number
  onBack: () => void
  onOpenBacklog: () => void
  onOpenSprints: () => void
}

export default function ProjectDetail({ token, projectId, onBack, onOpenBacklog, onOpenSprints }: ProjectDetailProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState('Dev')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  async function fetchMembers() {
    try {
      const data = await apiFetch<Member[]>(`/api/projects/${projectId}/members`)
      setMembers(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar membros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMembers() }, [projectId, token])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setSubmitting(true)
    try {
      const data = await apiFetch<{ invitee: { username: string }; role: string }>(
        `/api/projects/${projectId}/members`,
        { method: 'POST', body: JSON.stringify({ identifier, role }) },
      )
      const inviteeName = data.invitee?.username || identifier
      setSuccess(`Convite enviado para ${inviteeName} como ${data.role}. Aguardando aceitação.`)
      setIdentifier('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar convite')
    } finally {
      setSubmitting(false)
    }
  }

  const roleColors: Record<string, string> = {
    'PO': 'bg-purple-100 text-purple-700',
    'Scrum Master': 'bg-green-100 text-green-700',
    'Dev': 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button onClick={onBack} className="text-blue-600 hover:underline mb-4 inline-block">
        ← Voltar aos projetos
      </button>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Membros do Projeto</h2>
        <div className="flex gap-2">
          <button onClick={onOpenBacklog}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            📋 Backlog
          </button>
          <button onClick={onOpenSprints}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
            🏃 Sprints
          </button>
        </div>
      </div>

      {/* Lista de membros */}
      {loading && <p className="text-gray-500 text-center py-4">Carregando membros...</p>}
      {!loading && members.length > 0 && (
        <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
          {members.map(m => (
            <div key={m.id} className="flex justify-between items-center p-4 border-b last:border-b-0">
              <div>
                <span className="font-medium text-gray-800">{m.username}</span>
                <span className="text-sm text-gray-500 ml-2">{m.email}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${roleColors[m.role] || 'bg-gray-100 text-gray-700'}`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleInvite} className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">Convidar Membro</h3>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

        <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
          placeholder="Email ou username" required disabled={submitting}
          className="w-full mb-3 p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100" />

        <select value={role} onChange={e => setRole(e.target.value)} disabled={submitting}
          className="w-full mb-4 p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100">
          <option value="Dev">Dev</option>
          <option value="Scrum Master">Scrum Master</option>
          <option value="PO">PO</option>
        </select>

        <button type="submit" disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400">
          {submitting ? 'Enviando...' : 'Convidar'}
        </button>
      </form>
    </div>
  )
}
