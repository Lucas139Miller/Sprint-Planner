import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'

// Modal de geração de histórias com IA (US8).
// Usuário descreve o projeto em texto livre, IA sugere 3-6 histórias formatadas.
// Cada sugestão pode ser aceita individualmente (cria via POST /stories) ou descartada.

interface Suggestion {
  title: string
  description: string
  story_points: number
  label: string
}

interface AiGenerateModalProps {
  projectId: number
  onClose: () => void
  onCreated: () => void   // Avisa o pai pra recarregar lista de histórias
}

export default function AiGenerateModal({ projectId, onClose, onCreated }: AiGenerateModalProps) {
  const [description, setDescription] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Marca quais sugestões já foram salvas (para feedback visual e evitar duplicar)
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function generate() {
    if (!description.trim()) return setError('Descreva o projeto primeiro')
    setLoading(true); setError(''); setSavedIds(new Set())
    try {
      const data = await apiFetch<{ stories: Suggestion[] }>('/api/ai/generate-stories', {
        method: 'POST', body: JSON.stringify({ description, projectId }),
      })
      setSuggestions(data.stories || [])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao gerar histórias')
    } finally {
      setLoading(false)
    }
  }

  // Adiciona uma sugestão específica como história real no backlog
  async function accept(idx: number) {
    const s = suggestions[idx]
    try {
      await apiFetch(`/api/projects/${projectId}/stories`, {
        method: 'POST', body: JSON.stringify(s),
      })
      // Marca esta sugestão como salva (UX: não pode adicionar 2x acidentalmente)
      setSavedIds(prev => new Set([...prev, idx]))
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao adicionar história')
    }
  }

  const labelColors: Record<string, string> = {
    'feature': 'bg-blue-100 text-blue-700',
    'bug': 'bg-red-100 text-red-700',
    'tech_debt': 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-gray-800">✨ Gerar Histórias com IA</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="p-4 border-b bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-1">Descreva seu projeto ou feature</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            disabled={loading} autoFocus
            placeholder="Ex: Aplicativo de delivery de comida com cardápio, pedidos e pagamento online"
            className="w-full p-2 border rounded text-sm h-20 resize-none focus:outline-blue-500 disabled:bg-gray-100" />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <button onClick={generate} disabled={loading || !description.trim()}
            className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-blue-400">
            {loading ? '⏳ Gerando...' : '✨ Gerar sugestões'}
          </button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {suggestions.length === 0 && !loading && (
            <p className="text-center text-gray-400 text-sm py-8">
              Descreva o projeto acima e clique em "Gerar sugestões"
            </p>
          )}
          <div className="space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className={`p-3 border rounded-lg ${savedIds.has(i) ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${labelColors[s.label] || 'bg-gray-100 text-gray-700'}`}>
                      {s.label}
                    </span>
                    <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-medium text-gray-700">
                      {s.story_points} pts
                    </span>
                  </div>
                  {savedIds.has(i) ? (
                    <span className="text-xs text-green-700 font-medium">✓ Adicionada</span>
                  ) : (
                    <button onClick={() => accept(i)}
                      className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">
                      + Adicionar
                    </button>
                  )}
                </div>
                <h4 className="font-medium text-gray-800 text-sm">{s.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
