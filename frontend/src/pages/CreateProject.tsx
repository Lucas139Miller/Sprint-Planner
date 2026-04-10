import { useState } from 'react'

interface CreateProjectProps {
  token: string
  onCreated: () => void    // Callback: volta para lista de projetos após criar
  onBack: () => void       // Callback: volta para lista sem criar
}

export default function CreateProject({ token, onCreated, onBack }: CreateProjectProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Envia os dados do novo projeto para a API
    const res = await fetch('http://localhost:3001/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,  // Token JWT para autenticação
      },
      body: JSON.stringify({ name, description }),
    })

    const data = await res.json()
    if (!res.ok) return setError(data.error)

    // Projeto criado com sucesso - volta para a lista de projetos
    onCreated()
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Novo Projeto</h2>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border border-gray-200">
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Projeto *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required
          placeholder="Ex: Sprint Planner"
          className="w-full mb-4 p-2 border rounded focus:outline-blue-500" />

        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Descreva brevemente o objetivo do projeto"
          className="w-full mb-6 p-2 border rounded focus:outline-blue-500 h-24 resize-none" />

        <div className="flex gap-3">
          <button type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Criar Projeto
          </button>
          <button type="button" onClick={onBack}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Voltar
          </button>
        </div>
      </form>
    </div>
  )
}
