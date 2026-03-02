'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Save, CheckCircle, Webhook } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { WebhookConfig, WebhookLog } from '@/types/database'

const statusBadge: Record<string, string> = {
  sent: 'bg-blue-900/50 text-blue-400',
  failed: 'bg-red-900/50 text-red-400',
  delivered: 'bg-emerald-900/50 text-emerald-400',
}

interface LogWithContent extends WebhookLog {
  content?: { title: string; type: string } | null
}

interface Props {
  config: WebhookConfig | null
  logs: LogWithContent[]
  userId: string
}

export default function WebhooksClient({ config: initialConfig, logs, userId }: Props) {
  const [webhookUrl, setWebhookUrl] = useState(initialConfig?.make_webhook_url ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    setSaving(true)
    if (initialConfig) {
      await supabase.from('webhook_config').update({
        make_webhook_url: webhookUrl || null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId)
    } else {
      await supabase.from('webhook_config').insert({
        user_id: userId,
        make_webhook_url: webhookUrl || null,
      })
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Webhooks</h1>
        <p className="text-slate-500 text-sm mt-1">Conecta con Make.com para publicación automática</p>
      </div>

      <div className="bg-[#111]/80 backdrop-blur-md rounded-xl border border-[#2a2a2a] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
            <Webhook size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-200">Make.com Webhook URL</h2>
            <p className="text-xs text-slate-500">Pega la URL del webhook de tu escenario en Make.com</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="url"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            placeholder="https://hook.eu2.make.com/..."
            className="flex-1 bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50">
            {saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar'}
          </button>
        </div>
        <div className="mt-4 p-3 bg-[#0a0a0a] border border-[#222] rounded-lg">
          <p className="text-xs text-slate-500">
            <strong className="text-slate-400">Cómo configurar:</strong> En Make.com, crea un escenario con un módulo &quot;Webhook&quot; como trigger.
            Copia la URL generada y pégala aquí. Cuando envíes contenido desde la app, Make.com lo recibirá y podrá
            publicarlo en Instagram, Facebook o LinkedIn automáticamente.
          </p>
        </div>
      </div>

      <div className="bg-[#111]/80 backdrop-blur-md rounded-xl border border-[#2a2a2a]">
        <div className="px-6 py-4 border-b border-[#2a2a2a]">
          <h2 className="text-base font-semibold text-slate-200">Historial de envíos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a]">
                <th className="text-left px-6 py-3 font-medium text-slate-500">Contenido</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Estado</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">Enviado</th>
                <th className="text-left px-6 py-3 font-medium text-slate-500">URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]">
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-500">No hay envíos aún</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-[#1a1a1a] transition">
                  <td className="px-6 py-4 font-medium text-slate-200">{log.content?.title ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusBadge[log.status]}`}>{log.status}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{format(new Date(log.sent_at), 'dd MMM yyyy HH:mm', { locale: es })}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-600 truncate max-w-[200px] inline-block">{log.webhook_url}</span>
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
