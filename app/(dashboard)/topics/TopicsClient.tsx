'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Search, Pencil, Trash2, X, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Topic } from '@/types/database'

const statusBadge: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-300',
  ready: 'bg-blue-900/50 text-blue-400',
  used: 'bg-emerald-900/50 text-emerald-400',
}
const statusLabel: Record<string, string> = {
  draft: 'Borrador',
  ready: 'Listo',
  used: 'Usado',
}

interface Props { initialTopics: Topic[]; userId: string }
const emptyForm = { title: '', description: '', status: 'draft', category: '' }

export default function TopicsClient({ initialTopics, userId }: Props) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showGenerate, setShowGenerate] = useState<Topic | null>(null)
  const [editing, setEditing] = useState<Topic | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const filtered = topics.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))

  function openCreate() { setEditing(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(t: Topic) {
    setEditing(t)
    setForm({ title: t.title, description: t.description ?? '', status: t.status, category: t.category ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    setLoading(true)
    if (editing) {
      const { data } = await supabase.from('topics').update({
        title: form.title, description: form.description || null, status: form.status, category: form.category || null
      }).eq('id', editing.id).select().single()
      if (data) setTopics(ts => ts.map(t => t.id === editing.id ? data : t))
    } else {
      const { data } = await supabase.from('topics').insert({
        user_id: userId, title: form.title, description: form.description || null, status: form.status, category: form.category || null
      }).select().single()
      if (data) setTopics(ts => [data, ...ts])
    }
    setLoading(false); setShowModal(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este topic?')) return
    await supabase.from('topics').delete().eq('id', id)
    setTopics(ts => ts.filter(t => t.id !== id))
  }

  async function handleGenerate(topic: Topic, type: 'carousel' | 'reel') {
    setGenerating(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id, topicTitle: topic.title, topicDescription: topic.description, type }),
      })
      const data = await res.json()
      if (data.id) {
        await supabase.from('topics').update({ status: 'used' }).eq('id', topic.id)
        setTopics(ts => ts.map(t => t.id === topic.id ? { ...t, status: 'used' as const } : t))
        setShowGenerate(null)
        router.push(`/content/${data.id}`)
      }
    } catch {
      alert('Error generando contenido.')
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Topics</h1>
          <p className="text-slate-500 text-sm mt-1">{topics.length} ideas de contenido</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-indigo-700 transition">
          <Plus size={16} /> Nuevo Topic
        </button>
      </div>

      <div className="bg-[#111]/80 backdrop-blur-md rounded-xl border border-[#2a2a2a]">
        <div className="p-4 border-b border-[#2a2a2a]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Buscar topics..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#0a0a0a] border border-[#333] rounded-lg text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-6 py-3 font-medium text-slate-500">Título</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Categoría</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Estado</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Creado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay topics</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="hover:bg-[#1a1a1a] transition">
                  <td className="px-6 py-4 font-medium text-slate-200">{t.title}</td>
                  <td className="px-6 py-4 text-slate-400">{t.category || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[t.status]}`}>{statusLabel[t.status]}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(t.created_at), 'dd MMM yyyy', { locale: es })}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setShowGenerate(t)} className="p-1.5 text-slate-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition" title="Generar contenido">
                        <Sparkles size={15} />
                      </button>
                      <button onClick={() => openEdit(t)} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
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

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-100">{editing ? 'Editar topic' : 'Nuevo topic'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Título *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: 5 errores en Instagram que te cuestan seguidores"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                  placeholder="Contexto adicional para la generación de contenido..."
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Categoría</label>
                <input type="text" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  placeholder="Ej: Marketing Digital, Redes Sociales"
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Estado</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                  <option value="draft">Borrador</option>
                  <option value="ready">Listo</option>
                  <option value="used">Usado</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-[#1a1a1a] border border-[#333] rounded-lg hover:bg-[#222] transition">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.title}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showGenerate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] rounded-xl border border-[#2a2a2a] p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-100">Generar Contenido</h2>
              <button onClick={() => setShowGenerate(null)} className="text-slate-500 hover:text-slate-300"><X size={20} /></button>
            </div>
            <p className="text-sm text-slate-400 mb-1">Topic:</p>
            <p className="text-sm font-medium text-slate-200 mb-6">{showGenerate.title}</p>
            <div className="space-y-3">
              <button onClick={() => handleGenerate(showGenerate, 'carousel')} disabled={generating}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[#2a2a2a] hover:border-purple-500/30 hover:bg-purple-500/5 transition disabled:opacity-50">
                <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-purple-400 text-lg">📱</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-200">Carrusel Viral</p>
                  <p className="text-xs text-slate-500">10 slides con estructura probada</p>
                </div>
              </button>
              <button onClick={() => handleGenerate(showGenerate, 'reel')} disabled={generating}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[#2a2a2a] hover:border-pink-500/30 hover:bg-pink-500/5 transition disabled:opacity-50">
                <div className="w-10 h-10 bg-pink-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-pink-400 text-lg">🎬</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-200">Guion de Reel</p>
                  <p className="text-xs text-slate-500">Estructura "El Problema Invisible"</p>
                </div>
              </button>
            </div>
            {generating && (
              <p className="text-center text-sm text-indigo-400 mt-4 animate-pulse">Generando con Groq AI...</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
