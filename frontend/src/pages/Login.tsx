import { useState } from 'react'

// Props que o componente Login recebe do App.tsx:
// - onSwitch: função para trocar para a tela de registro
// - onLogin: função chamada quando o login é bem-sucedido (passa token + user para o App)
interface LoginProps {
  onSwitch: () => void
  onLogin: (token: string, user: { id: number; username: string; email: string }) => void
}

export default function Login({ onSwitch, onLogin }: LoginProps) {
  // Estados controlados do formulário - cada input é vinculado a um estado
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')   // Mensagem de erro da API

  // Função executada ao enviar o formulário (clicar em "Entrar")
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()  // Impede o comportamento padrão do form (recarregar a página)
    setError('')        // Limpa erro anterior

    // try/catch captura erros de rede (backend caído, CORS) que antes travavam
    // o formulário silenciosamente sem nenhum feedback ao usuário.
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()
      if (!res.ok) return setError(data.error || 'Erro ao fazer login')
      onLogin(data.token, data.user)
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold text-blue-700 mb-6">Login</h1>

        {/* Mostra mensagem de erro só se existir */}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {/* Campo de email - "required" faz o navegador validar antes de enviar */}
        <input type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required
          className="w-full mb-4 p-2 border rounded focus:outline-blue-500" />

        {/* Campo de senha */}
        <input type="password" placeholder="Senha" value={password}
          onChange={e => setPassword(e.target.value)} required
          className="w-full mb-6 p-2 border rounded focus:outline-blue-500" />

        {/* Botão de submit - dispara o onSubmit do form */}
        <button type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
          Entrar
        </button>

        {/* Link para trocar para a tela de registro */}
        <p className="mt-4 text-sm text-center text-gray-600">
          Não tem conta?{' '}
          <button type="button" onClick={onSwitch} className="text-blue-600 hover:underline">
            Criar conta
          </button>
        </p>
      </form>
    </div>
  )
}
