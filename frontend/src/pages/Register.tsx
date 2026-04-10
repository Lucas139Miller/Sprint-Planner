import { useState } from 'react'

// Props que o componente Register recebe do App.tsx
// Mesma estrutura do Login - onSwitch troca tela, onLogin salva a sessão
interface RegisterProps {
  onSwitch: () => void
  onLogin: (token: string, user: { id: number; username: string; email: string }) => void
}

export default function Register({ onSwitch, onLogin }: RegisterProps) {
  // Estados do formulário - um para cada campo de input
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Função executada ao enviar o formulário (clicar em "Criar Conta")
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Faz requisição POST para a API de registro
    // Envia username, email e senha - o backend faz o hash da senha antes de salvar
    const res = await fetch('http://localhost:3001/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    })

    const data = await res.json()

    // Se deu erro (ex: 409 = email já existe), mostra a mensagem
    if (!res.ok) return setError(data.error)

    // Se registro foi bem-sucedido, já loga o usuário automaticamente
    // (o backend já retorna o token no registro, então não precisa de um login separado)
    onLogin(data.token, data.user)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">Criar Conta</h1>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Campo de username - será o nome exibido na aplicação */}
        <input type="text" placeholder="Nome de usuário" value={username}
          onChange={e => setUsername(e.target.value)} required
          className="w-full mb-4 p-2 border rounded focus:outline-blue-500" />

        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required
          className="w-full mb-4 p-2 border rounded focus:outline-blue-500" />

        <input type="password" placeholder="Senha" value={password}
          onChange={e => setPassword(e.target.value)} required
          className="w-full mb-6 p-2 border rounded focus:outline-blue-500" />

        <button type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Criar Conta
        </button>

        {/* Link para trocar para a tela de login */}
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
