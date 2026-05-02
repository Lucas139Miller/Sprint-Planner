import { useState, useEffect, useRef } from 'react'
import { apiFetch, ApiError } from '../api'

// Wizard de criação de projeto em 3 passos:
// 1. Form com nome + descrição (com opção de pular IA e criar direto)
// 2. Chat com IA: 3-4 perguntas para refinar o escopo
// 3. Revisão das histórias geradas: usuário escolhe quais incluir
// Submit final: cria projeto e todas as histórias selecionadas em batch.

interface CreateProjectProps {
  token: string
  onCreated: () => void
  onBack: () => void
}

interface Message { role: 'assistant' | 'user'; content: string }
interface Story { title: string; description: string; story_points: number; label: string }

type Step = 'form' | 'chat' | 'review'

export default function CreateProject({ token: _token, onCreated, onBack }: CreateProjectProps) {
  const [step, setStep] = useState<Step>('form')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Estado do chat
  const [messages, setMessages] = useState<Message[]>([])
  const [userInput, setUserInput] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Estado da revisão
  const [stories, setStories] = useState<Story[]>([])
  const [selectedIdx, setSelectedIdx] = useState<Set<number>>(new Set())

  // Auto-scroll do chat para a última mensagem
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // Inicia conversa: pega 1ª pergunta da IA e adiciona como mensagem assistant
  async function startChat() {
    if (!name.trim() || !description.trim()) return setError('Preencha nome e descrição')
    setError(''); setLoading(true); setStep('chat')
    try {
      const res = await apiFetch<{ done: boolean; message?: string; stories?: Story[] }>(
        '/api/ai/project-onboarding',
        { method: 'POST', body: JSON.stringify({ projectName: name, projectDescription: description, messages: [] }) },
      )
      if (res.done && res.stories) {
        setStories(res.stories); setSelectedIdx(new Set(res.stories.map((_, i) => i))); setStep('review')
      } else if (res.message) {
        setMessages([{ role: 'assistant', content: res.message }])
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao iniciar chat')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  // Envia resposta do usuário e busca próxima pergunta (ou histórias finais)
  async function sendAnswer() {
    if (!userInput.trim()) return
    const newMessages: Message[] = [...messages, { role: 'user', content: userInput.trim() }]
    setMessages(newMessages); setUserInput(''); setLoading(true); setError('')
    try {
      const res = await apiFetch<{ done: boolean; message?: string; stories?: Story[] }>(
        '/api/ai/project-onboarding',
        { method: 'POST', body: JSON.stringify({ projectName: name, projectDescription: description, messages: newMessages }) },
      )
      if (res.done && res.stories) {
        setStories(res.stories); setSelectedIdx(new Set(res.stories.map((_, i) => i))); setStep('review')
      } else if (res.message) {
        setMessages([...newMessages, { role: 'assistant', content: res.message }])
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao continuar conversa')
    } finally {
      setLoading(false)
    }
  }

  // Cria projeto + histórias selecionadas. Histórias são criadas em paralelo
  // após criação do projeto (Promise.all).
  async function finalize(skipStories: boolean = false) {
    setError(''); setLoading(true)
    try {
      const project = await apiFetch<{ id: number }>('/api/projects', {
        method: 'POST', body: JSON.stringify({ name, description }),
      })
      if (!skipStories) {
        const toCreate = stories.filter((_, i) => selectedIdx.has(i))
        await Promise.all(toCreate.map(s =>
          apiFetch(`/api/projects/${project.id}/stories`, { method: 'POST', body: JSON.stringify(s) })
        ))
      }
      onCreated()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar projeto')
    } finally {
      setLoading(false)
    }
  }

  function toggleStory(i: number) {
    setSelectedIdx(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const labelColors: Record<string, string> = {
    'feature': 'bg-blue-100 text-blue-700',
    'bug': 'bg-red-100 text-red-700',
    'tech_debt': 'bg-yellow-100 text-yellow-700',
  }

  // ============ STEP 1: FORM ============
  if (step === 'form') {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <button onClick={onBack} className="text-blue-600 hover:underline mb-4 text-sm">← Voltar</button>
        <h2 className="text-xl font-bold text-gray-800 mb-4">Novo Projeto</h2>

        <div className="bg-white p-5 rounded-lg shadow border border-gray-200">
          {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

          <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Projeto *</label>
          <input value={name} onChange={e => setName(e.target.value)} required autoFocus disabled={loading}
            placeholder="Ex: Loja Online"
            className="w-full mb-3 p-2 border rounded focus:outline-blue-500 disabled:bg-gray-100" />

          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} required disabled={loading}
            placeholder="Ex: E-commerce de roupas com pagamento online"
            className="w-full mb-4 p-2 border rounded h-24 resize-none focus:outline-blue-500 disabled:bg-gray-100" />

          <div className="flex flex-col sm:flex-row gap-2">
            <button onClick={startChat} disabled={loading || !name.trim() || !description.trim()}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-purple-300 flex-1">
              ✨ Continuar com IA
            </button>
            <button onClick={() => finalize(true)} disabled={loading || !name.trim() || !description.trim()}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 disabled:bg-gray-100">
              Criar sem IA
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Com IA: respondemos algumas perguntas e geramos histórias iniciais para o backlog.
          </p>
        </div>
      </div>
    )
  }

  // ============ STEP 2: CHAT ============
  if (step === 'chat') {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-1">✨ Vamos refinar seu projeto</h2>
        <p className="text-sm text-gray-500 mb-4">A IA vai fazer algumas perguntas para gerar histórias adequadas ao seu projeto.</p>

        <div className="bg-white rounded-lg shadow border border-gray-200 mb-3">
          {/* Mensagens do chat - bubbles estilo WhatsApp */}
          <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
            <div className="text-xs text-gray-400 text-center">Projeto: <strong>{name}</strong></div>
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                  m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-3 py-2 rounded-lg text-sm text-gray-500">⏳ pensando...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input de resposta */}
          <div className="border-t p-3 bg-gray-50">
            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}
            <div className="flex gap-2">
              <input value={userInput} onChange={e => setUserInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !loading && sendAnswer()}
                disabled={loading} autoFocus
                placeholder="Sua resposta..."
                className="flex-1 p-2 border rounded text-sm focus:outline-blue-500 disabled:bg-gray-100" />
              <button onClick={sendAnswer} disabled={loading || !userInput.trim()}
                className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:bg-blue-300">
                Enviar
              </button>
            </div>
          </div>
        </div>

        <button onClick={() => finalize(true)} disabled={loading}
          className="text-xs text-gray-500 hover:underline">
          Pular IA e criar projeto vazio
        </button>
      </div>
    )
  }

  // ============ STEP 3: REVIEW ============
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800 mb-1">✨ Histórias sugeridas</h2>
      <p className="text-sm text-gray-500 mb-4">
        Selecione as histórias que devem ir para o backlog inicial. <strong>{selectedIdx.size}</strong> de {stories.length} selecionadas.
      </p>

      <div className="space-y-2 mb-4">
        {stories.map((s, i) => (
          <label key={i}
            className={`flex items-start gap-3 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 ${
              selectedIdx.has(i) ? 'border-blue-400 ring-1 ring-blue-200' : 'border-gray-200'
            }`}>
            <input type="checkbox" checked={selectedIdx.has(i)} onChange={() => toggleStory(i)}
              className="mt-1" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                <span className={`text-xs px-1.5 py-0.5 rounded ${labelColors[s.label] || 'bg-gray-100 text-gray-700'}`}>
                  {s.label}
                </span>
                <span className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-medium text-gray-700">
                  {s.story_points} pts
                </span>
              </div>
              <h4 className="font-medium text-gray-800 text-sm">{s.title}</h4>
              <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
            </div>
          </label>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-3">{error}</p>}

      <div className="flex gap-2">
        <button onClick={() => finalize(false)} disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300">
          {loading ? 'Criando...' : `Criar projeto com ${selectedIdx.size} ${selectedIdx.size === 1 ? 'história' : 'histórias'}`}
        </button>
        <button onClick={() => finalize(true)} disabled={loading}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
          Criar sem histórias
        </button>
      </div>
    </div>
  )
}
