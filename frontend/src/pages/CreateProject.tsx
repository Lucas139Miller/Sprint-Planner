import { useState } from 'react'
import { apiFetch, ApiError } from '../api'

interface CreateProjectProps {
  token: string
  onCreated: () => void
  onBack: () => void
}

export default function CreateProject({ token: _token, onCreated, onBack }: CreateProjectProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      })
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar projeto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Novo Projeto</h2>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow border border-gray-200">
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Projeto *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required
          autoFocus disabled={loading} placeholder="Ex: Sprint Planner"
          className="w-full mb-4 p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100" />

        <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          disabled={loading} placeholder="Descreva brevemente o objetivo do projeto"
          className="w-full mb-6 p-2 border rounded focus:outline-blue-500 h-24 resize-none disabled:bg-gray-100" />

        <div className="flex gap-3">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400">
            {loading ? 'Criando...' : 'Criar Projeto'}
          </button>
          <button type="button" onClick={onBack} disabled={loading}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Voltar
          </button>
        </div>
      </form>
    </div>
  )
}
