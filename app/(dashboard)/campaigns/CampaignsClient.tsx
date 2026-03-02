'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Campaign } from '@/types/database'

const statusBadge: Record<string, string> = {
  active: 'bg-emerald-900/50 text-emerald-400',
  paused: 'bg-amber-900/50 text-amber-400',
  completed: 'bg-blue-900/50 text-blue-400',
}
const statusLabel: Record<string, string> = {
  active: 'Activa',
  paused: 'Pausada',
  completed: 'Completada',
}

interface Props { initialCampaigns: Campaign[]; userId: string }
const emptyForm = { name: '', description: '', status: 'active', start_date: '', end_date: '' }

export default function CampaignsClient({ initialCampaigns, userId }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Campaign | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const filtered = campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  function openCreate() { setEditing(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(c: Campaign) {
    setEditing(c)
    setForm({ name: c.name, description: c.description ?? '', status: c.status, start_date: c.start_date ?? '', end_date: c.end_date ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    setLoading(true)
    if (editing) {
      const { data } = await supabase.from('campaigns').update({
        name: form.name, description: form.description || null, status: form.status,
        start_date: form.start_date || null, end_date: form.end_date || null
      }).eq('id', editing.id).select().single()
      if (data) setCampaigns(cs => cs.map(c => c.id === editing.id ? data : c))
    } else {
      const { data } = await supabase.from('campaigns').insert({
        user_id: userId, name: form.name, description: form.description || null, status: form.status,
        start_date: form.start_date || null, end_date: form.end_date || null
      }).select().single()
      if (data) setCampaigns(cs => [data, ...cs])
    }
    setLoading(false); setShowModal(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta campaña?')) return
    await supabase.from('campaigns').delete().eq('id', id)
    setCampaigns(cs => cs.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Campaigns</h1>
          <p className="text-slate-500 text-sm mt-1">{campaigns.length} campañas</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 text-white rounded-lg px-4 py-2.5 font-medium text-sm hover:bg-indigo-700 transition">
          <Plus size={16} /> Nueva Campaña
        </button>
      </div>

      <div className="bg-[#111]/80 backdrop-blur-md rounded-xl border border-[#2a2a2a]">
        <div className="p-4 border-b border-[#2a2a2a]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Buscar campañas..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#0a0a0a] border border-[#333] rounded-lg text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-6 py-3 font-medium text-slate-500">Nombre</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Estado</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Periodo</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Creada</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay campañas</td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="hover:bg-[#1a1a1a] transition">
                  <td className="px-6 py-4 font-medium text-slate-200">{c.name}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[c.status]}`}>{statusLabel[c.status]}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-xs">
                    {c.start_date && c.end_date ? `${format(new Date(c.start_date), 'dd MMM', { locale: es })} - ${format(new Date(c.end_date), 'dd MMM yyyy', { locale: es })}` : '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(c.created_at), 'dd MMM yyyy', { locale: es })}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"><Trash2 size={15} /></button>
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
              <h2 className="text-lg font-bold text-slate-100">{editing ? 'Editar campaña' : 'Nueva campaña'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-slate-300"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Nombre *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Descripción</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Estado</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none">
                  <option value="active">Activa</option>
                  <option value="paused">Pausada</option>
                  <option value="completed">Completada</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Inicio</label>
                  <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Fin</label>
                  <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-[#1a1a1a] border border-[#333] rounded-lg hover:bg-[#222] transition">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.name}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
