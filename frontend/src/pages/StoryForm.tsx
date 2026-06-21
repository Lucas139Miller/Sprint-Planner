import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'

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
  story: Story | null
  onClose: () => void
  onSaved: () => void
}

export default function StoryForm({ token: _token, projectId, story, onClose, onSaved }: StoryFormProps) {
  const [title, setTitle] = useState(story?.title || '')
  const [description, setDescription] = useState(story?.description || '')
  const [storyPoints, setStoryPoints] = useState(story?.story_points || 0)
  const [label, setLabel] = useState(story?.label || 'feature')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fechar com Escape - melhora UX em modais
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const path = story ? `/api/stories/${story.id}` : `/api/projects/${projectId}/stories`
      await apiFetch(path, {
        method: story ? 'PUT' : 'POST',
        body: JSON.stringify({ title, description, story_points: storyPoints, label }),
      })
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar história')
    } finally {
      setLoading(false)
    }
  }

  const pointOptions = [0, 1, 2, 3, 5, 8, 13, 21]

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20"
      onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()}
        className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg">
        <h3 className="text-xl font-bold mb-4">
          {story ? 'Editar História' : 'Nova História'}
        </h3>

        {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

        <label className="block text-sm font-medium mb-1">Título *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} required
          autoFocus disabled={loading} placeholder="Ex: Como usuário, quero fazer login para acessar meus projetos"
          className="w-full mb-3 p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100" />

        <label className="block text-sm font-medium mb-1">Descrição</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} disabled={loading}
          className="w-full mb-3 p-2 border rounded h-20 resize-none focus:outline-blue-500 disabled:bg-gray-100" />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Story Points</label>
            <select value={storyPoints} onChange={e => setStoryPoints(Number(e.target.value))} disabled={loading}
              className="w-full p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100">
              {pointOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Categoria</label>
            <select value={label} onChange={e => setLabel(e.target.value)} disabled={loading}
              className="w-full p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100">
              <option value="feature">Feature</option>
              <option value="bug">Bug</option>
              <option value="tech_debt">Tech Debt</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} disabled={loading}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-400">
            {loading ? 'Salvando...' : (story ? 'Salvar' : 'Criar')}
          </button>
        </div>
      </form>
    </div>
  )
}
