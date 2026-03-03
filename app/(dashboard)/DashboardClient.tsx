'use client'

import { Lightbulb, FileText, CheckCircle2, Megaphone, Layers, Video, Sparkles } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const DashboardChart = dynamic(() => import('@/components/DashboardChart'), {
  ssr: false,
  loading: () => <div className="h-48 bg-[#0a0a0a] rounded-lg animate-pulse" />,
})

interface ContentItem {
  id: string
  type: string
  status: string
  title: string
  created_at: string
}

interface Props {
  totalTopics: number
  pendingTopics: number
  totalContent: number
  publishedContent: number
  activeCampaigns: number
  totalSpent: number
  chartData: { dia: string; total: number }[]
  recentContent: ContentItem[]
}

const statusBadge: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  review: 'bg-amber-900/50 text-amber-400',
  approved: 'bg-blue-900/50 text-blue-400',
  published: 'bg-emerald-900/50 text-emerald-400',
}
const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  review: 'Revisión',
  approved: 'Aprobado',
  published: 'Publicado',
}

export default function DashboardClient({
  totalTopics, pendingTopics, totalContent, publishedContent, activeCampaigns, totalSpent, chartData, recentContent
}: Props) {
  const publishRate = totalContent > 0 ? Math.round((publishedContent / totalContent) * 100) : 0

  const kpis = [
    { label: 'Topics Pendientes', value: pendingTopics, sub: `de ${totalTopics} total`, icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Content Total', value: totalContent, sub: 'piezas en total', icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20' },
    { label: 'AI Credits', value: `$${totalSpent.toFixed(2)}`, sub: 'invertido en modelos', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    { label: 'Campañas Activas', value: activeCampaigns, sub: 'en ejecución', icon: Megaphone, color: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10 border-fuchsia-500/20' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight">
          Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-1">Resumen de tu plataforma de contenido viral</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className={`rounded-xl border p-5 ${kpi.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <Icon size={20} className={kpi.color} />
              </div>
              <p className="text-3xl font-bold text-white">{kpi.value}</p>
              <p className="text-sm font-medium text-slate-300 mt-1">{kpi.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{kpi.sub}</p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111]/80 backdrop-blur-md border border-[#2a2a2a] rounded-xl p-6">
          <h2 className="text-base font-semibold text-slate-200 mb-4">Content generado (últimos 7 días)</h2>
          <DashboardChart data={chartData} />
        </div>

        <div className="bg-[#111]/80 backdrop-blur-md border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-200">Contenido reciente</h2>
            <Link href="/content" className="text-xs text-indigo-400 hover:text-indigo-300 transition">Ver todo</Link>
          </div>
          <div className="space-y-3">
            {recentContent.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No hay contenido aún. <Link href="/topics" className="text-indigo-400 hover:underline">Crea un topic</Link></p>
            ) : recentContent.map(c => (
              <Link key={c.id} href={`/content/${c.id}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-[#1a1a1a] transition group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${c.type === 'carousel' ? 'bg-purple-500/10' : 'bg-pink-500/10'}`}>
                  {c.type === 'carousel' ? <Layers size={16} className="text-purple-400" /> : <Video size={16} className="text-pink-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition">{c.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 uppercase">{c.type === 'carousel' ? 'Carrusel' : 'Reel'}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
