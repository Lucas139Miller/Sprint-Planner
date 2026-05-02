import { useEffect, useState } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid,
} from 'recharts'
import { apiFetch, ApiError } from '../api'

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
  embedded?: boolean
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  to_do: { label: 'A fazer', color: '#94a3b8' },
  in_progress: { label: 'Em andamento', color: '#3b82f6' },
  in_review: { label: 'Em revisão', color: '#f59e0b' },
  done: { label: 'Concluído', color: '#22c55e' },
}

export default function Dashboard({ sprintId, onBack, embedded }: DashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true); setError('')
    apiFetch<DashboardData>(`/api/sprints/${sprintId}/dashboard`)
      .then(d => setData(d))
      .catch(err => setError(err instanceof ApiError ? err.message : 'Erro ao carregar dashboard'))
      .finally(() => setLoading(false))
  }, [sprintId])

  if (loading) return <div className="p-8 text-gray-500">Carregando dashboard...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!data) return null

  const chartData = Object.entries(data.byStatus).map(([k, v]) => ({
    name: STATUS_META[k]?.label || k, value: v, color: STATUS_META[k]?.color || '#999',
  }))
  const pieData = chartData.filter(d => d.value > 0)

  // Burndown simplificado: ideal vs restante
  const remaining = data.totalPoints - data.completedPoints
  const burndownData = [
    { day: 'Início', ideal: data.totalPoints, restante: data.totalPoints },
    { day: 'Hoje', ideal: data.totalPoints / 2, restante: remaining },
    { day: 'Fim', ideal: 0, restante: null },
  ]

  return (
    <div className={embedded ? 'p-6' : 'p-6 max-w-6xl mx-auto'}>
      {!embedded && (
        <button onClick={onBack} className="text-blue-600 hover:underline mb-4">← Voltar</button>
      )}

      {!embedded && (
        <h2 className="text-xl font-bold text-gray-800 mb-4">Dashboard do Sprint #{sprintId}</h2>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Pontos Totais" value={data.totalPoints} color="bg-blue-600" />
        <StatCard label="Concluídos" value={data.completedPoints} color="bg-green-600" />
        <StatCard label="Progresso" value={`${data.progress}%`} color="bg-purple-600" />
        <StatCard label="Histórias" value={data.storiesCount} color="bg-amber-600" />
      </div>

      {data.totalPoints === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow border border-gray-200 text-center">
          <p className="text-gray-500">Sprint sem histórias atribuídas ainda.</p>
          <p className="text-sm text-gray-400 mt-2">Vá ao Backlog e mova histórias para este sprint.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <ChartCard title="Histórias por Status">
              {pieData.length === 0 ? <Empty /> : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Contagem por Status">
              <ResponsiveContainer width="100%" height={240}>
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

          <ChartCard title="Burndown">
            <p className="text-xs text-gray-500 mb-2">Linha ideal vs pontos restantes hoje.</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={burndownData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
                <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5" name="Ideal" />
                <Line type="monotone" dataKey="restante" stroke="#3b82f6" strokeWidth={2} name="Restante" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className={`${color} text-white p-3 rounded-lg shadow`}>
      <div className="text-xs uppercase opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <h3 className="font-semibold text-gray-700 mb-3 text-sm">{title}</h3>
      {children}
    </div>
  )
}

function Empty() {
  return <div className="h-[240px] flex items-center justify-center text-gray-400">Sem dados ainda</div>
}
