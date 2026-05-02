import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'
import type { Sprint } from './Sprints'

interface SprintFormProps {
  token: string
  projectId: number
  sprint: Sprint | null
  onClose: () => void
  onSaved: () => void
}

export default function SprintForm({ token: _token, projectId, sprint, onClose, onSaved }: SprintFormProps) {
  const [name, setName] = useState(sprint?.name || '')
  const [goal, setGoal] = useState(sprint?.goal || '')
  // Para input type="date", precisa estar em YYYY-MM-DD. Se a API retorna ISO completo, corta os 10 primeiros chars.
  const [startDate, setStartDate] = useState((sprint?.start_date || '').slice(0, 10))
  const [endDate, setEndDate] = useState((sprint?.end_date || '').slice(0, 10))
  const [status, setStatus] = useState<'planning' | 'active' | 'completed'>(sprint?.status || 'planning')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fechar com Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (startDate && endDate && endDate < startDate) {
      return setError('A data de fim deve ser posterior à data de início')
    }

    setLoading(true)
    try {
      const body: Record<string, unknown> = {
        name, goal,
        start_date: startDate || null,
        end_date: endDate || null,
      }
      if (sprint) body.status = status

      const path = sprint ? `/api/sprints/${sprint.id}` : `/api/projects/${projectId}/sprints`
      await apiFetch(path, { method: sprint ? 'PUT' : 'POST', body: JSON.stringify(body) })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar sprint')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20"
      onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">
          {sprint ? 'Editar Sprint' : 'Novo Sprint'}
        </h3>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <label className="block text-sm font-medium mb-1">Nome *</label>
        <input value={name} onChange={e => setName(e.target.value)} required
          autoFocus disabled={loading} placeholder="Sprint 1"
          className="w-full mb-3 p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100" />

        <label className="block text-sm font-medium mb-1">Meta do sprint</label>
        <textarea value={goal} onChange={e => setGoal(e.target.value)} disabled={loading}
          placeholder="Ex: Entregar fluxo de login com testes"
          className="w-full mb-3 p-2 border rounded h-20 resize-none focus:outline-blue-500 disabled:bg-gray-100" />

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={loading}
              className="w-full p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={loading}
              className="w-full p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100" />
          </div>
        </div>

        {sprint && (
          <>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as typeof status)} disabled={loading}
              className="w-full mb-4 p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100">
              <option value="planning">Planejamento</option>
              <option value="active">Em andamento</option>
              <option value="completed">Concluído</option>
            </select>
          </>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} disabled={loading}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400">
            {loading ? 'Salvando...' : (sprint ? 'Salvar' : 'Criar')}
          </button>
        </div>
      </form>
    </div>
  )
}
