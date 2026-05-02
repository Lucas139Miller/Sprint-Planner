import { useState } from 'react'

interface Story {
  id: number
  title: string
  description: string
  story_points: number
  label: string
}

interface StoryFormProps {
  token: string
  projectId: number
  story: Story | null   // null = criar nova; objeto = editar existente
  onClose: () => void
  onSaved: () => void
}

export default function StoryForm({ token, projectId, story, onClose, onSaved }: StoryFormProps) {
  // Inicializa com valores da história se for edição, ou vazio se criação
  const [title, setTitle] = useState(story?.title || '')
  const [description, setDescription] = useState(story?.description || '')
  const [storyPoints, setStoryPoints] = useState(story?.story_points || 0)
  const [label, setLabel] = useState(story?.label || 'feature')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // PUT se for edição (story existe), POST se for criação
    const url = story
      ? `http://localhost:3001/api/stories/${story.id}`
      : `http://localhost:3001/api/projects/${projectId}/stories`
    const method = story ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, story_points: storyPoints, label }),
    })

    if (!res.ok) {
      const data = await res.json()
      return setError(data.error || 'Erro ao salvar história')
    }
    onSaved()
  }

  // Pontos no padrão Fibonacci usado em planning poker do Scrum
  const pointOptions = [0, 1, 2, 3, 5, 8, 13, 21]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20"
      onClick={onClose}>
      {/* stopPropagation evita fechar ao clicar dentro do modal */}
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">
          {story ? 'Editar História' : 'Nova História'}
        </h3>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <label className="block text-sm font-medium mb-1">Título *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} required
          placeholder="Como usuário, quero... para..."
          className="w-full mb-3 p-2 border rounded focus:outline-blue-500" />

        <label className="block text-sm font-medium mb-1">Descrição</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)}
          className="w-full mb-3 p-2 border rounded h-20 resize-none focus:outline-blue-500" />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Story Points</label>
            <select value={storyPoints} onChange={e => setStoryPoints(Number(e.target.value))}
              className="w-full p-2 border rounded focus:outline-blue-500">
              {pointOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Categoria</label>
            <select value={label} onChange={e => setLabel(e.target.value)}
              className="w-full p-2 border rounded focus:outline-blue-500">
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="tech_debt">Tech Debt</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Cancelar
          </button>
          <button type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {story ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  )
}
