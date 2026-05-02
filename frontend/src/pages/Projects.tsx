import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

interface Project {
  id: number
  name: string
  description: string
  role: string
  created_at: string
}

interface ProjectsProps {
  // token não é mais necessário aqui pois apiFetch lê do localStorage,
  // mas mantemos a prop para forçar re-fetch quando o usuário troca
  token: string
  onCreateProject: () => void
  onSelectProject: (id: number) => void
}

export default function Projects({ token, onCreateProject, onSelectProject }: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    apiFetch<Project[]>('/api/projects')
      .then(data => setProjects(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

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

      {/* Estados visuais: carregando, erro, vazio, lista */}
      {loading && <p className="text-gray-500 text-center mt-12">Carregando projetos...</p>}
      {error && <p className="text-red-500 text-center mt-12">{error}</p>}
      {!loading && !error && projects.length === 0 && (
        <p className="text-gray-500 text-center mt-12">
          Nenhum projeto ainda. Crie o primeiro!
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => (
          <div key={project.id} onClick={() => onSelectProject(project.id)}
            className="bg-white p-5 rounded-lg shadow hover:shadow-md cursor-pointer border border-gray-200 transition-shadow">
            <div className="flex justify-between items-start mb-2">
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
        ))}
      </div>
    </div>
  )
}
