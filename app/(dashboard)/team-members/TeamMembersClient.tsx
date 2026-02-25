'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { TeamMember } from '@/types/database'

interface Props { initialMembers: TeamMember[]; userId: string }
const emptyForm = { first_name: '', last_name: '', email: '', phone: '', notes: '' }

export default function TeamMembersClient({ initialMembers, userId }: Props) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const filtered = members.filter(m =>
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(search.toLowerCase())
  )

  function openCreate() { setEditing(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(m: TeamMember) {
    setEditing(m)
    setForm({ first_name: m.first_name, last_name: m.last_name, email: m.email ?? '', phone: m.phone ?? '', notes: m.notes ?? '' })
    setShowModal(true)
  }

  async function handleSave() {
    setLoading(true)
    if (editing) {
      const { data } = await supabase.from('team_members').update({ first_name: form.first_name, last_name: form.last_name, email: form.email || null, phone: form.phone || null, notes: form.notes || null }).eq('id', editing.id).select().single()
      if (data) setMembers(ms => ms.map(m => m.id === editing.id ? data : m))
    } else {
      const { data } = await supabase.from('team_members').insert({ user_id: userId, first_name: form.first_name, last_name: form.last_name, email: form.email || null, phone: form.phone || null, notes: form.notes || null }).select().single()
      if (data) setMembers(ms => [data, ...ms])
    }
    setLoading(false); setShowModal(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este miembro?')) return
    await supabase.from('team_members').delete().eq('id', id)
    setMembers(ms => ms.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team members</h1>
          <p className="text-slate-500 text-sm mt-1">{members.length} miembros en total</p>
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
                <th className="text-left px-6 py-3 font-medium text-slate-500">Email</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Teléfono</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Registrado</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No hay miembros</td></tr>
              ) : filtered.map(m => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-900">{m.first_name} {m.last_name}</td>
                  <td className="px-6 py-4 text-slate-600">{m.email ?? '-'}</td>
                  <td className="px-6 py-4 text-slate-600">{m.phone ?? '-'}</td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(m.created_at), 'dd MMM yyyy', { locale: es })}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(m)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(m.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
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
              <h2 className="text-lg font-bold text-slate-900">{editing ? 'Editar miembro' : 'Nuevo miembro'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre *</label>
                  <input type="text" value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Apellido *</label>
                  <input type="text" value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Teléfono</label>
                <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition">Cancelar</button>
              <button onClick={handleSave} disabled={loading || !form.first_name || !form.last_name} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
