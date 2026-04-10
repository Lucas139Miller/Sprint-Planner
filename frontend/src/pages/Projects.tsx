import { useState, useEffect } from 'react'

// Tipo que representa um projeto retornado pela API
interface Project {
  id: number
  name: string
  description: string
  role: string
  created_at: string
}

interface ProjectsProps {
  token: string
  onCreateProject: () => void                // Navega para tela de criar projeto
  onSelectProject: (id: number) => void      // Navega para detalhes do projeto
}

export default function Projects({ token, onCreateProject, onSelectProject }: ProjectsProps) {
  const [projects, setProjects] = useState<Project[]>([])

  // Busca os projetos do usuário ao carregar o componente
  useEffect(() => {
    fetch('http://localhost:3001/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setProjects(data))
  }, [token])

  // Cores diferentes para cada papel Scrum
  const roleColors: Record<string, string> = {
    'PO': 'bg-purple-100 text-purple-700',
    'Scrum Master': 'bg-green-100 text-green-700',
    'Dev': 'bg-blue-100 text-blue-700',
  }

  return (
    <div className="p-8">
      {/* Cabeçalho com botão de criar projeto */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Meus Projetos</h2>
        <button onClick={onCreateProject}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          + Novo Projeto
        </button>
      </div>

      {/* Estado vazio: nenhum projeto ainda */}
      {projects.length === 0 && (
        <p className="text-gray-500 text-center mt-12">
          Nenhum projeto ainda. Crie o primeiro!
        </p>
      )}

      {/* Grid de cards de projetos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map(project => (
          <div key={project.id} onClick={() => onSelectProject(project.id)}
            className="bg-white p-5 rounded-lg shadow hover:shadow-md cursor-pointer border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-800">{project.name}</h3>
              {/* Badge com o papel do usuário neste projeto */}
              <span className={`text-xs px-2 py-1 rounded-full ${roleColors[project.role] || ''}`}>
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
