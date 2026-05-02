import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'
import Projects from './pages/Projects'
import CreateProject from './pages/CreateProject'
import ProjectDetail from './pages/ProjectDetail'
import InvitationsPanel from './pages/InvitationsPanel'
import Backlog from './pages/Backlog'
import Sprints from './pages/Sprints'
import Dashboard from './pages/Dashboard'

// Tipo que define a estrutura dos dados do usuário
interface User {
  id: number
  username: string
  email: string
}

function App() {
  // Estado do token JWT - inicializa lendo do localStorage (persiste entre recarregamentos)
  // Se o usuário já logou antes, o token ainda estará salvo aqui
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))

  // Estado do usuário logado (null = não logado)
  const [user, setUser] = useState<User | null>(null)

  // Controla qual página mostrar dentro do app
  // 'sprints' adicionado pela US4 para listar/criar sprints do projeto
  const [page, setPage] = useState<'login' | 'register' | 'projects' | 'create-project' | 'project-detail' | 'backlog' | 'sprints' | 'dashboard'>('login')

  // ID do projeto selecionado para a tela de detalhes
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  // ID do sprint selecionado para o Dashboard (US7)
  const [selectedSprintId, setSelectedSprintId] = useState<number | null>(null)

  // Quantidade de convites pendentes (para o badge no sino)
  const [pendingInvites, setPendingInvites] = useState(0)

  // Controla se o painel de convites está aberto (dropdown)
  const [showInvitations, setShowInvitations] = useState(false)

  // Busca a contagem de convites pendentes a cada 10s
  useEffect(() => {
    if (!token) return
    const fetchCount = () => {
      fetch('http://localhost:3001/api/invitations', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => { if (Array.isArray(data)) setPendingInvites(data.length) })
    }
    fetchCount()
    const interval = setInterval(fetchCount, 10000)
    return () => clearInterval(interval)
  }, [token])

  // useEffect roda quando o componente carrega (e quando 'token' muda)
  // Recupera os dados do usuário salvos no localStorage
  // Isso faz com que, ao recarregar a página, o usuário continue logado
  useEffect(() => {
    const saved = localStorage.getItem('user')
    if (saved && token) setUser(JSON.parse(saved))
  }, [token])

  // Função chamada quando o login ou registro é bem-sucedido
  // Salva o token e dados do usuário tanto no state (React) quanto no localStorage (persistência)
  function handleLogin(newToken: string, newUser: User) {
    localStorage.setItem('token', newToken)              // Persiste o token no navegador
    localStorage.setItem('user', JSON.stringify(newUser)) // Persiste os dados do usuário
    setToken(newToken)                                    // Atualiza o state → React re-renderiza
    setUser(newUser)
  }

  // Função chamada ao clicar em "Sair"
  // Remove tudo do localStorage e limpa o state → React re-renderiza mostrando o login
  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  // DECISÃO DE RENDERIZAÇÃO:
  // Se NÃO tem token ou NÃO tem user → mostra tela de autenticação
  if (!token || !user) {
    return page === 'login'
      ? <Login onSwitch={() => setPage('register')} onLogin={handleLogin} />
      : <Register onSwitch={() => setPage('login')} onLogin={handleLogin} />
  }

  // Se TEM token e user → mostra a tela principal (usuário está logado)
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-700 text-white p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Sprint Planner</h1>
        <div className="flex items-center gap-4">
          {/* Sino de notificações com badge de contagem */}
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
              <InvitationsPanel token={token}
                onResponded={() => { setPendingInvites(0); setPage('projects') }} />
            )}
          </div>
          <span>Olá, {user.username}</span>
          <button onClick={handleLogout}
            className="bg-blue-800 px-3 py-1 rounded hover:bg-blue-900">
            Sair
          </button>
        </div>
      </header>
      {/* Renderiza a página interna baseada no estado */}
      <main>
        {page === 'create-project' && (
          <CreateProject token={token}
            onCreated={() => setPage('projects')}
            onBack={() => setPage('projects')} />
        )}
        {page === 'project-detail' && selectedProjectId && (
          <ProjectDetail token={token}
            projectId={selectedProjectId}
            onBack={() => setPage('projects')}
            onOpenBacklog={() => setPage('backlog')}
            onOpenSprints={() => setPage('sprints')} />
        )}
        {page === 'backlog' && selectedProjectId && (
          <Backlog token={token}
            projectId={selectedProjectId}
            onBack={() => setPage('project-detail')}
            onOpenDashboard={(sprintId) => { setSelectedSprintId(sprintId); setPage('dashboard') }} />
        )}
        {/* US4: tela de listar/criar sprints do projeto selecionado */}
        {page === 'sprints' && selectedProjectId && (
          <Sprints token={token}
            projectId={selectedProjectId}
            onBack={() => setPage('project-detail')} />
        )}
        {/* US7: dashboard do sprint selecionado */}
        {page === 'dashboard' && selectedProjectId && selectedSprintId && (
          <Dashboard token={token}
            projectId={selectedProjectId}
            sprintId={selectedSprintId}
            onBack={() => setPage('backlog')} />
        )}
        {(page === 'projects' || (page !== 'create-project' && page !== 'project-detail' && page !== 'backlog' && page !== 'sprints' && page !== 'dashboard')) && (
          <Projects token={token}
            onCreateProject={() => setPage('create-project')}
            onSelectProject={(id) => { setSelectedProjectId(id); setPage('project-detail') }} />
        )}
      </main>
    </div>
  )
}

export default App
