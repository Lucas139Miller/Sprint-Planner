import { useState, useEffect } from 'react'
import { apiFetch, ApiError } from '../api'
import ConfirmModal from '../components/ConfirmModal'
import { SkeletonGrid } from '../components/Skeleton'

interface Project {
  id: number
  name: string
  description: string
  role: string
  owner_id: number
  created_at: string
}

interface ProjectsProps {
  token: string
  onCreateProject: () => void
  onSelectProject: (id: number) => void
}

export default function Projects({ token, onCreateProject, onSelectProject }: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Projeto pendente de exclusão (null = modal fechado)
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const currentUserId = JSON.parse(localStorage.getItem('user') || '{}')?.id

  function refresh() {
    setLoading(true); setError('')
    apiFetch<Project[]>('/api/projects')
      .then(data => setProjects(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [token])

  async function doDelete() {
    if (!confirmDelete) return
    const id = confirmDelete.id
    setConfirmDelete(null)
    try {
      await apiFetch(`/api/projects/${id}`, { method: 'DELETE' })
      refresh()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao excluir projeto')
    }
  }

  const roleColors: Record<string, string> = {
    'PO': 'bg-purple-100 text-purple-700',
    'Scrum Master': 'bg-green-100 text-green-700',
    'Dev': 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Meus Projetos</h2>
        <button onClick={onCreateProject}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Novo Projeto
        </button>
      </div>

      {loading && <SkeletonGrid count={6} />}
      {error && <p className="text-red-500 text-center mt-12">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <p className="text-gray-500 text-center mt-12">
          Nenhum projeto ainda. Crie o primeiro!
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => {
          const isOwner = project.owner_id === currentUserId
          return (
            <div key={project.id} onClick={() => onSelectProject(project.id)}
              className="bg-white p-5 rounded-lg shadow hover:shadow-md cursor-pointer border border-gray-200 transition-shadow group relative">
              {/* Botão deletar - só para o dono. group-hover deixa visível só ao passar o mouse */}
              {isOwner && (
                <button onClick={e => { e.stopPropagation(); setConfirmDelete(project) }}
                  title="Excluir projeto"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-50 hover:bg-red-100 text-red-600 w-7 h-7 rounded flex items-center justify-center text-sm">
                  🗑
                </button>
              )}
              <div className="flex justify-between items-start mb-2 pr-8">
                <h3 className="font-semibold text-gray-800">{project.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${roleColors[project.role] || 'bg-gray-100 text-gray-700'}`}>
                  {project.role}
                </span>
              </div>
              <p className="text-sm text-gray-500">{project.description || 'Sem descrição'}</p>
              <p className="text-xs text-gray-400 mt-3">
                Criado em {new Date(project.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )
        })}
      </div>

      <ConfirmModal
        open={confirmDelete !== null}
        title="Excluir projeto?"
        message={confirmDelete ? `"${confirmDelete.name}" e tudo dentro dele (histórias, sprints, membros) serão removidos. Esta ação não pode ser desfeita.` : ''}
        confirmLabel="Excluir"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}
