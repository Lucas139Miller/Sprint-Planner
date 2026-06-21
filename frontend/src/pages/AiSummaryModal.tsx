import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'

// Modal de resumo de sprint via IA (US9).
// Acionado pelo botão "✨ Resumo IA" em cada card de sprint.

interface AiSummaryModalProps {
  sprintId: number
  sprintName: string
  onClose: () => void
}

interface SummaryResponse {
  summary: string
  metrics?: {
    totalPoints: number
    donePoints: number
    storiesCount: number
    inProgressCount: number
    inReviewCount: number
  }
}

export default function AiSummaryModal({ sprintId, sprintName, onClose }: AiSummaryModalProps) {
  const [data, setData] = useState<SummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Dispara a chamada à IA assim que o modal abre
  useEffect(() => {
    apiFetch<SummaryResponse>('/api/ai/sprint-summary', {
      method: 'POST', body: JSON.stringify({ sprintId }),
    })
      .then(d => setData(d))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Erro ao gerar resumo'))
      .finally(() => setLoading(false))
  }, [sprintId])

  // Renderização markdown simples (negrito + listas + parágrafos).
  // Evita biblioteca externa só para esta tela.
  function renderMarkdown(md: string) {
    return md.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <h4 key={i} className="font-bold text-gray-800 mt-3 mb-1">{line.slice(3)}</h4>
      if (line.startsWith('# ')) return <h3 key={i} className="font-bold text-gray-800 text-lg mt-3 mb-1">{line.slice(2)}</h3>
      if (line.startsWith('* ') || line.startsWith('- ')) {
        return <li key={i} className="ml-4 text-sm text-gray-700">{renderInline(line.slice(2))}</li>
      }
      if (!line.trim()) return <div key={i} className="h-2" />
      return <p key={i} className="text-sm text-gray-700 mb-1">{renderInline(line)}</p>
    })
  }

  // Substitui **bold** por <strong> sem usar dangerouslySetInnerHTML (XSS-safe)
  function renderInline(text: string): React.ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-30 p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-semibold text-gray-800">✨ Resumo IA — {sprintName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-500">⏳ Analisando sprint com IA...</p>
              <p className="text-xs text-gray-400 mt-2">Isso pode levar alguns segundos</p>
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {data && (
            <>
              {data.metrics && (
                <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                  <div className="bg-blue-50 p-2 rounded">
                    <div className="text-xs text-gray-600">Pontos</div>
                    <div className="font-bold text-blue-700">{data.metrics.donePoints}/{data.metrics.totalPoints}</div>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded">
                    <div className="text-xs text-gray-600">Em revisão</div>
                    <div className="font-bold text-yellow-700">{data.metrics.inReviewCount}</div>
                  </div>
                  <div className="bg-purple-50 p-2 rounded">
                    <div className="text-xs text-gray-600">Histórias</div>
                    <div className="font-bold text-purple-700">{data.metrics.storiesCount}</div>
                  </div>
                </div>
              )}
              <div className="prose prose-sm max-w-none">
                {renderMarkdown(data.summary)}
              </div>
            </>
          )}
        </div>

        <div className="p-3 border-t bg-gray-50 text-right">
          <button onClick={onClose}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
