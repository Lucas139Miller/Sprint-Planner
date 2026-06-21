import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'
import Avatar from './Avatar'

// Painel slide-out à direita (estilo Linear/Jira). Aparece ao clicar numa
// história - mostra detalhes completos sem perder o contexto da lista.

interface Story {
  id: number
  title: string
  description: string
  acceptance_criteria: string
  story_points: number
  label: string
  status: string
  sprint_id: number | null
  assignee_id: number | null
}

interface Member { id: number; username: string; email: string }
interface SprintMini { id: number; name: string; status: string }

interface StoryDetailPanelProps {
  story: Story
  members: Member[]
  sprints: SprintMini[]
  onClose: () => void
  onUpdate: () => void   // Avisa parent pra recarregar a lista
  onDelete: (id: number) => void
}

const STATUS_LABELS: Record<string, string> = {
  to_do: 'A fazer',
  in_progress: 'Em andamento',
  in_review: 'Em revisão',
  done: 'Concluído',
}

const LABEL_COLORS: Record<string, string> = {
  feature: 'bg-blue-100 text-blue-700',
  bug: 'bg-red-100 text-red-700',
  tech_debt: 'bg-yellow-100 text-yellow-700',
}

export default function StoryDetailPanel({ story, members, sprints, onClose, onUpdate, onDelete }: StoryDetailPanelProps) {
  // Estado local pra edição inline. Inicializa com valores da story.
  const [title, setTitle] = useState(story.title)
  const [description, setDescription] = useState(story.description || '')
  const [criteria, setCriteria] = useState(story.acceptance_criteria || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Re-inicializa estado quando troca de story (clicar em outra)
  useEffect(() => {
    setTitle(story.title)
    setDescription(story.description || '')
    setCriteria(story.acceptance_criteria || '')
    setError('')
  }, [story.id])

  // Escape fecha o painel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Salva qualquer campo editável (title/description/criteria) em batch
  async function saveText() {
    if (title === story.title && description === (story.description || '') && criteria === (story.acceptance_criteria || '')) {
      return  // nada mudou
    }
    setSaving(true); setError('')
    try {
      await apiFetch(`/api/stories/${story.id}`, {
        method: 'PUT', body: JSON.stringify({ title, description, acceptance_criteria: criteria }),
      })
      onUpdate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  // Atualiza um campo único (assignee, sprint, status, points, label) sem precisar
  // do botão "Salvar" - mais responsivo. Cada select chama esta função.
  async function updateField(field: string, value: unknown) {
    setError('')
    try {
      const path = field === 'sprint_id'
        ? `/api/stories/${story.id}/move-to-sprint`
        : field === 'status'
          ? `/api/stories/${story.id}/status`
          : `/api/stories/${story.id}`
      await apiFetch(path, { method: 'PUT', body: JSON.stringify({ [field]: value }) })
      onUpdate()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar')
    }
  }

  const assignee = members.find(m => m.id === story.assignee_id)
  const availableSprints = sprints.filter(s => s.status !== 'completed')

  return (
    <>
      {/* Backdrop semi-transparente - clicar fecha */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-30" onClick={onClose} />

      {/* Painel deslizando da direita (animação CSS via translate-x) */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-40 overflow-y-auto">
        {/* Header sticky com label, ID e botão fechar */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded ${LABEL_COLORS[story.label] || 'bg-gray-100'}`}>
              {story.label}
            </span>
            <span className="text-xs text-gray-400">#{story.id}</span>
            <span className="text-xs text-gray-500">{STATUS_LABELS[story.status] || story.status}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}

          {/* Título editável - input full-width sem aparência de input */}
          <div>
            <input value={title} onChange={e => setTitle(e.target.value)} onBlur={saveText}
              className="w-full text-xl font-bold text-gray-800 border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none pb-1 bg-transparent" />
          </div>

          {/* Painel de propriedades em grid 2 colunas */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <Field label="Status">
              <select value={story.status} onChange={e => updateField('status', e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-white focus:outline-blue-500">
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </Field>

            <Field label="Sprint">
              <select value={story.sprint_id || ''}
                onChange={e => updateField('sprint_id', e.target.value ? Number(e.target.value) : null)}
                className="border rounded px-2 py-1 text-sm bg-white focus:outline-blue-500">
                <option value="">📋 Backlog</option>
                {availableSprints.map(s => (
                  <option key={s.id} value={s.id}>🏃 {s.name} {s.status === 'active' ? '(ativo)' : ''}</option>
                ))}
              </select>
            </Field>

            <Field label="Responsável">
              <div className="flex items-center gap-2">
                <Avatar username={assignee?.username} size="sm" />
                <select value={story.assignee_id || ''}
                  onChange={e => updateField('assignee_id', e.target.value ? Number(e.target.value) : null)}
                  className="border rounded px-2 py-1 text-sm bg-white focus:outline-blue-500 flex-1">
                  <option value="">Sem responsável</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
                </select>
              </div>
            </Field>

            <Field label="Pontos">
              <select value={story.story_points} onChange={e => updateField('story_points', Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm bg-white focus:outline-blue-500 w-20">
                {[0, 1, 2, 3, 5, 8, 13, 21].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>

            <Field label="Categoria">
              <select value={story.label} onChange={e => updateField('label', e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-white focus:outline-blue-500">
                <option value="feature">Feature</option>
                <option value="bug">Bug</option>
                <option value="tech_debt">Tech Debt</option>
              </select>
            </Field>
          </div>

          {/* Descrição editável */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} onBlur={saveText}
              placeholder="Adicione mais detalhes sobre a história..."
              className="w-full p-2 border rounded text-sm h-24 resize-none focus:outline-blue-500" />
          </div>

          {/* Critérios de aceitação */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Critérios de Aceitação</label>
            <textarea value={criteria} onChange={e => setCriteria(e.target.value)} onBlur={saveText}
              placeholder="Como saber que está pronto? Ex: ✓ login funciona ✓ erros tratados"
              className="w-full p-2 border rounded text-sm h-24 resize-none focus:outline-blue-500" />
          </div>

          {/* Footer com ações destrutivas */}
          <div className="border-t pt-4 flex justify-between items-center">
            <span className="text-xs text-gray-400">{saving ? 'Salvando...' : 'Mudanças salvas automaticamente'}</span>
            <button onClick={() => onDelete(story.id)}
              className="text-red-600 hover:underline text-sm">
              🗑 Remover história
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// Componente auxiliar para linha de propriedade (label à esquerda, control à direita)
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs font-medium text-gray-600 w-24">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  )
}
