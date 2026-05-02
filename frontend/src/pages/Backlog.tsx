import { useState, useEffect } from 'react'
import StoryForm from './StoryForm'

// Tipo de uma história de usuário do backlog
interface Story {
  id: number
  title: string
  description: string
  story_points: number
  label: string
  priority: number
  status: string
}

interface BacklogProps {
  token: string
  projectId: number
  onBack: () => void
  // onOpenDashboard é opcional: abre o Dashboard de um sprint para teste rápido
  onOpenDashboard?: (sprintId: number) => void
  // onOpenKanban (US6): abre o Kanban Board de um sprint para teste rápido
  // Opcional para evitar quebrar callers antigos que não passam o callback
  onOpenKanban?: (sprintId: number) => void
  // onOpenSprintBoard (US5): abre o SprintBoard para mover histórias entre
  // backlog ↔ sprint. Opcional pelo mesmo motivo dos demais callbacks.
  onOpenSprintBoard?: (sprintId: number) => void
}

export default function Backlog({ token, projectId, onBack, onOpenDashboard, onOpenKanban, onOpenSprintBoard }: BacklogProps) {
  const [stories, setStories] = useState<Story[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingStory, setEditingStory] = useState<Story | null>(null)

  // Busca histórias do backlog ao carregar
  function fetchStories() {
    fetch(`http://localhost:3001/api/projects/${projectId}/stories`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setStories(data) })
  }

  useEffect(() => { fetchStories() }, [projectId, token])

  // Remove história após confirmação
  async function handleDelete(id: number) {
    if (!confirm('Tem certeza que deseja remover esta história?')) return
    await fetch(`http://localhost:3001/api/stories/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    })
    fetchStories()
  }

  // Cores diferentes por categoria de história
  const labelColors: Record<string, string> = {
    'feature': 'bg-blue-100 text-blue-700',
    'bug': 'bg-red-100 text-red-700',
    'tech_debt': 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button onClick={onBack} className="text-blue-600 hover:underline mb-4">
        ← Voltar aos projetos
      </button>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Backlog</h2>
        <div className="flex gap-2">
          {/* Botão temporário: abre o Dashboard do sprint #1 para testar US7
              (mais tarde será substituído por seleção real de sprint na UI) */}
          {onOpenDashboard && (
            <button onClick={() => onOpenDashboard(1)}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
              📈 Dashboard (sprint #1)
            </button>
          )}
          {/* Botão temporário (US6): abre o Kanban do sprint #1 para teste manual
              Será substituído por seleção real de sprint quando a UI evoluir */}
          {onOpenKanban && (
            <button onClick={() => onOpenKanban(1)}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
              📊 Kanban (sprint #1)
            </button>
          )}
          {/* Botão temporário (US5): abre o SprintBoard do sprint #1 para mover
              histórias backlog ↔ sprint. Será substituído quando a seleção real
              de sprint estiver pronta na UI (a depender de US4). */}
          {onOpenSprintBoard && (
            <button onClick={() => onOpenSprintBoard(1)}
              className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700">
              📊 Sprint Board (sprint #1)
            </button>
          )}
          <button onClick={() => { setEditingStory(null); setShowForm(true) }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            + Nova História
          </button>
        </div>
      </div>

      {/* Estado vazio */}
      {stories.length === 0 && !showForm && (
        <p className="text-gray-500 text-center mt-12">
          Nenhuma história no backlog. Adicione a primeira!
        </p>
      )}

      {/* Lista de histórias ordenadas por prioridade */}
      <div className="space-y-3">
        {stories.map(story => (
          <div key={story.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-1 rounded ${labelColors[story.label]}`}>
                    {story.label}
                  </span>
                  <span className="text-xs text-gray-500">#{story.id}</span>
                </div>
                <h3 className="font-medium text-gray-800">{story.title}</h3>
                {story.description && (
                  <p className="text-sm text-gray-600 mt-1">{story.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium text-gray-700">
                  {story.story_points} pts
                </span>
                <button onClick={() => { setEditingStory(story); setShowForm(true) }}
                  className="text-blue-600 hover:underline text-sm">Editar</button>
                <button onClick={() => handleDelete(story.id)}
                  className="text-red-600 hover:underline text-sm">Remover</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de criar/editar história */}
      {showForm && (
        <StoryForm token={token} projectId={projectId} story={editingStory}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchStories() }} />
      )}
    </div>
  )
}
