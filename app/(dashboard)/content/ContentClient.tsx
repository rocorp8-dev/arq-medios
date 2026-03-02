'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search, Trash2, Eye } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Content } from '@/types/database'

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
const typeBadge: Record<string, string> = {
  carousel: 'bg-purple-900/50 text-purple-400',
  reel: 'bg-pink-900/50 text-pink-400',
}

interface Props { initialContent: Content[]; userId: string }

export default function ContentClient({ initialContent, userId }: Props) {
  const [content, setContent] = useState<Content[]>(initialContent)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const supabase = createClient()

  const filtered = content.filter(c => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase())
    const matchType = filterType === 'all' || c.type === filterType
    const matchStatus = filterStatus === 'all' || c.status === filterStatus
    return matchSearch && matchType && matchStatus
  })

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este contenido?')) return
    await supabase.from('content').delete().eq('id', id)
    setContent(cs => cs.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Content</h1>
        <p className="text-slate-500 text-sm mt-1">{content.length} piezas de contenido</p>
      </div>

      <div className="bg-[#111]/80 backdrop-blur-md rounded-xl border border-[#2a2a2a]">
        <div className="p-4 border-b border-[#2a2a2a] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Buscar contenido..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#0a0a0a] border border-[#333] rounded-lg text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="text-sm border border-[#333] rounded-lg px-3 py-2 bg-[#0a0a0a] text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="all">Todos los tipos</option>
            <option value="carousel">Carruseles</option>
            <option value="reel">Reels</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-[#333] rounded-lg px-3 py-2 bg-[#0a0a0a] text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="review">Revisión</option>
            <option value="approved">Aprobado</option>
            <option value="published">Publicado</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-6 py-3 font-medium text-slate-500">Tipo</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Título</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Estado</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Plataforma</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Creado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No hay contenido. <Link href="/topics" className="text-indigo-400 hover:underline">Genera desde un topic</Link>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-[#1a1a1a] transition">
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${typeBadge[c.type]}`}>
                      {c.type === 'carousel' ? 'Carrusel' : 'Reel'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-200">{c.title}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 capitalize">{c.platform === 'both' ? 'IG + FB' : c.platform}</td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(c.created_at), 'dd MMM yyyy', { locale: es })}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <Link href={`/content/${c.id}`} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition">
                        <Eye size={15} />
                      </Link>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
