import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'
import Backlog from './Backlog'
import Sprints from './Sprints'
import KanbanBoard from './KanbanBoard'
import MembersModal from './MembersModal'

// Workspace de um projeto - inspirado em Jira/Linear.
// Tabs no topo (Backlog, Sprints, Board) e sprint selector para o Board.
// Membros viraram um modal acionado por ícone pequeno no header.
type Tab = 'backlog' | 'sprints' | 'board'

interface Sprint { id: number; name: string; status: string }
interface Project { id: number; name: string }

interface ProjectWorkspaceProps {
  token: string
  projectId: number
  onBack: () => void
}

export default function ProjectWorkspace({ token, projectId, onBack }: ProjectWorkspaceProps) {
  const [tab, setTab] = useState<Tab>('backlog')
  const [project, setProject] = useState<Project | null>(null)
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null)
  const [showMembers, setShowMembers] = useState(false)

  // Busca lista de projetos para descobrir o nome (não temos GET /projects/:id)
  // e a lista de sprints para popular o seletor de Board/Dashboard.
  useEffect(() => {
    apiFetch<Project[]>('/api/projects')
      .then(list => setProject(list.find(p => p.id === projectId) || null))
      .catch(() => { /* ignora */ })
  }, [projectId])

  async function refreshSprints() {
    try {
      const data = await apiFetch<Sprint[]>(`/api/projects/${projectId}/sprints`)
      setSprints(data)
      // Auto-seleciona o sprint ativo (ou o mais recente) para Board/Dashboard
      if (data.length > 0 && !selectedSprintId) {
        const active = data.find(s => s.status === 'active') || data[0]
        setSelectedSprintId(active.id)
      }
    } catch (err) {
      if (err instanceof ApiError) console.error(err.message)
    }
  }

  useEffect(() => { refreshSprints() }, [projectId, token])

  // Conteúdo de cada tab. Backlog/Sprints não precisam de sprint selecionado;
  // Board/Dashboard mostram mensagem se não houver sprint ainda.
  function renderTab() {
    if (tab === 'backlog') {
      return <Backlog token={token} projectId={projectId} onBack={() => {}} embedded />
    }
    if (tab === 'sprints') {
      return <Sprints token={token} projectId={projectId} onBack={() => {}} embedded
        onSprintsChanged={refreshSprints} />
    }
    if (!selectedSprintId) {
      return (
        <div className="p-8 text-center text-gray-500">
          <p className="mb-3">Nenhum sprint criado ainda.</p>
          <button onClick={() => setTab('sprints')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Criar primeiro sprint
          </button>
        </div>
      )
    }
    return <KanbanBoard token={token} projectId={projectId} sprintId={selectedSprintId} onBack={() => {}} embedded />
  }

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'backlog', label: 'Backlog', icon: '📋' },
    { key: 'sprints', label: 'Sprints', icon: '🏃' },
    { key: 'board', label: 'Board', icon: '📊' },
  ]

  return (
    <div>
      {/* Breadcrumb + botões de ação (membros) */}
      <div className="bg-white border-b px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onBack} className="text-blue-600 hover:underline">Projetos</button>
          <span className="text-gray-400">/</span>
          <span className="font-medium text-gray-800">{project?.name || 'Carregando...'}</span>
        </div>
        <button onClick={() => setShowMembers(true)}
          title="Gerenciar membros"
          className="text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded text-sm flex items-center gap-1">
          👥 <span className="hidden sm:inline">Membros</span>
        </button>
      </div>

      {/* Tabs estilo Jira */}
      <div className="bg-white border-b px-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Sprint selector aparece só na tab Board */}
        {tab === 'board' && sprints.length > 0 && (
          <div className="flex items-center gap-2 text-sm pb-2">
            <label className="text-gray-600">Sprint:</label>
            <select value={selectedSprintId || ''}
              onChange={e => setSelectedSprintId(Number(e.target.value))}
              className="border rounded px-2 py-1 focus:outline-blue-500">
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Conteúdo da tab */}
      <div>{renderTab()}</div>

      {showMembers && (
        <MembersModal projectId={projectId} onClose={() => setShowMembers(false)} />
      )}
    </div>
  )
}
