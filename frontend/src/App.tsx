import { useState, useEffect } from 'react'
import { apiFetch } from './api'
import Avatar from './components/Avatar'
import Login from './pages/Login'
import Register from './pages/Register'
import Projects from './pages/Projects'
import CreateProject from './pages/CreateProject'
import ProjectWorkspace from './pages/ProjectWorkspace'
import InvitationsPanel from './pages/InvitationsPanel'

interface User {
  id: number
  username: string
  email: string
}

// Estrutura simplificada após refactor inspirado em Jira/Linear:
// - login/register: telas de auth
// - projects: lista de projetos
// - create-project: formulário
// - workspace: tela única do projeto com tabs (backlog, sprints, board, dashboard)
type Page = 'login' | 'register' | 'projects' | 'create-project' | 'workspace'

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<Page>('login')
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [pendingInvites, setPendingInvites] = useState(0)
  const [showInvitations, setShowInvitations] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true
    const fetchCount = async () => {
      try {
        const data = await apiFetch<unknown[]>('/api/invitations')
        if (active && Array.isArray(data)) setPendingInvites(data.length)
      } catch { /* silencia */ }
    }
    fetchCount()
    const interval = setInterval(fetchCount, 10000)
    return () => { active = false; clearInterval(interval) }
  }, [token])

  useEffect(() => {
    try {
      const saved = localStorage.getItem('user')
      if (saved && token) setUser(JSON.parse(saved))
    } catch {
      localStorage.removeItem('user'); localStorage.removeItem('token')
      setToken(null); setUser(null)
    }
  }, [token])

  function handleLogin(newToken: string, newUser: User) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken); setUser(newUser); setPage('projects')
  }

  function handleLogout() {
    localStorage.removeItem('token'); localStorage.removeItem('user')
    setToken(null); setUser(null); setPage('login')
  }

  function refreshPendingCount() {
    apiFetch<unknown[]>('/api/invitations')
      .then(data => Array.isArray(data) && setPendingInvites(data.length))
      .catch(() => { /* ignora */ })
  }

  if (!token || !user) {
    return page === 'register'
      ? <Register onSwitch={() => setPage('login')} onLogin={handleLogin} />
      : <Login onSwitch={() => setPage('register')} onLogin={handleLogin} />
  }

  function renderPage() {
    if (page === 'create-project') {
      return <CreateProject token={token!}
        onCreated={() => setPage('projects')} onBack={() => setPage('projects')} />
    }
    if (page === 'workspace' && selectedProjectId) {
      return <ProjectWorkspace token={token!} projectId={selectedProjectId}
        onBack={() => setPage('projects')} />
    }
    return <Projects token={token!}
      onCreateProject={() => setPage('create-project')}
      onSelectProject={(id) => { setSelectedProjectId(id); setPage('workspace') }} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white px-6 py-3 flex justify-between items-center sticky top-0 z-20 shadow-sm">
        <h1 className="text-lg font-bold cursor-pointer flex items-center gap-2"
          onClick={() => setPage('projects')}>
          🎯 Sprint Planner
        </h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowInvitations(!showInvitations)}
              title="Convites pendentes"
              className="bg-blue-800 hover:bg-blue-900 px-3 py-1.5 rounded relative text-sm">
              🔔 {pendingInvites > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {pendingInvites}
                </span>
              )}
            </button>
            {showInvitations && (
              <InvitationsPanel token={token!}
                onResponded={() => { refreshPendingCount(); setShowInvitations(false); setPage('projects') }} />
            )}
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <Avatar username={user.username} size="sm" />
            <span>{user.username}</span>
          </div>
          <button onClick={handleLogout}
            className="bg-blue-900 hover:bg-blue-950 border border-blue-600 px-3 py-1.5 rounded text-sm">
            Sair
          </button>
        </div>
      </header>

      <main>{renderPage()}</main>
    </div>
  )
}

export default App
