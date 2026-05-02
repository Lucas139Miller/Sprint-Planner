import { useState, useEffect } from 'react'

// Tipo que representa um membro do projeto
interface Member {
  id: number
  username: string
  email: string
  role: string
}

interface ProjectDetailProps {
  token: string
  projectId: number
  onBack: () => void     // Volta para lista de projetos
}

export default function ProjectDetail({ token, projectId, onBack }: ProjectDetailProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [identifier, setIdentifier] = useState('')   // Email ou username do convidado
  const [role, setRole] = useState('Dev')            // Papel padrão
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Busca membros do projeto ao carregar
  function fetchMembers() {
    fetch(`http://localhost:3001/api/projects/${projectId}/members`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setMembers(data) })
  }

  useEffect(() => { fetchMembers() }, [projectId, token])

  // Envia convite de novo membro
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const res = await fetch(`http://localhost:3001/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ identifier, role }),
    })

    const data = await res.json()
    if (!res.ok) return setError(data.error)

    // Agora o convite fica pendente até o convidado aceitar
    const inviteeName = data.invitee?.username || identifier
    setSuccess(`Convite enviado para ${inviteeName} como ${data.role}. Aguardando aceitação.`)
    setIdentifier('')
  }

  // Cores dos badges por papel Scrum
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

      <h2 className="text-2xl font-bold text-gray-800 mb-6">Membros do Projeto</h2>

      {/* Lista de membros atuais */}
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        {members.map(m => (
          <div key={m.id} className="flex justify-between items-center p-4 border-b last:border-b-0">
            <div>
              <span className="font-medium text-gray-800">{m.username}</span>
              <span className="text-sm text-gray-500 ml-2">{m.email}</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${roleColors[m.role] || ''}`}>
              {m.role}
            </span>
          </div>
        ))}
      </div>

      {/* Formulário de convite */}
      <form onSubmit={handleInvite} className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">Convidar Membro</h3>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

        <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)}
          placeholder="Email ou username" required
          className="w-full mb-3 p-2 border rounded focus:outline-blue-500" />

        {/* Dropdown para selecionar o papel Scrum */}
        <select value={role} onChange={e => setRole(e.target.value)}
          className="w-full mb-4 p-2 border rounded focus:outline-blue-500">
          <option value="Dev">Dev</option>
          <option value="Scrum Master">Scrum Master</option>
          <option value="PO">PO</option>
        </select>

        <button type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          Convidar
        </button>
      </form>
    </div>
  )
}
