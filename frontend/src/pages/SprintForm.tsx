import { useState } from 'react'
import type { Sprint } from './Sprints'

interface SprintFormProps {
  token: string
  projectId: number
  sprint: Sprint | null   // null = criar novo; objeto = editar existente
  onClose: () => void
  onSaved: () => void
}

export default function SprintForm({ token, projectId, sprint, onClose, onSaved }: SprintFormProps) {
  // Inicializa com valores do sprint se for edição, ou vazio se criação
  // Datas vêm como string ISO YYYY-MM-DD da API (compatível com input type="date")
  const [name, setName] = useState(sprint?.name || '')
  const [goal, setGoal] = useState(sprint?.goal || '')
  const [startDate, setStartDate] = useState(sprint?.start_date || '')
  const [endDate, setEndDate] = useState(sprint?.end_date || '')
  // Status só é editável quando o sprint já existe (criação sempre nasce 'planning')
  const [status, setStatus] = useState<'planning' | 'active' | 'completed'>(
    sprint?.status || 'planning'
  )
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // Valida no cliente que end_date >= start_date para evitar viagens no tempo
    if (startDate && endDate && endDate < startDate) {
      return setError('A data de fim deve ser posterior à data de início')
    }

    // PUT se editando (sprint existe), POST se criando novo
    const url = sprint
      ? `http://localhost:3001/api/sprints/${sprint.id}`
      : `http://localhost:3001/api/projects/${projectId}/sprints`
    const method = sprint ? 'PUT' : 'POST'

    // Envia strings vazias como null para que o backend trate corretamente
    // (o COALESCE no banco prefere o valor antigo se receber NULL)
    const body: Record<string, unknown> = {
      name,
      goal,
      start_date: startDate || null,
      end_date: endDate || null,
    }
    // Só envia status na edição (criação usa o default do banco 'planning')
    if (sprint) body.status = status

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json()
      return setError(data.error || 'Erro ao salvar sprint')
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20"
      onClick={onClose}>
      {/* stopPropagation evita fechar o modal ao clicar dentro dele */}
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">
          {sprint ? 'Editar Sprint' : 'Novo Sprint'}
        </h3>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <label className="block text-sm font-medium mb-1">Nome *</label>
        <input value={name} onChange={e => setName(e.target.value)} required
          placeholder="Sprint 1"
          className="w-full mb-3 p-2 border rounded focus:outline-blue-500" />

        <label className="block text-sm font-medium mb-1">Meta do sprint</label>
        <textarea value={goal} onChange={e => setGoal(e.target.value)}
          placeholder="Ex: Entregar fluxo de login com testes"
          className="w-full mb-3 p-2 border rounded h-20 resize-none focus:outline-blue-500" />

        {/* Datas lado a lado em grid responsivo */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium mb-1">Início</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full p-2 border rounded focus:outline-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fim</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full p-2 border rounded focus:outline-blue-500" />
          </div>
        </div>

        {/* Status só aparece em edição - criação nasce sempre 'planning' */}
        {sprint && (
          <>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as typeof status)}
              className="w-full mb-4 p-2 border rounded focus:outline-blue-500">
              <option value="planning">Planejamento</option>
              <option value="active">Em andamento</option>
              <option value="completed">Concluído</option>
            </select>
          </>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Cancelar
          </button>
          <button type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {sprint ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  )
}
