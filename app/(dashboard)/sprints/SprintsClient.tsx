'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Sprint } from '@/types/database'

const statusBadge: Record<string, string> = {
  planning: 'bg-purple-100 text-purple-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-emerald-100 text-emerald-800',
  on_hold: 'bg-amber-100 text-amber-800',
}
const statusLabel: Record<string, string> = {
  planning: 'Planificación',
  active: 'Activo',
  completed: 'Completado',
  on_hold: 'En pausa',
}

interface Props { initialSprints: Sprint[]; userId: string }
const emptyForm = { name: '', description: '', status: 'active', start_date: '', end_date: '', notes: '' }

export default function SprintsClient({ initialSprints, userId }: Props) {
  const [sprints, setSprints] = useState<Sprint[]>(initialSprints)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Sprint | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const filtered = sprints.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  function openCreate() { setEditing(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(s: Sprint) {
    setEditing(s)
    setForm({ name: s.name, description: s.description ?? '', status: s.status, start_date: s.start_date ?? '', end_date: s.end_date ?? '', notes: s.notes ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    setLoading(true)
    if (editing) {
      const { data } = await supabase.from('sprints').update({ name: form.name, description: form.description || null, status: form.status, start_date: form.start_date || null, end_date: form.end_date || null, notes: form.notes || null }).eq('id', editing.id).select().single()
      if (data) setSprints(ss => ss.map(s => s.id === editing.id ? data : s))
    } else {
      const { data } = await supabase.from('sprints').insert({ user_id: userId, name: form.name, description: form.description || null, status: form.status, start_date: form.start_date || null, end_date: form.end_date || null, notes: form.notes || null }).select().single()
      if (data) setSprints(ss => [data, ...ss])
    }
    setLoading(false); setShowModal(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este sprint?')) return
    await supabase.from('sprints').delete().eq('id', id)
    setSprints(ss => ss.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sprints</h1>
          <p className="text-slate-500 text-sm mt-1">{sprints.length} sprints en total</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-blue-700 transition">
          <Plus size={16} /> Nuevo
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
                <th className="text-left px-6 py-3 font-medium text-slate-500">Creado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay sprints</td></tr>
              ) : filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                  <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[s.status]}`}>{statusLabel[s.status]}</span></td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(s.created_at), 'dd MMM yyyy', { locale: es })}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(s)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(s.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
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
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Editar sprint' : 'Nuevo sprint'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                  <option value="planning">Planificación</option>
                  <option value="active">Activo</option>
                  <option value="completed">Completado</option>
                  <option value="on_hold">En pausa</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.name} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
