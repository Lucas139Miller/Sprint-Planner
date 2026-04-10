import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'

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

  // Controla qual página mostrar: tela de login ou de registro
  const [page, setPage] = useState<'login' | 'register'>('login')

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
          <span>Olá, {user.username}</span>
          <button onClick={handleLogout}
            className="bg-blue-800 px-3 py-1 rounded hover:bg-blue-900">
            Sair
          </button>
        </div>
      </header>
      <main className="p-8 text-center text-gray-500">
        <p className="text-lg">Bem-vindo ao Sprint Planner!</p>
        <p className="mt-2">Seus projetos aparecerão aqui em breve.</p>
      </main>
    </div>
  )
}

export default App
