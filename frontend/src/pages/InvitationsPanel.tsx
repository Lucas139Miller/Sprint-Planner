import { useState, useEffect } from 'react'

// Tipo do convite recebido (com dados do projeto e do convidador)
interface Invitation {
  id: number
  role: string
  created_at: string
  project_id: number
  project_name: string
  project_description: string
  inviter_username: string
}

interface InvitationsPanelProps {
  token: string
  onResponded: () => void   // Callback quando aceita ou rejeita (atualiza badge)
}

export default function InvitationsPanel({ token, onResponded }: InvitationsPanelProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])

  // Busca convites pendentes
  function fetchInvitations() {
    fetch('http://localhost:3001/api/invitations', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setInvitations(data) })
  }

  useEffect(() => { fetchInvitations() }, [token])

  // Aceita ou rejeita - usa a mesma função com endpoint diferente
  async function respond(id: number, action: 'accept' | 'reject') {
    await fetch(`http://localhost:3001/api/invitations/${id}/${action}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    fetchInvitations()  // Atualiza a lista local
    onResponded()       // Avisa o pai (App) para atualizar o badge do sino
  }

  return (
    <div className="absolute right-0 top-12 bg-white rounded-lg shadow-lg border w-96 z-10 max-h-96 overflow-y-auto">
      <div className="p-4 border-b font-semibold text-gray-800">
        Convites Pendentes ({invitations.length})
      </div>

      {invitations.length === 0 && (
        <p className="p-4 text-sm text-gray-500 text-center">Nenhum convite pendente</p>
      )}

      {invitations.map(inv => (
        <div key={inv.id} className="p-4 border-b last:border-b-0">
          <p className="font-medium text-gray-800">{inv.project_name}</p>
          <p className="text-sm text-gray-500 mb-2">
            <span className="font-medium">{inv.inviter_username}</span> te convidou como{' '}
            <span className="font-medium text-blue-600">{inv.role}</span>
          </p>
          {inv.project_description && (
            <p className="text-xs text-gray-400 mb-3 italic">{inv.project_description}</p>
          )}
          <div className="flex gap-2">
            <button onClick={() => respond(inv.id, 'accept')}
              className="flex-1 bg-green-600 text-white py-1 rounded text-sm hover:bg-green-700">
              Aceitar
            </button>
            <button onClick={() => respond(inv.id, 'reject')}
              className="flex-1 bg-gray-200 text-gray-700 py-1 rounded text-sm hover:bg-gray-300">
              Rejeitar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
