'use client'

import { useState } from 'react'
import {
    Zap,
    Plus,
    MoreVertical,
    Play,
    Pause,
    Download,
    Copy,
    Trash2,
    ExternalLink,
    Instagram,
    Facebook,
    Linkedin,
    Clock,
    Database,
    Webhook as WebhookIcon,
    Rss
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import clsx from 'clsx'

interface Scenario {
    id: string
    name: string
    is_active: boolean
    trigger_type: 'schedule' | 'sheets' | 'webhook' | 'rss'
    schedule_info: string
    channels: string[]
    webhook_url: string
    blueprint_url?: string
    created_at: string
}

interface Props {
    initialScenarios: Scenario[]
    userId: string
}

const triggerIcons = {
    schedule: Clock,
    sheets: Database,
    webhook: WebhookIcon,
    rss: Rss
}

const channelIcons = {
    instagram: Instagram,
    facebook: Facebook,
    linkedin: Linkedin
}

export default function AutomationsClient({ initialScenarios, userId }: Props) {
    const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)

    // New Scenario Form State
    const [newName, setNewName] = useState('')
    const [triggerType, setTriggerType] = useState<'schedule' | 'sheets' | 'webhook' | 'rss'>('schedule')
    const [scheduleInfo, setScheduleInfo] = useState('Todos los días a las 10:00 AM')
    const [selectedChannels, setSelectedChannels] = useState<string[]>(['instagram'])

    const supabase = createClient()

    async function toggleStatus(id: string, currentStatus: boolean) {
        const { error } = await supabase
            .from('scenarios')
            .update({ is_active: !currentStatus })
            .eq('id', id)

        if (!error) {
            setScenarios(scenarios.map(s => s.id === id ? { ...s, is_active: !currentStatus } : s))
        }
    }

    async function handleCreateScenario() {
        if (!newName.trim()) return

        setSaving(true)
        try {
            const { data, error } = await supabase
                .from('scenarios')
                .insert({
                    user_id: userId,
                    name: newName,
                    trigger_type: triggerType,
                    schedule_info: scheduleInfo,
                    channels: selectedChannels,
                    is_active: true,
                    webhook_url: triggerType === 'webhook' ? `https://hook.make.com/${Math.random().toString(36).substring(7)}` : null
                })
                .select()
                .single()

            if (error) throw error

            if (data) {
                setScenarios([data, ...scenarios])
                setIsModalOpen(false)
                // Reset form
                setNewName('')
                setTriggerType('schedule')
                setScheduleInfo('Todos los días a las 10:00 AM')
                setSelectedChannels(['instagram'])
            }
        } catch (err: any) {
            console.error('Error creating scenario:', err)
            alert(`Error: ${err.message || 'No se pudo crear el escenario. ¿Ya ejecutaste el script SQL en Supabase?'}`)
        } finally {
            setSaving(false)
        }
    }

    const toggleChannel = (channel: string) => {
        setSelectedChannels(prev =>
            prev.includes(channel)
                ? prev.filter(c => c !== channel)
                : [...prev, channel]
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        Escenarios Configurados
                        <span className="text-xs font-normal bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">
                            {scenarios.length} escenarios
                        </span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Gestiona tus automatizaciones de contenido viral</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                    <Plus size={18} />
                    Crear Escenario
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {scenarios.map((scenario) => {
                    const TriggerIcon = triggerIcons[scenario.trigger_type] || Zap

                    return (
                        <div key={scenario.id} className="bg-[#111111]/80 backdrop-blur-xl border border-[#222] rounded-2xl overflow-hidden group hover:border-[#333] transition-all">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                            scenario.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"
                                        )}>
                                            <Zap size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-3">
                                                {scenario.name}
                                                <span className={clsx(
                                                    "flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border",
                                                    scenario.is_active
                                                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                )}>
                                                    <span className={clsx("w-1 h-1 rounded-full", scenario.is_active ? "bg-emerald-400" : "bg-amber-500")} />
                                                    {scenario.is_active ? 'Activo' : 'Pausado'}
                                                </span>
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1 text-slate-500 text-xs">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> {scenario.schedule_info}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {scenario.channels.map(ch => {
                                                        const Icon = channelIcons[ch as keyof typeof channelIcons] || Instagram
                                                        return <Icon key={ch} size={14} className="text-slate-400" />
                                                    })}
                                                </div>
                                                <span className="text-slate-600">Última: {format(new Date(scenario.created_at), 'dd/MM/yyyy', { locale: es })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50 rounded-xl transition-colors" title="Exportar Make.com">
                                            <Download size={18} />
                                        </button>
                                        <button className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800/50 rounded-xl transition-colors" title="Copiar JSON">
                                            <Copy size={18} />
                                        </button>
                                        <button
                                            onClick={() => toggleStatus(scenario.id, scenario.is_active)}
                                            className={clsx(
                                                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all",
                                                scenario.is_active
                                                    ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20"
                                                    : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20"
                                            )}
                                        >
                                            {scenario.is_active ? <Pause size={16} /> : <Play size={16} />}
                                            {scenario.is_active ? 'Pausar' : 'Reanudar'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-[#0a0a0a]/50 p-4 rounded-xl border border-[#222] group/card hover:border-indigo-500/30 transition-colors">
                                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                            <TriggerIcon size={16} />
                                            <span className="text-[10px] uppercase tracking-widest font-bold">Trigger</span>
                                        </div>
                                        <p className="text-sm text-slate-300 font-medium">{scenario.trigger_type === 'schedule' ? `Programado: ${scenario.schedule_info}` : 'Disparador externo'}</p>
                                    </div>
                                    <div className="bg-[#0a0a0a]/50 p-4 rounded-xl border border-[#222] group/card hover:border-fuchsia-500/30 transition-colors">
                                        <div className="flex items-center gap-2 text-fuchsia-400 mb-2">
                                            <Zap size={16} />
                                            <span className="text-[10px] uppercase tracking-widest font-bold">Procesamiento</span>
                                        </div>
                                        <p className="text-sm text-slate-300 font-medium">IA Multi-Modal → Generación Viral</p>
                                    </div>
                                    <div className="bg-[#0a0a0a]/50 p-4 rounded-xl border border-[#222] group/card hover:border-amber-500/30 transition-colors">
                                        <div className="flex items-center gap-2 text-amber-500 mb-2">
                                            <ExternalLink size={16} />
                                            <span className="text-[10px] uppercase tracking-widest font-bold">Router</span>
                                        </div>
                                        <p className="text-sm text-slate-300 font-medium">{scenario.channels.length} canales: {scenario.channels.join(', ')}</p>
                                    </div>
                                </div>

                                {scenario.webhook_url && (
                                    <div className="mt-6 flex items-center gap-3 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10">
                                        <WebhookIcon size={18} className="text-indigo-400" />
                                        <div className="flex-1 min-w-0">
                                            <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 block mb-0.5">Webhook URL</span>
                                            <p className="text-xs text-slate-400 truncate font-mono">{scenario.webhook_url}</p>
                                        </div>
                                        <button className="p-2 text-slate-400 hover:text-white transition-colors">
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}

                {scenarios.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-[#222] rounded-3xl">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Zap size={32} className="text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-100">Sin escenarios configurados</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Comienza creando tu primera automatización para publicar contenido viral automáticamente.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#111111] border border-[#222] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-[#222]">
                            <div className="flex items-center gap-3 text-indigo-400 mb-2">
                                <Zap size={20} />
                                <span className="text-xs font-bold uppercase tracking-widest">Configuración</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-100">Crear Nuevo Escenario</h2>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="text-sm font-medium text-slate-400 block mb-2">Nombre del escenario</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Ej: Publicación diaria Instagram + Facebook"
                                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-400 block mb-3">Tipo de Disparador (Trigger)</label>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { id: 'schedule', label: 'Fecha Programada', icon: Clock, desc: 'Por horario' },
                                        { id: 'sheets', label: 'Google Sheets', icon: Database, desc: 'Nueva fila' },
                                        { id: 'webhook', label: 'Webhook', icon: WebhookIcon, desc: 'URL externa' },
                                        { id: 'rss', label: 'RSS Feed', icon: Rss, desc: 'Nuevo artículo' },
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            type="button"
                                            onClick={() => setTriggerType(type.id as any)}
                                            className={clsx(
                                                "flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all text-center",
                                                triggerType === type.id
                                                    ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 font-bold"
                                                    : "bg-[#0a0a0a] border-[#222] text-slate-500 hover:border-[#333]"
                                            )}
                                        >
                                            <type.icon size={20} />
                                            <div>
                                                <p className="text-xs font-bold">{type.label}</p>
                                                <p className="text-[10px] opacity-60 mt-0.5">{type.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-400 block mb-2">Programación</label>
                                <input
                                    type="text"
                                    value={scheduleInfo}
                                    onChange={(e) => setScheduleInfo(e.target.value)}
                                    placeholder="Todos los días a las 10:00 AM"
                                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-400 block mb-3">Canales de Distribución</label>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        { id: 'instagram', label: 'Instagram', icon: Instagram },
                                        { id: 'facebook', label: 'Facebook', icon: Facebook },
                                        { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
                                    ].map((ch) => (
                                        <button
                                            key={ch.id}
                                            type="button"
                                            onClick={() => toggleChannel(ch.id)}
                                            className={clsx(
                                                "flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all font-medium text-sm",
                                                selectedChannels.includes(ch.id)
                                                    ? "bg-indigo-500/10 border-indigo-500/50 text-indigo-400 font-bold shadow-sm"
                                                    : "bg-[#0a0a0a] border-[#222] text-slate-500 hover:border-[#333]"
                                            )}
                                        >
                                            <ch.icon size={18} />
                                            {ch.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-[#0a0a0a]/50 flex items-center justify-end gap-3 border-t border-[#222]">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                disabled={saving}
                                className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateScenario}
                                disabled={saving || !newName.trim()}
                                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                            >
                                {saving ? 'Creando...' : 'Crear Escenario'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
