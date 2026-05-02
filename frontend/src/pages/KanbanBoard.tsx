import { useState, useEffect } from 'react'

// Tipo de uma história para o Kanban
// O backend retorna assignee_username via LEFT JOIN com users (pode ser null)
interface Story {
  id: number
  title: string
  story_points: number
  label: string
  status: string
  sprint_id: number | null
  assignee_id: number | null
  assignee_username: string | null
}

// Resposta da rota GET /api/sprints/:id/board - histórias agrupadas por coluna
// Backend já entrega assim para o frontend não precisar filtrar 4x no cliente
interface Board {
  to_do: Story[]
  in_progress: Story[]
  in_review: Story[]
  done: Story[]
}

interface KanbanBoardProps {
  token: string
  projectId: number
  sprintId: number
  onBack: () => void
}

// Definição das colunas em ordem da esquerda para a direita
// Usada para iterar e descobrir a coluna anterior/posterior ao clicar em ← →
// Ordem reflete o fluxo natural Scrum: planejado → executando → revisão → pronto
const COLUMNS = [
  { key: 'to_do', label: 'To Do', color: 'bg-gray-100' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-blue-50' },
  { key: 'in_review', label: 'In Review', color: 'bg-yellow-50' },
  { key: 'done', label: 'Done', color: 'bg-green-50' },
] as const

// KanbanBoard mostra 4 colunas (To Do | In Progress | In Review | Done)
// Cada card tem botões ← → para mover entre colunas adjacentes (sem drag-drop ainda)
// Os totais (contagem + pontos) ficam no header de cada coluna
export default function KanbanBoard({ token, sprintId, onBack }: KanbanBoardProps) {
  // Estado do board com 4 chaves vazias - garante render mesmo antes do fetch
  const [board, setBoard] = useState<Board>({
    to_do: [], in_progress: [], in_review: [], done: [],
  })

  // Busca o board agrupado pronto do backend (uma única requisição)
  // Endpoint retorna { to_do, in_progress, in_review, done } com cards já organizados
  function fetchBoard() {
    fetch(`http://localhost:3001/api/sprints/${sprintId}/board`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        // Defensivo: se vier erro (não é objeto com as 4 chaves), mantém estado limpo
        if (data && typeof data === 'object' && 'to_do' in data) setBoard(data)
      })
  }

  useEffect(() => { fetchBoard() }, [sprintId, token])

  // Move uma história para um status específico via PUT /stories/:id/status
  // Recarrega o board após sucesso para refletir a mudança visualmente
  async function moveStory(storyId: number, newStatus: string) {
    await fetch(`http://localhost:3001/api/stories/${storyId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchBoard()
  }

  // Soma de pontos de uma coluna (usado no header para mostrar carga total)
  function totalPoints(stories: Story[]): number {
    return stories.reduce((sum, s) => sum + (s.story_points || 0), 0)
  }

  // Mesmo padrão de cores do Backlog - mantém consistência visual entre telas
  const labelColors: Record<string, string> = {
    'feature': 'bg-blue-100 text-blue-700',
    'bug': 'bg-red-100 text-red-700',
    'tech_debt': 'bg-yellow-100 text-yellow-700',
  }

  // Descobre o índice da coluna atual para calcular vizinhas
  // Retorna -1 se não encontrar (não deveria acontecer, mas é defensivo)
  function colIndex(status: string): number {
    return COLUMNS.findIndex(c => c.key === status)
  }

  // Renderiza um card com botões ← → para mover entre colunas adjacentes
  // ← desabilitado na primeira coluna, → desabilitado na última
  function renderCard(story: Story) {
    const idx = colIndex(story.status)
    const prev = idx > 0 ? COLUMNS[idx - 1] : null
    const next = idx < COLUMNS.length - 1 ? COLUMNS[idx + 1] : null

    return (
      <div key={story.id} className="bg-white p-3 rounded-lg shadow border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-1 rounded ${labelColors[story.label] || ''}`}>
            {story.label}
          </span>
          <span className="text-xs text-gray-500">#{story.id}</span>
          <span className="ml-auto bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-700">
            {story.story_points} pts
          </span>
        </div>
        <h4 className="font-medium text-gray-800 text-sm mb-2">{story.title}</h4>

        {/* Linha de assignee + botões de movimento */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">
            {story.assignee_username ? `👤 ${story.assignee_username}` : '👤 sem responsável'}
          </span>
          <div className="flex gap-1">
            {/* Botão para coluna anterior (desabilitado na primeira) */}
            <button
              disabled={!prev}
              onClick={() => prev && moveStory(story.id, prev.key)}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title={prev ? `Mover para ${prev.label}` : 'Já está na primeira coluna'}
            >
              ←
            </button>
            {/* Botão para coluna seguinte (desabilitado na última) */}
            <button
              disabled={!next}
              onClick={() => next && moveStory(story.id, next.key)}
              className="px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title={next ? `Mover para ${next.label}` : 'Já está na última coluna'}
            >
              →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <button onClick={onBack} className="text-blue-600 hover:underline mb-4">
        ← Voltar
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Kanban Board <span className="text-base text-gray-500">(sprint #{sprintId})</span>
      </h2>

      {/* Grid de 4 colunas - cada uma com seu próprio header e lista de cards */}
      {/* grid-cols-1 em mobile, md:grid-cols-2 em tablet, lg:grid-cols-4 em desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const stories = board[col.key]
          return (
            <div key={col.key} className={`${col.color} rounded-lg p-4`}>
              <div className="mb-4">
                <h3 className="font-semibold text-gray-700">{col.label}</h3>
                <span className="text-xs text-gray-500">
                  {stories.length} cards · {totalPoints(stories)} pts
                </span>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {stories.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">vazio</p>
                ) : (
                  stories.map(renderCard)
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
