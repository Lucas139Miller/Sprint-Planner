import { useState, useEffect } from 'react'
import { apiFetch } from './api'
import Login from './pages/Login'
import Register from './pages/Register'
import Projects from './pages/Projects'
import CreateProject from './pages/CreateProject'
import ProjectDetail from './pages/ProjectDetail'
import InvitationsPanel from './pages/InvitationsPanel'
import Backlog from './pages/Backlog'
import Sprints from './pages/Sprints'
import Dashboard from './pages/Dashboard'
import SprintBoard from './pages/SprintBoard'
import KanbanBoard from './pages/KanbanBoard'

interface User {
  id: number
  username: string
  email: string
}

// Lista de páginas internas (após login). Centralizada para checagens consistentes.
type Page = 'login' | 'register' | 'projects' | 'create-project' | 'project-detail' | 'backlog' | 'sprints' | 'dashboard' | 'kanban' | 'sprint-board'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('login')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null)
  const [pendingInvites, setPendingInvites] = useState(0)
  const [showInvitations, setShowInvitations] = useState(false)

  // Polling de convites pendentes a cada 10s.
  // apiFetch trata 401 fazendo logout automático (window.location.reload).
  useEffect(() => {
    if (!token) return
    let active = true   // Guard contra setState após unmount
    const fetchCount = async () => {
      try {
        const data = await apiFetch<unknown[]>('/api/invitations')
        if (active && Array.isArray(data)) setPendingInvites(data.length)
      } catch { /* silencia para não derrubar a UI */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 10000)
    return () => { active = false; clearInterval(interval) }
  }, [token])

  // Recupera dados do usuário do localStorage. try/catch evita crash com JSON corrompido.
  useEffect(() => {
    try {
      const saved = localStorage.getItem('user')
      if (saved && token) setUser(JSON.parse(saved))
    } catch {
      localStorage.removeItem('user')
      localStorage.removeItem('token')
      setToken(null); setUser(null)
    }
  }, [token])

  function handleLogin(newToken: string, newUser: User) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
    setPage('projects')
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null); setUser(null)
    setPage('login')
  }

  // Tela de auth: se sem token, mostra login OU register
  if (!token || !user) {
    return page === 'register'
      ? <Register onSwitch={() => setPage('login')} onLogin={handleLogin} />
      : <Login onSwitch={() => setPage('register')} onLogin={handleLogin} />
  }

  // Renderiza a página interna baseada no estado.
  // Páginas que dependem de selectedProjectId/selectedSprintId fazem fallback para 'projects'
  // se faltar o id - evita tela em branco se o usuário voltar e abrir uma URL inválida.
  function renderPage() {
    switch (page) {
      case 'create-project':
        return <CreateProject token={token!}
          onCreated={() => setPage('projects')} onBack={() => setPage('projects')} />
      case 'project-detail':
        if (!selectedProjectId) return renderProjects()
        return <ProjectDetail token={token!} projectId={selectedProjectId}
          onBack={() => setPage('projects')}
          onOpenBacklog={() => setPage('backlog')}
          onOpenSprints={() => setPage('sprints')} />
      case 'backlog':
        if (!selectedProjectId) return renderProjects()
        return <Backlog token={token!} projectId={selectedProjectId}
          onBack={() => setPage('project-detail')}
          onOpenDashboard={(id) => { setSelectedSprintId(id); setPage('dashboard') }}
          onOpenKanban={(id) => { setSelectedSprintId(id); setPage('kanban') }}
          onOpenSprintBoard={(id) => { setSelectedSprintId(id); setPage('sprint-board') }} />
      case 'sprints':
        if (!selectedProjectId) return renderProjects()
        return <Sprints token={token!} projectId={selectedProjectId}
          onBack={() => setPage('project-detail')} />
      case 'dashboard':
        if (!selectedProjectId || !selectedSprintId) return renderProjects()
        return <Dashboard token={token!} projectId={selectedProjectId} sprintId={selectedSprintId}
          onBack={() => setPage('backlog')} />
      case 'kanban':
        if (!selectedProjectId || !selectedSprintId) return renderProjects()
        return <KanbanBoard token={token!} projectId={selectedProjectId} sprintId={selectedSprintId}
          onBack={() => setPage('backlog')} />
      case 'sprint-board':
        if (!selectedProjectId || !selectedSprintId) return renderProjects()
        return <SprintBoard token={token!} projectId={selectedProjectId} sprintId={selectedSprintId}
          onBack={() => setPage('backlog')} />
      default:
        return renderProjects()
    }
  }

  function renderProjects() {
    return <Projects token={token!}
      onCreateProject={() => setPage('create-project')}
      onSelectProject={(id) => { setSelectedProjectId(id); setPage('project-detail') }} />
  }

  function refreshPendingCount() {
    apiFetch<unknown[]>('/api/invitations')
      .then(data => Array.isArray(data) && setPendingInvites(data.length))
      .catch(() => { /* ignora */ })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold cursor-pointer" onClick={() => setPage('projects')}>
          🎯 Sprint Planner
        </h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <button onClick={() => setShowInvitations(!showInvitations)}
              className="bg-blue-800 px-3 py-1 rounded hover:bg-blue-900 relative">
              🔔 {pendingInvites > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingInvites}
                </span>
              )}
            </button>
            {showInvitations && (
              <InvitationsPanel token={token!}
                onResponded={() => { refreshPendingCount(); setShowInvitations(false) }} />
            )}
          </div>
          <span className="hidden sm:inline">Olá, {user.username}</span>
          <button onClick={handleLogout}
            className="bg-blue-900 px-3 py-1 rounded hover:bg-blue-950 border border-blue-600">
            Sair
          </button>
        </div>
      </header>

      <main>{renderPage()}</main>
    </div>
  )
}

export default App
