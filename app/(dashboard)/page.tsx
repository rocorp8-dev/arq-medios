import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Folder, CheckSquare, CheckCircle, TrendingUp } from 'lucide-react'
import DashboardChart from '@/components/DashboardChart'

async function getKPIs(userId: string) {
  const supabase = await createClient()

  const today = new Date().toISOString().split('T')[0]

  const [projectsRes, tasksTodayRes, completedRes, allTasksRes] = await Promise.all([
    supabase.from('projects').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', `${today}T00:00:00`).lte('created_at', `${today}T23:59:59`),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'done'),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const total = allTasksRes.count ?? 0
  const completed = completedRes.count ?? 0
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    totalProjects: projectsRes.count ?? 0,
    tasksHoy: tasksTodayRes.count ?? 0,
    completados: completed,
    tasaExito: successRate,
  }
}

async function getChartData(userId: string) {
  const supabase = await createClient()
  const days: { dia: string; total: number }[] = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const { count } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${dateStr}T00:00:00`)
      .lte('created_at', `${dateStr}T23:59:59`)
    days.push({
      dia: format(d, 'EEE', { locale: es }),
      total: count ?? 0,
    })
  }
  return days
}

async function getRecentTasks(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('id, title, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)
  return data ?? []
}

const statusBadge: Record<string, string> = {
  todo: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-blue-100 text-blue-800',
  review: 'bg-purple-100 text-purple-800',
  done: 'bg-emerald-100 text-emerald-800',
}

const statusLabel: Record<string, string> = {
  todo: 'Pendiente',
  in_progress: 'En progreso',
  review: 'Revisión',
  done: 'Completado',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [kpis, chartData, recentTasks] = await Promise.all([
    getKPIs(user.id),
    getChartData(user.id),
    getRecentTasks(user.id),
  ])

  const kpiCards = [
    { label: 'Total Projects', value: kpis.totalProjects, Icon: Folder, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Tasks Hoy', value: kpis.tasksHoy, Icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completados', value: kpis.completados, Icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Tasa Éxito', value: `${kpis.tasaExito}%`, Icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Resumen general de Arq Medios</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-600">{label}</span>
              <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-6">Actividad últimos 7 días</h2>
        <DashboardChart data={chartData} />
      </div>

      {/* Recent tasks */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Últimas Tasks</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {recentTasks.length === 0 ? (
            <p className="px-6 py-8 text-center text-slate-500 text-sm">No hay tasks aún</p>
          ) : (
            recentTasks.map((task) => {
              const createdAt = format(new Date(task.created_at), 'dd MMM yyyy', { locale: es })
              return (
                <div key={task.id} className="px-6 py-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-800">{task.title}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[task.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel[task.status] ?? task.status}
                    </span>
                    <span className="text-xs text-slate-500">{createdAt}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
