// Componentes de skeleton - shimmer animado em vez de "Carregando..." textual.
// animate-pulse do Tailwind faz fade in/out automaticamente.

// Card skeleton - usado em listas (Backlog, Sprints, Projects)
export function SkeletonCard() {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-12 bg-gray-200 rounded"></div>
        <div className="h-4 w-8 bg-gray-200 rounded"></div>
      </div>
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2"></div>
      <div className="h-3 w-1/2 bg-gray-100 rounded"></div>
    </div>
  )
}

// Renderiza N cards skeleton em sequência - reutilizável
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </div>
  )
}

// Grid de skeletons - usado na lista de projetos
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-lg shadow border border-gray-200 animate-pulse">
          <div className="flex justify-between mb-3">
            <div className="h-5 w-1/2 bg-gray-200 rounded"></div>
            <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
          </div>
          <div className="h-3 w-3/4 bg-gray-100 rounded mb-2"></div>
          <div className="h-3 w-1/3 bg-gray-100 rounded"></div>
        </div>
      ))}
    </div>
  )
}
