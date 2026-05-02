import { useState, useEffect } from 'react'

// Tipo de uma história para o SprintBoard - igual ao do Backlog
// O backend retorna sprint_id (NULL para backlog, número para sprint)
interface Story {
  id: number
  title: string
  description: string
  story_points: number
  label: string
  priority: number
  status: string
  sprint_id: number | null
}

interface SprintBoardProps {
  token: string
  projectId: number
  sprintId: number
  onBack: () => void
}

// SprintBoard mostra duas colunas lado a lado: Backlog (esquerda) e Sprint (direita)
// Permite mover histórias entre os dois estados via botões nos cards.
// Cada coluna exibe o total de story points no topo (útil para PO planejar capacidade).
export default function SprintBoard({ token, projectId, sprintId, onBack }: SprintBoardProps) {
  const [backlog, setBacklog] = useState<Story[]>([])
  const [sprintStories, setSprintStories] = useState<Story[]>([])

  // Busca AMBAS as listas em paralelo (Promise.all) para reduzir tempo de carga
  // Backlog: GET /projects/:id/stories (sprint_id IS NULL por padrão)
  // Sprint: GET /sprints/:id/stories (todas as histórias daquele sprint)
  function fetchBoth() {
    const headers = { 'Authorization': `Bearer ${token}` }
    Promise.all([
      fetch(`http://localhost:3001/api/projects/${projectId}/stories`, { headers }).then(r => r.json()),
      fetch(`http://localhost:3001/api/sprints/${sprintId}/stories`, { headers }).then(r => r.json()),
    ]).then(([bl, sp]) => {
      if (Array.isArray(bl)) setBacklog(bl)
      if (Array.isArray(sp)) setSprintStories(sp)
    })
  }

  useEffect(() => { fetchBoth() }, [projectId, sprintId, token])

  // Move uma história para um sprint (sprint_id = número) ou para o backlog (null)
  // Após mover, recarrega ambas as listas para refletir a mudança visualmente.
  async function moveStory(storyId: number, newSprintId: number | null) {
    await fetch(`http://localhost:3001/api/stories/${storyId}/move-to-sprint`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ sprint_id: newSprintId }),
    })
    fetchBoth()
  }

  // Reduz array de histórias para soma total de pontos (mostrado no topo da coluna)
  function totalPoints(stories: Story[]): number {
    return stories.reduce((sum, s) => sum + (s.story_points || 0), 0)
  }

  // Cores por categoria - mesmo padrão do Backlog para consistência visual
  const labelColors: Record<string, string> = {
    'feature': 'bg-blue-100 text-blue-700',
    'bug': 'bg-red-100 text-red-700',
    'tech_debt': 'bg-yellow-100 text-yellow-700',
  }

  // Renderiza um card de história - reutilizado nas duas colunas com botão diferente
  // O botão muda de texto e ação dependendo de qual coluna está renderizando.
  function renderCard(story: Story, action: 'to-sprint' | 'to-backlog') {
    return (
      <div key={story.id} className="bg-white p-3 rounded-lg shadow border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-xs px-2 py-1 rounded ${labelColors[story.label]}`}>
            {story.label}
          </span>
          <span className="text-xs text-gray-500">#{story.id}</span>
          <span className="ml-auto bg-gray-100 px-2 py-0.5 rounded text-xs font-medium text-gray-700">
            {story.story_points} pts
          </span>
        </div>
        <h4 className="font-medium text-gray-800 text-sm mb-2">{story.title}</h4>
        {action === 'to-sprint' ? (
          <button onClick={() => moveStory(story.id, sprintId)}
            className="w-full text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 py-1 rounded">
            → Mover para Sprint
          </button>
        ) : (
          <button onClick={() => moveStory(story.id, null)}
            className="w-full text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 py-1 rounded">
            ← Voltar ao Backlog
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button onClick={onBack} className="text-blue-600 hover:underline mb-4">
        ← Voltar
      </button>

      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Sprint Board <span className="text-base text-gray-500">(sprint #{sprintId})</span>
      </h2>

      {/* Layout em duas colunas (grid). Em telas pequenas vira uma coluna só. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna do Backlog - histórias ainda não atribuídas a sprint */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">📋 Backlog</h3>
            <span className="text-sm text-gray-500">
              {backlog.length} histórias · {totalPoints(backlog)} pts
            </span>
          </div>
          <div className="space-y-2">
            {backlog.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Backlog vazio</p>
            ) : (
              backlog.map(s => renderCard(s, 'to-sprint'))
            )}
          </div>
        </div>

        {/* Coluna do Sprint Atual - histórias já alocadas para o sprint */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-700">🚀 Sprint Atual</h3>
            <span className="text-sm text-gray-500">
              {sprintStories.length} histórias · {totalPoints(sprintStories)} pts
            </span>
          </div>
          <div className="space-y-2">
            {sprintStories.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma história no sprint</p>
            ) : (
              sprintStories.map(s => renderCard(s, 'to-backlog'))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
