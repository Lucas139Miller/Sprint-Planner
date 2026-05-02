import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid,
} from 'recharts'

// Tipo da resposta de GET /api/sprints/:id/dashboard
// (mantemos sincronizado com routes/dashboard.js)
interface DashboardData {
  totalPoints: number
  completedPoints: number
  progress: number
  byStatus: { to_do: number; in_progress: number; in_review: number; done: number }
  storiesCount: number
}

interface DashboardProps {
  token: string
  projectId: number
  sprintId: number
  onBack: () => void
}

// Mapeamento de status -> label legível e cor (Tailwind palette)
// Usado tanto no card quanto nos dois gráficos para manter visual consistente.
const STATUS_META: Record<string, { label: string; color: string }> = {
  to_do: { label: 'To Do', color: '#94a3b8' },        // slate-400
  in_progress: { label: 'In Progress', color: '#3b82f6' }, // blue-500
  in_review: { label: 'In Review', color: '#f59e0b' },     // amber-500
  done: { label: 'Done', color: '#22c55e' },               // green-500
}

export default function Dashboard({ token, projectId, sprintId, onBack }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Busca métricas do sprint ao montar / quando sprintId muda
  useEffect(() => {
    setLoading(true)
    fetch(`http://localhost:3001/api/sprints/${sprintId}/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sprintId, token, projectId])

  if (loading || !data) {
    return <div className="p-8 text-gray-500">Carregando dashboard...</div>
  }

  // Dados dos gráficos derivados de byStatus (filtra zeros pra não poluir o pie)
  const chartData = Object.entries(data.byStatus).map(([k, v]) => ({
    name: STATUS_META[k].label, value: v, color: STATUS_META[k].color,
  }))
  const pieData = chartData.filter(d => d.value > 0)

  // Burndown simplificado: linha ideal (todos os pontos -> 0) vs ponto atual.
  // Sem histórico diário, mostramos só "início = total" e "agora = restante".
  const remaining = data.totalPoints - data.completedPoints
  const burndownData = [
    { day: 'Início', ideal: data.totalPoints, restante: data.totalPoints },
    { day: 'Hoje', ideal: data.totalPoints / 2, restante: remaining },
    { day: 'Fim', ideal: 0, restante: null },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button onClick={onBack} className="text-blue-600 hover:underline mb-4">← Voltar</button>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard do Sprint #{sprintId}</h2>

      {/* Cards de métricas no topo - resumo rápido sem precisar olhar gráficos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Points" value={data.totalPoints} color="bg-blue-600" />
        <StatCard label="Completed" value={data.completedPoints} color="bg-green-600" />
        <StatCard label="Progress" value={`${data.progress}%`} color="bg-purple-600" />
        <StatCard label="Stories" value={data.storiesCount} color="bg-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* PIE: distribuição de histórias por status */}
        <ChartCard title="Histórias por Status">
          {pieData.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* BAR: contagem absoluta - facilita comparar status */}
        <ChartCard title="Contagem por Status">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
              <Bar dataKey="value">
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* LINE: burndown simplificado (sem histórico diário ainda) */}
      <ChartCard title="Burndown (simplificado)">
        <p className="text-xs text-gray-500 mb-2">Linha ideal vs pontos restantes hoje. Histórico diário virá em iterações futuras.</p>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={burndownData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
            <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5" name="Ideal" />
            <Line type="monotone" dataKey="restante" stroke="#3b82f6" strokeWidth={2} name="Restante" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}

// Sub-componente: card de métrica - extraído pra evitar repetição de classes Tailwind
function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`${color} text-white p-4 rounded-lg shadow`}>
      <div className="text-xs uppercase opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  )
}

// Sub-componente: wrapper de gráfico - title + box branco padronizado
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  )
}

// Estado vazio do pie quando não há histórias com pontos > 0
function Empty() {
  return <div className="h-[260px] flex items-center justify-center text-gray-400">Sem dados ainda</div>
}
