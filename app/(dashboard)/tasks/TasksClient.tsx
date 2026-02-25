'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Task } from '@/types/database'

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
const priorityBadge: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
}

interface Props { initialTasks: Task[]; userId: string }
const emptyForm = { title: '', description: '', status: 'todo', priority: 'medium', notes: '' }

export default function TasksClient({ initialTasks, userId }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const filtered = tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()))

  function openCreate() { setEditing(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(t: Task) {
    setEditing(t)
    setForm({ title: t.title, description: t.description ?? '', status: t.status, priority: t.priority, notes: t.notes ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    setLoading(true)
    if (editing) {
      const { data } = await supabase.from('tasks').update({ title: form.title, description: form.description || null, status: form.status, priority: form.priority, notes: form.notes || null }).eq('id', editing.id).select().single()
      if (data) setTasks(ts => ts.map(t => t.id === editing.id ? data : t))
    } else {
      const { data } = await supabase.from('tasks').insert({ user_id: userId, title: form.title, description: form.description || null, status: form.status, priority: form.priority, notes: form.notes || null }).select().single()
      if (data) setTasks(ts => [data, ...ts])
    }
    setLoading(false); setShowModal(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta task?')) return
    await supabase.from('tasks').delete().eq('id', id)
    setTasks(ts => ts.filter(t => t.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500 text-sm mt-1">{tasks.length} tareas en total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-blue-700 transition">
          <Plus size={16} /> Nueva
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Buscar por nombre..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-6 py-3 font-medium text-slate-500">Nombre</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Estado</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Prioridad</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Creado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay tareas</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{t.title}</td>
                  <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[t.status]}`}>{statusLabel[t.status]}</span></td>
                  <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full font-medium ${priorityBadge[t.priority]}`}>{t.priority}</span></td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(t.created_at), 'dd MMM yyyy', { locale: es })}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Editar task' : 'Nueva task'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Título *</label>
                <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option value="todo">Pendiente</option>
                    <option value="in_progress">En progreso</option>
                    <option value="review">Revisión</option>
                    <option value="done">Completado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Prioridad</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.title} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
