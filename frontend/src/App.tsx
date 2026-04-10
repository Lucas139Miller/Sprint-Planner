import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Register from './pages/Register'

interface User {
  id: number
  username: string
  email: string
}

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [user, setUser] = useState<User | null>(null)
  const [page, setPage] = useState<'login' | 'register'>('login')

  // Recupera dados do usuário salvo no localStorage ao carregar
  useEffect(() => {
    const saved = localStorage.getItem('user')
    if (saved && token) setUser(JSON.parse(saved))
  }, [token])

  function handleLogin(newToken: string, newUser: User) {
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
    setToken(newToken)
    setUser(newUser)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  // Se não está autenticado, mostra login ou registro
  if (!token || !user) {
    return page === 'login'
      ? <Login onSwitch={() => setPage('register')} onLogin={handleLogin} />
      : <Register onSwitch={() => setPage('login')} onLogin={handleLogin} />
  }

  // Tela principal após login
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
