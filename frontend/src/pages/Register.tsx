import { useState } from 'react'
import { apiFetch, ApiError } from '../api'

interface RegisterProps {
  onSwitch: () => void
  onLogin: (token: string, user: { id: number; username: string; email: string }) => void
}

export default function Register({ onSwitch, onLogin }: RegisterProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)

    try {
      const data = await apiFetch<{ token: string; user: { id: number; username: string; email: string } }>(
        '/api/auth/register',
        { method: 'POST', body: JSON.stringify({ username, email, password }) },
      )
      onLogin(data.token, data.user)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">Criar Conta</h1>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <input type="text" placeholder="Nome de usuário" value={username}
          onChange={e => setUsername(e.target.value)} required disabled={loading}
          className="w-full mb-4 p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100" />

        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required disabled={loading}
          className="w-full mb-4 p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100" />

        <input type="password" placeholder="Senha" value={password}
          onChange={e => setPassword(e.target.value)} required disabled={loading}
          className="w-full mb-6 p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100" />

        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-400">
          {loading ? 'Criando...' : 'Criar Conta'}
        </button>

        <p className="mt-4 text-sm text-center text-gray-600">
          Já tem conta?{' '}
          <button type="button" onClick={onSwitch} className="text-blue-600 hover:underline">
            Fazer login
          </button>
        </p>
      </form>
    </div>
  )
}
