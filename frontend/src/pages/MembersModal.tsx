import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'

interface Member {
  id: number
  username: string
  email: string
  role: string
}

interface MembersModalProps {
  projectId: number
  onClose: () => void
}

// Modal compacto de membros - acessível via ícone pequeno no header do workspace.
// Antes ocupava metade da tela como página principal; agora é uma feature secundária
// (a tela principal é Backlog/Board/Dashboard).
export default function MembersModal({ projectId, onClose }: MembersModalProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState('Dev')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function fetchMembers() {
    try {
      const data = await apiFetch<Member[]>(`/api/projects/${projectId}/members`)
      setMembers(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar membros')
    }
  }

  useEffect(() => { fetchMembers() }, [projectId])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess(''); setSubmitting(true)
    try {
      const data = await apiFetch<{ invitee: { username: string }; role: string }>(
        `/api/projects/${projectId}/members`,
        { method: 'POST', body: JSON.stringify({ identifier, role }) },
      )
      setSuccess(`Convite enviado para ${data.invitee?.username || identifier}`)
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-gray-800">👥 Membros do Projeto</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto p-4 space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <div>
                <div className="font-medium text-gray-800 text-sm">{m.username}</div>
                <div className="text-xs text-gray-500">{m.email}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${roleColors[m.role] || 'bg-gray-100 text-gray-700'}`}>
                {m.role}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleInvite} className="border-t p-4 bg-gray-50">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Convidar novo membro</h4>
          {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
          {success && <p className="text-green-600 text-xs mb-2">{success}</p>}
          <div className="flex gap-2">
            <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
              placeholder="Email ou username" required disabled={submitting}
              className="flex-1 p-2 border rounded text-sm focus:outline-blue-500 disabled:bg-gray-100" />
            <select value={role} onChange={e => setRole(e.target.value)} disabled={submitting}
              className="p-2 border rounded text-sm focus:outline-blue-500 disabled:bg-gray-100">
              <option value="Dev">Dev</option>
              <option value="Scrum Master">SM</option>
              <option value="PO">PO</option>
            </select>
            <button type="submit" disabled={submitting}
              className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-blue-400">
              {submitting ? '...' : 'Convidar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
