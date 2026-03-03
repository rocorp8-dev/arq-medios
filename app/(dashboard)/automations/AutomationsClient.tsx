'use client'

import { useState } from 'react'
import {
    Zap,
    Plus,
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
    Rss,
    CheckCircle,
    AlertTriangle,
    Pencil,
    X,
    BookOpen
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

const channelModules: Record<string, { name: string; apiModule: string; description: string }> = {
    instagram: {
        name: 'Instagram Business',
        apiModule: 'Instagram Content Publishing API',
        description: 'Publica fotos, carruseles y reels en tu cuenta de Instagram Business'
    },
    facebook: {
        name: 'Facebook Pages',
        apiModule: 'Facebook Graph API - Page Posts',
        description: 'Publica posts con imágenes y texto en tu página de Facebook'
    },
    linkedin: {
        name: 'LinkedIn',
        apiModule: 'LinkedIn Marketing API',
        description: 'Publica artículos y posts en tu perfil o página de LinkedIn'
    }
}

export default function AutomationsClient({ initialScenarios, userId }: Props) {
    const [scenarios, setScenarios] = useState<Scenario[]>(initialScenarios)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
    const [editingWebhook, setEditingWebhook] = useState<string | null>(null)
    const [editWebhookUrl, setEditWebhookUrl] = useState('')
    const [savingWebhook, setSavingWebhook] = useState(false)
    const [guideScenario, setGuideScenario] = useState<Scenario | null>(null)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // New Scenario Form State
    const [newName, setNewName] = useState('')
    const [triggerType, setTriggerType] = useState<'schedule' | 'sheets' | 'webhook' | 'rss'>('webhook')
    const [scheduleInfo, setScheduleInfo] = useState('Todos los días a las 10:00 AM')
    const [selectedChannels, setSelectedChannels] = useState<string[]>(['instagram'])
    const [newWebhookUrl, setNewWebhookUrl] = useState('')

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

    async function handleDelete(id: string) {
        const { error } = await supabase
            .from('scenarios')
            .delete()
            .eq('id', id)

        if (!error) {
            setScenarios(scenarios.filter(s => s.id !== id))
            setDeleteConfirm(null)
        }
    }

    async function handleSaveWebhookUrl(id: string) {
        setSavingWebhook(true)
        const { error } = await supabase
            .from('scenarios')
            .update({ webhook_url: editWebhookUrl || null })
            .eq('id', id)

        if (!error) {
            setScenarios(scenarios.map(s => s.id === id ? { ...s, webhook_url: editWebhookUrl } : s))
            setEditingWebhook(null)
        }
        setSavingWebhook(false)
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
                    webhook_url: newWebhookUrl || null
                })
                .select()
                .single()

            if (error) throw error

            if (data) {
                setScenarios([data, ...scenarios])
                setIsModalOpen(false)
                setNewName('')
                setTriggerType('webhook')
                setScheduleInfo('Todos los días a las 10:00 AM')
                setSelectedChannels(['instagram'])
                setNewWebhookUrl('')
            }
        } catch (err: any) {
            console.error('Error creating scenario:', err)
            alert(`Error: ${err.message || 'No se pudo crear el escenario.'}`)
        } finally {
            setSaving(false)
        }
    }

    function handleExportBlueprint(scenario: Scenario) {
        // Make.com-compatible module identifiers per channel
        const makeModules: Record<string, { module: string; actionName: string }> = {
            instagram: { module: 'instagram:CreateAPhoto', actionName: 'Create a Photo' },
            facebook: { module: 'facebook:CreateAPagePost', actionName: 'Create a Page Post' },
            linkedin: { module: 'linkedin:CreateAShareUpdate', actionName: 'Create a Share Update' }
        }

        // Build the Make.com-compatible flow array
        let moduleId = 1
        const flow: any[] = []

        // Module 1: Custom Webhook trigger
        flow.push({
            id: moduleId++,
            module: 'gateway:CustomWebHook',
            version: 1,
            parameters: {
                hook: scenario.webhook_url || '<<INSERT_WEBHOOK_ID>>',
                maxResults: 1
            },
            mapper: {},
            metadata: {
                designer: { x: 0, y: 0 },
                restore: {},
                expect: [
                    {
                        name: 'meta', type: 'collection', spec: [
                            { name: 'content_id', type: 'text' },
                            { name: 'type', type: 'text' },
                            { name: 'title', type: 'text' },
                            { name: 'platform', type: 'text' }
                        ]
                    },
                    {
                        name: 'automation', type: 'collection', spec: [
                            { name: 'caption', type: 'text' },
                            { name: 'main_content', type: 'text' },
                            { name: 'media_urls', type: 'array', spec: { type: 'text' } }
                        ]
                    }
                ]
            }
        })

        // Module 2: Router (if multiple channels)
        if (scenario.channels.length > 1) {
            flow.push({
                id: moduleId++,
                module: 'builtin:BasicRouter',
                version: 1,
                parameters: {},
                mapper: null,
                metadata: {
                    designer: { x: 300, y: 0 }
                },
                routes: scenario.channels.map((ch, i) => ({
                    flow: [{
                        id: moduleId++,
                        module: makeModules[ch]?.module || `${ch}:CreatePost`,
                        version: 1,
                        parameters: { connection: `<<CONNECT_YOUR_${ch.toUpperCase()}_ACCOUNT>>` },
                        mapper: {
                            message: '{{1.automation.caption}}',
                            url: '{{1.automation.media_urls[]}}',
                            caption: '{{1.automation.caption}}'
                        },
                        metadata: {
                            designer: { x: 600, y: i * 200 },
                            expect: [
                                { name: 'message', type: 'text', label: 'Caption / Texto' },
                                { name: 'url', type: 'text', label: 'Image URL' }
                            ]
                        }
                    }],
                    label: `Ruta → ${channelModules[ch]?.name || ch}`
                }))
            })
        } else {
            // Single channel — no router needed
            const ch = scenario.channels[0]
            flow.push({
                id: moduleId++,
                module: makeModules[ch]?.module || `${ch}:CreatePost`,
                version: 1,
                parameters: { connection: `<<CONNECT_YOUR_${ch.toUpperCase()}_ACCOUNT>>` },
                mapper: {
                    message: '{{1.automation.caption}}',
                    url: '{{1.automation.media_urls[]}}',
                    caption: '{{1.automation.caption}}'
                },
                metadata: {
                    designer: { x: 300, y: 0 },
                    expect: [
                        { name: 'message', type: 'text', label: 'Caption / Texto' },
                        { name: 'url', type: 'text', label: 'Image URL' }
                    ]
                }
            })
        }

        const blueprint = {
            name: `Arq-Medios: ${scenario.name}`,
            flow,
            metadata: {
                version: 1,
                scenario: {
                    roundtrips: 1,
                    maxErrors: 3,
                    autoCommit: true,
                    autoCommitTriggerLast: true,
                    sequential: false,
                    confidential: false,
                    dataloss: false,
                    dlq: false
                },
                designer: { orphans: [] },
                zone: 'us2.make.com'
            },
            // Arq-Medios reference (for the user, not Make.com)
            _arq_medios: {
                exported_at: new Date().toISOString(),
                version: '4.0',
                source: 'Arq-Medios by Ro_Saas Factory',
                channels: scenario.channels,
                payload_example: {
                    meta: { content_id: 'uuid', type: 'carousel', title: 'Mi Post Viral', platform: 'both' },
                    automation: {
                        caption: 'Tu caption para redes sociales...',
                        main_content: 'Contenido principal del post...',
                        media_urls: ['https://example.com/image1.jpg']
                    }
                },
                setup_instructions: [
                    '1. En Make.com: Create a new scenario',
                    '2. Click "..." → Import Blueprint → sube este archivo',
                    '3. En el módulo Webhook: Click "Add" para generar tu URL',
                    '4. Copia la URL y pégala en Arq-Medios (campo Webhook URL)',
                    `5. Conecta tu cuenta de ${scenario.channels.map(c => channelModules[c]?.name || c).join(' y ')}`,
                    '6. Activa el escenario (botón ON)',
                    '7. Envía contenido desde Arq-Medios con "Enviar a Fábrica"'
                ]
            }
        }

        const blob = new Blob([JSON.stringify(blueprint, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `make-blueprint-${scenario.name.toLowerCase().replace(/\s+/g, '-')}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    async function handleCopyWebhookUrl(scenario: Scenario) {
        if (!scenario.webhook_url) return
        await navigator.clipboard.writeText(scenario.webhook_url)
        setCopiedId(scenario.id)
        setTimeout(() => setCopiedId(null), 2000)
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
                        Fábricas de Contenido
                        <span className="text-xs font-normal bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20">
                            {scenarios.length} {scenarios.length === 1 ? 'fábrica' : 'fábricas'}
                        </span>
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Conecta con Make.com para publicar tu contenido automáticamente</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                    <Plus size={18} />
                    Nueva Fábrica
                </button>
            </div>

            {/* Scenario Cards */}
            <div className="grid grid-cols-1 gap-6">
                {scenarios.map((scenario) => {
                    const TriggerIcon = triggerIcons[scenario.trigger_type] || Zap
                    const hasWebhook = !!scenario.webhook_url

                    return (
                        <div key={scenario.id} className="bg-[#111111]/80 backdrop-blur-xl border border-[#222] rounded-2xl overflow-hidden group hover:border-[#333] transition-all">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                                            scenario.is_active && hasWebhook ? "bg-emerald-500/10 text-emerald-400" :
                                                !hasWebhook ? "bg-amber-500/10 text-amber-500" :
                                                    "bg-slate-500/10 text-slate-400"
                                        )}>
                                            <Zap size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-3">
                                                {scenario.name}
                                                {!hasWebhook ? (
                                                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                        <AlertTriangle size={10} />
                                                        Sin webhook
                                                    </span>
                                                ) : (
                                                    <span className={clsx(
                                                        "flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full border",
                                                        scenario.is_active
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                            : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                                                    )}>
                                                        <span className={clsx("w-1 h-1 rounded-full", scenario.is_active ? "bg-emerald-400" : "bg-slate-400")} />
                                                        {scenario.is_active ? 'Activo' : 'Pausado'}
                                                    </span>
                                                )}
                                            </h3>
                                            <div className="flex items-center gap-4 mt-1 text-slate-500 text-xs">
                                                <span className="flex items-center gap-1">
                                                    <TriggerIcon size={12} /> {scenario.trigger_type === 'schedule' ? scenario.schedule_info : scenario.trigger_type}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {scenario.channels.map(ch => {
                                                        const Icon = channelIcons[ch as keyof typeof channelIcons] || Instagram
                                                        return <Icon key={ch} size={14} className="text-slate-400" />
                                                    })}
                                                </div>
                                                <span className="text-slate-600">Creado: {format(new Date(scenario.created_at), 'dd/MM/yyyy', { locale: es })}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setGuideScenario(scenario)}
                                            className="p-2.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors"
                                            title="Guía de configuración Make.com"
                                        >
                                            <BookOpen size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleExportBlueprint(scenario)}
                                            className="p-2.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors"
                                            title="Exportar Blueprint (.json)"
                                        >
                                            <Download size={18} />
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
                                            {scenario.is_active ? 'Pausar' : 'Activar'}
                                        </button>
                                        {deleteConfirm === scenario.id ? (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleDelete(scenario.id)}
                                                    className="px-3 py-2 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                                >
                                                    Confirmar
                                                </button>
                                                <button
                                                    onClick={() => setDeleteConfirm(null)}
                                                    className="p-2 text-slate-400 hover:text-white transition"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setDeleteConfirm(scenario.id)}
                                                className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                                                title="Eliminar fábrica"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Flow visualization */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-[#0a0a0a]/50 p-4 rounded-xl border border-[#222] hover:border-indigo-500/30 transition-colors">
                                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                            <TriggerIcon size={16} />
                                            <span className="text-[10px] uppercase tracking-widest font-bold">1. Trigger</span>
                                        </div>
                                        <p className="text-sm text-slate-300 font-medium">
                                            {scenario.trigger_type === 'schedule' ? `Programado: ${scenario.schedule_info}` :
                                                scenario.trigger_type === 'webhook' ? 'Webhook (desde Arq-Medios)' :
                                                    scenario.trigger_type === 'sheets' ? 'Google Sheets (nueva fila)' :
                                                        'RSS Feed (nuevo artículo)'}
                                        </p>
                                    </div>
                                    <div className="bg-[#0a0a0a]/50 p-4 rounded-xl border border-[#222] hover:border-fuchsia-500/30 transition-colors">
                                        <div className="flex items-center gap-2 text-fuchsia-400 mb-2">
                                            <Zap size={16} />
                                            <span className="text-[10px] uppercase tracking-widest font-bold">2. Proceso</span>
                                        </div>
                                        <p className="text-sm text-slate-300 font-medium">Make.com procesa y enruta</p>
                                    </div>
                                    <div className="bg-[#0a0a0a]/50 p-4 rounded-xl border border-[#222] hover:border-emerald-500/30 transition-colors">
                                        <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                            <ExternalLink size={16} />
                                            <span className="text-[10px] uppercase tracking-widest font-bold">3. Publicar</span>
                                        </div>
                                        <p className="text-sm text-slate-300 font-medium">{scenario.channels.length} {scenario.channels.length === 1 ? 'canal' : 'canales'}: {scenario.channels.join(', ')}</p>
                                    </div>
                                </div>

                                {/* Webhook URL section */}
                                <div className="mt-6 p-4 rounded-xl border border-[#222] bg-[#0a0a0a]/50">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <WebhookIcon size={16} className={hasWebhook ? "text-emerald-400" : "text-amber-500"} />
                                            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Webhook URL de Make.com</span>
                                            {hasWebhook && (
                                                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                                                    <CheckCircle size={10} /> Conectado
                                                </span>
                                            )}
                                        </div>
                                        {!editingWebhook || editingWebhook !== scenario.id ? (
                                            <button
                                                onClick={() => { setEditingWebhook(scenario.id); setEditWebhookUrl(scenario.webhook_url || '') }}
                                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                                            >
                                                <Pencil size={12} />
                                                {hasWebhook ? 'Editar' : 'Agregar URL'}
                                            </button>
                                        ) : null}
                                    </div>

                                    {editingWebhook === scenario.id ? (
                                        <div className="flex gap-2 mt-2">
                                            <input
                                                type="url"
                                                value={editWebhookUrl}
                                                onChange={(e) => setEditWebhookUrl(e.target.value)}
                                                placeholder="https://hook.us2.make.com/xxxxxxxxxxxx"
                                                className="flex-1 bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleSaveWebhookUrl(scenario.id)}
                                                disabled={savingWebhook}
                                                className="px-4 py-2 text-sm font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                                            >
                                                {savingWebhook ? '...' : 'Guardar'}
                                            </button>
                                            <button
                                                onClick={() => setEditingWebhook(null)}
                                                className="p-2 text-slate-400 hover:text-white transition"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : hasWebhook ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-slate-400 truncate font-mono flex-1">{scenario.webhook_url}</p>
                                            <button
                                                onClick={() => handleCopyWebhookUrl(scenario)}
                                                className="p-1.5 text-slate-400 hover:text-white transition-colors"
                                                title="Copiar URL"
                                            >
                                                {copiedId === scenario.id ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-amber-500/80 mt-1">
                                            Necesitas agregar tu URL de webhook de Make.com para poder enviar contenido.
                                            <button
                                                onClick={() => setGuideScenario(scenario)}
                                                className="ml-1 text-indigo-400 hover:text-indigo-300 underline"
                                            >
                                                Ver guía de configuración
                                            </button>
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}

                {scenarios.length === 0 && (
                    <div className="py-20 text-center border-2 border-dashed border-[#222] rounded-3xl">
                        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Zap size={32} className="text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-100">Sin fábricas configuradas</h3>
                        <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                            Crea tu primera fábrica de contenido para conectar con Make.com y publicar automáticamente en tus redes sociales.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                        >
                            <Plus size={18} />
                            Crear Primera Fábrica
                        </button>
                    </div>
                )}
            </div>

            {/* CREATE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#111111] border border-[#222] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-8 border-b border-[#222]">
                            <div className="flex items-center gap-3 text-indigo-400 mb-2">
                                <Zap size={20} />
                                <span className="text-xs font-bold uppercase tracking-widest">Nueva Fábrica</span>
                            </div>
                            <h2 className="text-2xl font-bold text-slate-100">Configurar Automatización</h2>
                            <p className="text-sm text-slate-500 mt-1">Conecta con Make.com para publicar contenido automáticamente</p>
                        </div>

                        <div className="p-8 space-y-6">
                            <div>
                                <label className="text-sm font-medium text-slate-400 block mb-2">Nombre de la fábrica</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Ej: Publicación diaria Instagram + Facebook"
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

                            <div>
                                <label className="text-sm font-medium text-slate-400 block mb-3">Tipo de Disparador</label>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { id: 'webhook', label: 'Webhook', icon: WebhookIcon, desc: 'Desde Arq-Medios' },
                                        { id: 'schedule', label: 'Programado', icon: Clock, desc: 'Por horario' },
                                        { id: 'sheets', label: 'Google Sheets', icon: Database, desc: 'Nueva fila' },
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

                            {triggerType === 'schedule' && (
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
                            )}

                            <div>
                                <label className="text-sm font-medium text-slate-400 block mb-2">
                                    Webhook URL de Make.com
                                    <span className="text-slate-600 font-normal ml-1">(puedes agregarlo después)</span>
                                </label>
                                <input
                                    type="url"
                                    value={newWebhookUrl}
                                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                                    placeholder="https://hook.us2.make.com/xxxxxxxxxxxx"
                                    className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-sm"
                                />
                                <p className="text-[11px] text-slate-500 mt-2">
                                    Crea un escenario en Make.com con un módulo &quot;Custom Webhook&quot; como trigger.
                                    Copia la URL que te genera Make.com y pégala aquí.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 bg-[#0a0a0a]/50 flex items-center justify-end gap-3 border-t border-[#222]">
                            <button
                                onClick={() => { setIsModalOpen(false); setNewWebhookUrl(''); setNewName('') }}
                                disabled={saving}
                                className="px-6 py-2.5 text-sm font-bold text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateScenario}
                                disabled={saving || !newName.trim() || selectedChannels.length === 0}
                                className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
                            >
                                {saving ? 'Creando...' : 'Crear Fábrica'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAKE.COM GUIDE MODAL */}
            {guideScenario && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-[#111111] border border-[#222] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-8 border-b border-[#222] flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-3 text-blue-400 mb-2">
                                    <BookOpen size={20} />
                                    <span className="text-xs font-bold uppercase tracking-widest">Guía de Configuración</span>
                                </div>
                                <h2 className="text-xl font-bold text-slate-100">Cómo configurar Make.com para &quot;{guideScenario.name}&quot;</h2>
                            </div>
                            <button onClick={() => setGuideScenario(null)} className="p-2 text-slate-400 hover:text-white transition">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Step 1: Blueprint Option */}
                            <div className="flex gap-4 p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                                    <Download size={20} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-indigo-400 mb-1">Método Rápido: Importar Blueprint</h3>
                                    <p className="text-sm text-slate-400 leading-relaxed mb-4">
                                        Hemos generado un archivo con toda la lógica (webhook + router + módulos) lista para usar.
                                    </p>
                                    <button
                                        onClick={() => { handleExportBlueprint(guideScenario); }}
                                        className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                                    >
                                        <Download size={16} />
                                        Descargar y Usar en Make.com
                                    </button>
                                    <div className="mt-4 text-[11px] text-slate-500 italic">
                                        * En Make.com: Crea escenario → Click &quot;...&quot; (abajo) → Import Blueprint → Sube este archivo.
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-sm font-bold border border-[#333]">2</div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-100 mb-2">Vincular Webhook</h3>
                                    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-sm text-slate-400">
                                        <p>Una vez importado, abre el primer módulo (Webhook), crea un nuevo hook para obtener tu URL única y pégala arriba en esta tarjeta de Arq-Medios.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">2</div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-100 mb-2">Pegar URL en Arq-Medios</h3>
                                    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-sm text-slate-400">
                                        <p>Pega la URL del webhook en el campo <strong className="text-slate-200">&quot;Webhook URL&quot;</strong> de esta fábrica (arriba en la tarjeta).</p>
                                        <p className="mt-2">La URL se ve así: <code className="bg-[#1a1a1a] px-2 py-0.5 rounded text-slate-300 text-xs">https://hook.us2.make.com/xxxxxxx</code></p>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">3</div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-100 mb-2">Agregar módulos de publicación</h3>
                                    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-sm text-slate-400 space-y-3">
                                        <p>Después del webhook, agrega un módulo por cada red social:</p>
                                        {guideScenario.channels.map(ch => (
                                            <div key={ch} className="flex items-start gap-3 p-3 bg-[#111] rounded-lg border border-[#222]">
                                                {(() => { const Icon = channelIcons[ch as keyof typeof channelIcons] || Instagram; return <Icon size={20} className="text-indigo-400 mt-0.5" /> })()}
                                                <div>
                                                    <p className="text-slate-200 font-bold text-sm">{channelModules[ch]?.name || ch}</p>
                                                    <p className="text-slate-500 text-xs mt-0.5">{channelModules[ch]?.description}</p>
                                                    <p className="text-xs mt-1">Módulo: <strong className="text-indigo-400">{channelModules[ch]?.apiModule}</strong></p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">4</div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-100 mb-2">Mapear los campos del payload</h3>
                                    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-sm text-slate-400 space-y-2">
                                        <p>Arq-Medios envía este payload a Make.com:</p>
                                        <div className="bg-[#0d0d0d] rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                                            <pre>{`{
  "meta": {
    "content_id": "uuid",
    "type": "carousel | reel",
    "title": "Título del post",
    "platform": "instagram | facebook | both"
  },
  "automation": {
    "caption": "Caption listo para publicar",
    "main_content": "Contenido principal",
    "media_urls": ["url1.jpg", "url2.jpg"]
  }
}`}</pre>
                                        </div>
                                        <p className="mt-2">En Make.com, mapea estos campos:</p>
                                        <ul className="space-y-1 text-xs">
                                            <li><strong className="text-slate-200">Caption/Texto:</strong> <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-indigo-400">automation.caption</code></li>
                                            <li><strong className="text-slate-200">Imágenes:</strong> <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-indigo-400">automation.media_urls</code></li>
                                            <li><strong className="text-slate-200">Contenido:</strong> <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-indigo-400">automation.main_content</code></li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Step 5 */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">5</div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-100 mb-2">Activar y probar</h3>
                                    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-sm text-slate-400 space-y-2">
                                        <p>1. Activa el escenario en Make.com (botón <strong className="text-slate-200">&quot;ON&quot;</strong>)</p>
                                        <p>2. Ve a cualquier contenido en Arq-Medios</p>
                                        <p>3. Selecciona esta fábrica en el selector <strong className="text-slate-200">&quot;Fábrica&quot;</strong></p>
                                        <p>4. Click en <strong className="text-emerald-400">&quot;Enviar a Fábrica&quot;</strong></p>
                                        <p>5. Verifica en Make.com que recibió el payload</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-[#0a0a0a]/50 flex items-center justify-between border-t border-[#222]">
                            <button
                                onClick={() => { handleExportBlueprint(guideScenario); }}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 transition"
                            >
                                <Download size={16} />
                                Descargar Blueprint JSON
                            </button>
                            <button
                                onClick={() => setGuideScenario(null)}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
