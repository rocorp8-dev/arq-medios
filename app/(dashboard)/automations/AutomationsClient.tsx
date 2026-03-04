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
    facebook_page_id?: string
    instagram_business_id?: string
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
    const [fbPageId, setFbPageId] = useState('')
    const [igBusId, setIgBusId] = useState('')

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

    async function handleSaveSocialIds(id: string) {
        setSavingWebhook(true)
        const { error } = await supabase
            .from('scenarios')
            .update({
                webhook_url: editWebhookUrl || null,
                facebook_page_id: fbPageId || null,
                instagram_business_id: igBusId || null
            })
            .eq('id', id)

        if (error) {
            console.error('Save error:', error)
            if (error.message?.includes('column') || error.code === 'PGRST204' || error.code === '42703') {
                alert('⚠️ Error: Las columnas facebook_page_id e instagram_business_id no existen en Supabase.\n\nVe a Supabase → SQL Editor y ejecuta:\n\nALTER TABLE public.scenarios\n  ADD COLUMN IF NOT EXISTS facebook_page_id TEXT,\n  ADD COLUMN IF NOT EXISTS instagram_business_id TEXT;')
            } else {
                alert('Error al guardar: ' + error.message)
            }
            setSavingWebhook(false)
            return
        }

        setScenarios(scenarios.map(s => s.id === id ? {
            ...s,
            webhook_url: editWebhookUrl,
            facebook_page_id: fbPageId,
            instagram_business_id: igBusId
        } : s))
        setEditingWebhook(null)
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
                    webhook_url: newWebhookUrl || null,
                    facebook_page_id: fbPageId || null,
                    instagram_business_id: igBusId || null
                })
                .select()
                .single()

            if (error) throw error

            if (data) {
                setScenarios([data, ...scenarios])
                setIsModalOpen(false)
                // Reset form
                setNewName('')
                setTriggerType('webhook')
                setScheduleInfo('Todos los días a las 10:00 AM')
                setSelectedChannels(['instagram'])
                setNewWebhookUrl('')
                setFbPageId('')
                setIgBusId('')
            }
        } catch (err: any) {
            console.error('Error creating scenario:', err)
            alert(`Error: ${err.message || 'No se pudo crear el escenario.'}`)
        } finally {
            setSaving(false)
        }
    }

    function handleExportBlueprint(scenario: Scenario) {
        // Make.com-compatible module identifiers and metadata per channel based on professional examples
        const makeModules: Record<string, any> = {
            instagram: {
                module: 'instagram-business:createPost',
                version: 1,
                color: '#E1306C',
                expect: [
                    { name: 'instagram_business_account_id', type: 'text', label: 'Instagram Business Account ID', required: true },
                    { name: 'image_url', type: 'url', label: 'Photo URL', required: true },
                    { name: 'caption', type: 'text', label: 'Caption' }
                ]
            },
            facebook: {
                module: 'facebook-pages:createPost',
                version: 6,
                color: '#1877F2',
                expect: [
                    { name: 'page_id', type: 'select', label: 'Page', required: true },
                    { name: 'message', type: 'text', label: 'Message' },
                    { name: 'link', type: 'url', label: 'Link' }
                ]
            },
            linkedin: {
                module: 'linkedin:CreateTextShare',
                version: 2,
                color: '#0A66C2',
                expect: [
                    { name: 'organization', type: 'select', label: 'Organization', required: true },
                    { name: 'content', type: 'text', label: 'Content', required: true },
                    { name: 'visibility', type: 'select', label: 'Visibility', required: true }
                ]
            }
        }

        // Build the Make.com-compatible flow array
        let moduleId = 1
        const flow: any[] = []
        const notes: any[] = []

        // Module 1: Trigger (Direct Webhook - Arq-Medios generates the content)
        const triggerId = moduleId++
        flow.push({
            id: triggerId,
            module: 'gateway:CustomWebHook',
            version: 1,
            parameters: { hook: scenario.webhook_url || '<<INSERT_WEBHOOK_ID>>', maxResults: 1 },
            metadata: {
                designer: { x: 0, y: 0, name: 'Entrada Arq-Medios' },
                restore: { parameters: { __IMTHOOK__: { label: 'Arq-Medios Webhook' } } },
                expect: [
                    { name: 'page_id', type: 'text', label: 'Facebook Page ID (requerido)' },
                    { name: 'instagram_id', type: 'text', label: 'Instagram Business Account ID (requerido)' },
                    { name: 'title', type: 'text', label: 'Título del contenido' },
                    { name: 'caption', type: 'text', label: 'Texto del post (sin URLs)' },
                    { name: 'image_url', type: 'url', label: 'URL imagen principal → Photo URL / HTTP download' },
                    { name: 'link_url', type: 'url', label: 'URL de referencia de la página (separada de imagen)' },
                    { name: 'url', type: 'url', label: 'Alias legacy de link_url' },
                    {
                        name: 'images',
                        type: 'array',
                        label: 'Array de imágenes (carrusel)',
                        spec: {
                            type: 'collection',
                            spec: [{ name: 'image_url', type: 'url', label: 'URL de cada imagen del carrusel' }]
                        }
                    }
                ]
            }
        })

        notes.push({
            moduleIds: [triggerId],
            content: "<h1>Trigger Arq-Medios</h1><p>Recibe el contenido ya optimizado por la IA de nuestra plataforma.</p>",
            isFilterNote: false,
            metadata: { color: '#4B5563' }
        })

        const webhookId = triggerId
        const routerStartX = 300

        // Module 4: Router (if multiple channels)
        if (scenario.channels.length > 1) {
            const routerId = moduleId++
            flow.push({
                id: routerId,
                module: 'builtin:BasicRouter',
                version: 1,
                parameters: {},
                mapper: null,
                metadata: {
                    designer: { x: routerStartX, y: 0, name: 'Enrutador por Red' }
                },
                routes: scenario.channels.map((ch, i) => {
                    if (ch === 'linkedin') {
                        // LinkedIn Advanced Multi-step Flow (Expert Recommendation)
                        const iterId = moduleId++
                        const httpId = moduleId++
                        const uploadId = moduleId++
                        const aggId = moduleId++
                        const createPostId = moduleId++

                        notes.push({
                            moduleIds: [iterId],
                            content: "<h1>Iterador de Imágenes</h1><p>Procesa cada URL del carrusel enviado desde Arq-Medios.</p>",
                            isFilterNote: false,
                            metadata: { color: '#6366F1' }
                        }, {
                            moduleIds: [httpId],
                            content: "<h1>Descargador de Archivos</h1><p>Descarga la imagen para que LinkedIn pueda procesarla como archivo binario.</p>",
                            isFilterNote: false,
                            metadata: { color: '#6366F1' }
                        }, {
                            moduleIds: [uploadId],
                            content: "<h1>Subida a LinkedIn</h1><p>Sube el archivo y genera un identificador (URN) interno.</p>",
                            isFilterNote: false,
                            metadata: { color: '#0A66C2' }
                        }, {
                            moduleIds: [aggId],
                            content: "<h1>Agregador de URNs</h1><p>Reúne todos los URNs generados por el iterador en una sola lista para el post final.</p>",
                            isFilterNote: false,
                            metadata: { color: '#6366F1' }
                        }, {
                            moduleIds: [createPostId],
                            content: "<h1>Publicar Post (Multi-Imagen)</h1><p>Crea el post final en LinkedIn usando el texto y la lista de URNs agregada.</p>",
                            isFilterNote: false,
                            metadata: { color: '#0A66C2' }
                        })

                        return {
                            flow: [
                                {
                                    id: iterId,
                                    module: 'builtin:BasicIterator',
                                    version: 1,
                                    parameters: { array: `{{${webhookId}.images}}` },
                                    metadata: {
                                        designer: { x: routerStartX + 300, y: i * 300, name: 'Iterador LinkedIn' }
                                    }
                                },
                                {
                                    id: httpId,
                                    module: 'http:ActionGetFile',
                                    version: 3,
                                    parameters: { url: `{{${iterId}.image_url}}` },
                                    metadata: { designer: { x: routerStartX + 600, y: i * 300, name: 'Descargar Imagen' } }
                                },
                                {
                                    id: uploadId,
                                    module: 'linkedin:UploadImage',
                                    version: 1,
                                    parameters: {},
                                    mapper: { image: `{{${httpId}.data}}` },
                                    metadata: {
                                        designer: { x: routerStartX + 900, y: i * 300, name: 'Subir a LinkedIn' },
                                        restore: { parameters: { __IMTCONN__: { label: 'Conexión LinkedIn' } } }
                                    }
                                },
                                {
                                    id: aggId,
                                    module: 'builtin:BasicArrayAggregator',
                                    version: 1,
                                    parameters: { feeder: iterId },
                                    mapper: { urn: `{{${uploadId}.urn}}` },
                                    metadata: { designer: { x: routerStartX + 1200, y: i * 300, name: 'Agrupar URNs' } }
                                },
                                {
                                    id: createPostId,
                                    module: 'linkedin:CreatePost',
                                    version: 1,
                                    parameters: {},
                                    mapper: {
                                        content: `{{${webhookId}.caption}}`,
                                        media: `{{${aggId}.array}}`,
                                        organization: `{{${webhookId}.page_id}}`,
                                        visibility: 'PUBLIC'
                                    },
                                    metadata: {
                                        designer: { x: routerStartX + 1500, y: i * 300, name: 'Post LinkedIn' },
                                        restore: { parameters: { __IMTCONN__: { label: 'Conexión LinkedIn' } } }
                                    }
                                }
                            ],
                            label: `LinkedIn (Carrusel)`
                        }
                    }

                    const pubId = moduleId++
                    const modCfg = makeModules[ch] || { module: `${ch}:CreatePost`, version: 1, color: '#6366F1' }

                    notes.push({
                        moduleIds: [pubId],
                        content: `<h1>Publicador ${channelModules[ch]?.name}</h1><p>Este nodo publica el contenido en tu cuenta de ${ch}.</p><p><b>Acción requerida:</b> Haz click en este módulo → campo "Connection" → Add → autoriza tu cuenta ${ch === 'instagram' ? 'Instagram for Business' : ch === 'facebook' ? 'Facebook Pages' : ch}.</p>`,
                        isFilterNote: false,
                        metadata: { color: modCfg.color }
                    })

                    if (ch === 'facebook') {
                        // Facebook needs 2 steps: HTTP download image → Upload as Photo (no link preview)
                        const httpFbId = moduleId++

                        notes.push({
                            moduleIds: [httpFbId],
                            content: "<h1>Descargar Imagen Real</h1><p>Convierte la URL en archivo binario para que Facebook lo reciba como FOTO, no como link. Así evitas la vista previa de tu web.</p>",
                            isFilterNote: false,
                            metadata: { color: '#00BFFF' }
                        }, {
                            moduleIds: [pubId],
                            content: "<h1>Subir Foto a Facebook</h1><p>Publica la imagen directamente como foto con caption. Resultado: post limpio, sin recuadro de web.</p>",
                            isFilterNote: false,
                            metadata: { color: '#1877F2' }
                        })

                        return {
                            flow: [
                                {
                                    id: httpFbId,
                                    module: 'http:ActionGetFile',
                                    version: 3,
                                    parameters: { handleErrors: true },
                                    mapper: {
                                        url: `{{first(map(${webhookId}.images; "image_url"))}}`,
                                        method: 'get'
                                    },
                                    metadata: { designer: { x: routerStartX + 300, y: i * 200, name: 'Descargar Imagen' } }
                                },
                                {
                                    id: pubId,
                                    module: 'facebook-pages:uploadPhoto',
                                    version: 1,
                                    parameters: {},
                                    mapper: {
                                        caption: `{{ifempty(${webhookId}.caption; "Nueva publicación")}}`,
                                        photo: `{{${httpFbId}.data}}`,
                                        page_id: `{{${webhookId}.page_id}}`,
                                        published: true
                                    },
                                    metadata: {
                                        designer: { x: routerStartX + 600, y: i * 200, name: 'Facebook Pura Foto' },
                                        restore: { parameters: { __IMTCONN__: { label: 'Conexión Facebook Pages' } } }
                                    }
                                }
                            ],
                            label: 'Hacia Facebook Pages',
                            filter: {
                                name: 'Validar imagen Facebook',
                                conditions: [[{ a: `{{${webhookId}.image_url}}`, o: 'exists' }]]
                            }
                        }
                    }

                    // Instagram — single module, image URL comes directly from payload
                    const channelMapper: Record<string, any> = ch === 'instagram' ? {
                        instagram_business_account_id: `{{${webhookId}.instagram_id}}`,
                        caption: `{{ifempty(${webhookId}.caption; "Nueva publicación")}}`,
                        image_url: `{{${webhookId}.image_url}}`
                    } : {
                        content: `{{${webhookId}.caption}}`,
                        url: `{{${webhookId}.url}}`
                    }

                    // Add filter on Instagram route to avoid errors when image_url is missing
                    const routeFilter = ch === 'instagram' ? {
                        filter: {
                            name: 'Validar URL Imagen',
                            conditions: [[{ a: `{{${webhookId}.image_url}}`, o: 'exists' }]]
                        }
                    } : {}

                    return {
                        flow: [{
                            id: pubId,
                            module: modCfg.module,
                            version: modCfg.version,
                            parameters: {},
                            mapper: channelMapper,
                            metadata: {
                                designer: { x: routerStartX + 300, y: i * 200, name: `Publicar en ${ch}` },
                                restore: {
                                    parameters: {
                                        __IMTCONN__: { label: `Conexión Arq-Medios ${ch}` }
                                    }
                                },
                                expect: modCfg.expect
                            }
                        }],
                        label: `Hacia ${channelModules[ch]?.name || ch}`,
                        ...routeFilter
                    }
                })
            })

            notes.push({
                moduleIds: [routerId],
                content: "<h1>Divisor de Canales</h1><p>Este router separa el flujo según las redes sociales seleccionadas en Arq-Medios.</p>",
                isFilterNote: false,
                metadata: { color: '#9138FE' }
            })
        } else {
            // Single channel — no router needed
            const ch = scenario.channels[0]
            if (ch === 'linkedin') {
                const iterId = moduleId++
                const httpId = moduleId++
                const uploadId = moduleId++
                const aggId = moduleId++
                const createPostId = moduleId++

                notes.push({
                    moduleIds: [iterId],
                    content: "<h1>Iterador LinkedIn</h1><p>Procesa las múltiples piezas del carrusel.</p>",
                    isFilterNote: false,
                    metadata: { color: '#6366F1' }
                }, {
                    moduleIds: [createPostId],
                    content: "<h1>LinkedIn Post</h1><p>Publicación final optimizada para carruseles.</p>",
                    isFilterNote: false,
                    metadata: { color: '#0A66C2' }
                })

                flow.push(
                    {
                        id: iterId,
                        module: 'builtin:BasicIterator',
                        version: 1,
                        parameters: { array: `{{${webhookId}.images}}` },
                        metadata: { designer: { x: routerStartX + 300, y: 0, name: 'Iterador' } }
                    },
                    {
                        id: httpId,
                        module: 'http:ActionGetFile',
                        version: 3,
                        parameters: { url: `{{${iterId}.image_url}}` },
                        metadata: { designer: { x: routerStartX + 550, y: 0, name: 'Descargar' } }
                    },
                    {
                        id: uploadId,
                        module: 'linkedin:UploadImage',
                        version: 1,
                        parameters: {},
                        mapper: { image: `{{${httpId}.data}}` },
                        metadata: {
                            designer: { x: routerStartX + 800, y: 0, name: 'Subir' },
                            restore: { parameters: { __IMTCONN__: { label: 'Conexión LinkedIn' } } }
                        }
                    },
                    {
                        id: aggId,
                        module: 'builtin:BasicArrayAggregator',
                        version: 1,
                        parameters: { feeder: iterId },
                        mapper: { urn: `{{${uploadId}.urn}}` },
                        metadata: { designer: { x: routerStartX + 1050, y: 0, name: 'Agrupar' } }
                    },
                    {
                        id: createPostId,
                        module: 'linkedin:CreatePost',
                        version: 1,
                        parameters: {},
                        mapper: {
                            content: `{{${webhookId}.caption}}`,
                            media: `{{${aggId}.array}}`,
                            organization: `{{${webhookId}.page_id}}`,
                            visibility: 'PUBLIC'
                        },
                        metadata: {
                            designer: { x: routerStartX + 1300, y: 0, name: 'Post' },
                            restore: { parameters: { __IMTCONN__: { label: 'Conexión LinkedIn' } } }
                        }
                    }
                )
            } else {
                const pubId = moduleId++
                const modCfg = makeModules[ch] || { module: `${ch}:CreatePost`, version: 1, color: '#6366F1' }

                if (ch === 'facebook') {
                    // Facebook: HTTP download → createPhoto (avoids link preview)
                    const httpFbId = moduleId++

                    notes.push({
                        moduleIds: [httpFbId],
                        content: "<h1>Descargar Imagen Real</h1><p>Convierte la URL en archivo binario para que Facebook lo reciba como FOTO, no como link. Así evitas la vista previa de tu web.</p>",
                        isFilterNote: false,
                        metadata: { color: '#00BFFF' }
                    }, {
                        moduleIds: [pubId],
                        content: "<h1>Subir Foto a Facebook</h1><p>Post limpio: foto directa + caption. Sin recuadro de web.</p>",
                        isFilterNote: false,
                        metadata: { color: '#1877F2' }
                    })

                    flow.push(
                        {
                            id: httpFbId,
                            module: 'http:ActionGetFile',
                            version: 3,
                            parameters: { handleErrors: true },
                            mapper: {
                                url: `{{first(map(${webhookId}.images; "image_url"))}}`,
                                method: 'get'
                            },
                            metadata: { designer: { x: routerStartX + 300, y: 0, name: 'Descargar Imagen' } }
                        },
                        {
                            id: pubId,
                            module: 'facebook-pages:uploadPhoto',
                            version: 1,
                            parameters: {},
                            mapper: {
                                caption: `{{ifempty(${webhookId}.caption; "Nueva publicación")}}`,
                                photo: `{{${httpFbId}.data}}`,
                                page_id: `{{${webhookId}.page_id}}`,
                                published: true
                            },
                            metadata: {
                                designer: { x: routerStartX + 600, y: 0, name: 'Facebook Pura Foto' },
                                restore: { parameters: { __IMTCONN__: { label: 'Conexión Facebook Pages' } } }
                            }
                        }
                    )
                } else {
                // Instagram / others: single module
                const channelMapper: Record<string, any> = ch === 'instagram' ? {
                    instagram_business_account_id: `{{${webhookId}.instagram_id}}`,
                    caption: `{{ifempty(${webhookId}.caption; "Nueva publicación")}}`,
                    image_url: `{{${webhookId}.image_url}}`
                } : {
                    content: `{{${webhookId}.caption}}`,
                    url: `{{${webhookId}.url}}`
                }

                flow.push({
                    id: pubId,
                    module: modCfg.module,
                    version: modCfg.version,
                    parameters: {},
                    mapper: channelMapper,
                    metadata: {
                        designer: { x: routerStartX + 300, y: 0, name: `Publicar en ${ch}` },
                        restore: {
                            parameters: {
                                __IMTCONN__: { label: `Conexión Arq-Medios ${ch}` }
                            }
                        },
                        expect: modCfg.expect
                    }
                })

                notes.push({
                    moduleIds: [pubId],
                    content: `<h1>Publicador ${channelModules[ch]?.name}</h1><p>Este nodo publica el contenido en tu cuenta de ${ch}.</p><p><b>Importante:</b> Conecta tu cuenta en el botón 'Add' de este módulo.</p>`,
                    isFilterNote: false,
                    metadata: { color: modCfg.color }
                })
                } // end else (non-facebook single channel)
            }
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
                designer: {
                    orphans: [],
                    notes
                },
                zone: 'us2.make.com'
            },
            _arq_medios: {
                exported_at: new Date().toISOString(),
                version: '6.0 (PRO)',
                source: 'Arq-Medios by Ro_Saas Factory',
                setup_instructions: [
                    '1. En Make.com: Create a new scenario',
                    '2. Click "..." (menú inferior) → Import Blueprint → Sube este archivo',
                    '3. Abre el nodo de Webhook y genera tu URL fija',
                    '4. En los nodos finales de Publicación (FB/IG/LI), conecta tus cuentas profesionales'
                ]
            }
        }

        const json = JSON.stringify(blueprint, null, 2)
        try {
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `make-blueprint-${scenario.name.toLowerCase().replace(/\s+/g, '-')}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        } catch {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(json).then(() => {
                alert('✅ El navegador bloqueó la descarga. El JSON fue copiado al portapapeles.\n\nEn Make.com: "..." → Import Blueprint → Pégalo en el editor de texto.')
            })
        }
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
                                                onClick={() => {
                                                    setEditingWebhook(scenario.id);
                                                    setEditWebhookUrl(scenario.webhook_url || '');
                                                    setFbPageId(scenario.facebook_page_id || '');
                                                    setIgBusId(scenario.instagram_business_id || '');
                                                }}
                                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
                                            >
                                                <Pencil size={12} />
                                                {hasWebhook ? 'Editar' : 'Agregar URL'}
                                            </button>
                                        ) : null}
                                    </div>

                                    {editingWebhook === scenario.id ? (
                                        <div className="flex flex-col gap-3 mt-2">
                                            <input
                                                type="url"
                                                value={editWebhookUrl}
                                                onChange={(e) => setEditWebhookUrl(e.target.value)}
                                                placeholder="Webhook URL de Make.com"
                                                className="w-full bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono"
                                            />
                                            <div className="grid grid-cols-2 gap-2">
                                                <input
                                                    type="text"
                                                    value={fbPageId}
                                                    onChange={(e) => setFbPageId(e.target.value)}
                                                    placeholder="Facebook Page ID"
                                                    className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[10px] text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono"
                                                />
                                                <input
                                                    type="text"
                                                    value={igBusId}
                                                    onChange={(e) => setIgBusId(e.target.value)}
                                                    placeholder="Instagram Business ID"
                                                    className="bg-[#111] border border-[#333] rounded-lg px-3 py-2 text-[10px] text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setEditingWebhook(null)}
                                                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={() => handleSaveSocialIds(scenario.id)}
                                                    disabled={savingWebhook}
                                                    className="px-4 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50"
                                                >
                                                    {savingWebhook ? '...' : 'Guardar Cambios'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Webhook Display */}
                                            <div className="flex items-center gap-2 mt-1">
                                                <p className="text-xs text-slate-400 truncate font-mono flex-1">
                                                    {scenario.webhook_url || 'Sin URL de webhook'}
                                                </p>
                                                {scenario.webhook_url && (
                                                    <button
                                                        onClick={() => handleCopyWebhookUrl(scenario)}
                                                        className="p-1.5 text-slate-400 hover:text-white transition-colors"
                                                        title="Copiar URL"
                                                    >
                                                        {copiedId === scenario.id ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Social IDs Display */}
                                            <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Facebook size={12} className="text-blue-500/50" />
                                                    <span className="text-[10px] font-mono text-slate-500">
                                                        FB: {scenario.facebook_page_id || '---'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Instagram size={12} className="text-pink-500/50" />
                                                    <span className="text-[10px] font-mono text-slate-500">
                                                        IG: {scenario.instagram_business_id || '---'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-400 block mb-2 flex items-center gap-2">
                                        <Facebook size={14} className="text-blue-400" /> Facebook Page ID
                                    </label>
                                    <input
                                        type="text"
                                        value={fbPageId}
                                        onChange={(e) => setFbPageId(e.target.value)}
                                        placeholder="Ej: 104529348271"
                                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-400 block mb-2 flex items-center gap-2">
                                        <Instagram size={14} className="text-pink-400" /> Instagram ID
                                    </label>
                                    <input
                                        type="text"
                                        value={igBusId}
                                        onChange={(e) => setIgBusId(e.target.value)}
                                        placeholder="Ej: 1784140123456"
                                        className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl px-4 py-3 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono text-xs"
                                    />
                                </div>
                            </div>

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
                                    <div className="flex flex-wrap gap-3">
                                        <button
                                            onClick={() => { handleExportBlueprint(guideScenario); }}
                                            className="inline-flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
                                        >
                                            <Download size={16} />
                                            Descargar .json
                                        </button>
                                        <button
                                            onClick={async () => {
                                                handleExportBlueprint(guideScenario)
                                                setTimeout(async () => {
                                                    try {
                                                        await navigator.clipboard.writeText(JSON.stringify({ scenario: guideScenario.name, channels: guideScenario.channels }, null, 2))
                                                    } catch { }
                                                }, 100)
                                            }}
                                            className="inline-flex items-center gap-2 px-6 py-2 bg-[#0a0a0a] hover:bg-[#111] border border-[#333] text-slate-300 text-sm font-bold rounded-xl transition-all"
                                        >
                                            <Copy size={16} />
                                            Copiar JSON
                                        </button>
                                    </div>
                                    <div className="mt-4 space-y-1 text-[11px] text-slate-500 italic">
                                        <p>* En Make.com: Crea escenario → Click &quot;...&quot; (abajo izquierda) → Import Blueprint → Sube el .json.</p>
                                        <p>* Si el navegador bloquea la descarga, usa &quot;Copiar JSON&quot; y en Make.com pégalo en el editor de blueprint.</p>
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
                                    <h3 className="text-base font-bold text-slate-100 mb-2">Módulos de publicación incluidos en el Blueprint</h3>
                                    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-sm text-slate-400 space-y-3">
                                        <p>El blueprint ya incluye el flujo correcto por canal:</p>
                                        {guideScenario.channels.map(ch => (
                                            <div key={ch} className="flex items-start gap-3 p-3 bg-[#111] rounded-lg border border-[#222]">
                                                {(() => { const Icon = channelIcons[ch as keyof typeof channelIcons] || Instagram; return <Icon size={20} className="text-indigo-400 mt-0.5" /> })()}
                                                <div>
                                                    <p className="text-slate-200 font-bold text-sm">{channelModules[ch]?.name || ch}</p>
                                                    {ch === 'facebook' && (
                                                        <div className="mt-1.5 space-y-1 text-xs">
                                                            <p className="text-slate-400">Flow de <strong className="text-cyan-400">2 pasos</strong> para post limpio (sin vista previa de web):</p>
                                                            <p>① <strong className="text-slate-300">HTTP Get File</strong> → descarga la imagen como binario</p>
                                                            <p>② <strong className="text-slate-300">facebook-pages:uploadPhoto</strong> → sube el archivo como foto pura</p>
                                                            <p className="text-emerald-400 font-medium">✓ Sin campo &quot;Link&quot; = sin tarjeta gris de tu web</p>
                                                        </div>
                                                    )}
                                                    {ch === 'instagram' && (
                                                        <div className="mt-1.5 text-xs text-slate-400">
                                                            <p>Módulo: <strong className="text-indigo-400">instagram-business:createPost</strong></p>
                                                            <p className="mt-0.5">La URL de imagen se pasa directamente como <code className="bg-[#1a1a1a] px-1 rounded">image_url</code></p>
                                                        </div>
                                                    )}
                                                    {ch === 'linkedin' && (
                                                        <div className="mt-1.5 space-y-1 text-xs text-slate-400">
                                                            <p>Flow de <strong className="text-blue-400">5 pasos</strong> para carrusel con imágenes:</p>
                                                            <p>Iterator → HTTP Download → Upload → Aggregate URNs → Create Post</p>
                                                        </div>
                                                    )}
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
                                    <h3 className="text-base font-bold text-slate-100 mb-2">Conectar tus cuentas en Make.com</h3>
                                    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-sm text-slate-400 space-y-3">
                                        <p>En cada módulo de publicación, haz click en <strong className="text-slate-200">&quot;Add&quot;</strong> / <strong className="text-slate-200">&quot;Connection&quot;</strong>:</p>
                                        {guideScenario.channels.map(ch => (
                                            <div key={ch} className="flex items-start gap-3 p-3 bg-[#111] rounded-lg border border-[#222]">
                                                {(() => { const Icon = channelIcons[ch as keyof typeof channelIcons] || Instagram; return <Icon size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" /> })()}
                                                <div className="text-xs space-y-1.5">
                                                    <p className="text-slate-200 font-bold">{channelModules[ch]?.name || ch}</p>
                                                    {ch === 'instagram' && (
                                                        <>
                                                            <p>1. Haz click en el módulo → campo <strong className="text-white">&quot;Connection&quot;</strong> → <strong className="text-indigo-400">Add</strong> → Autoriza con <strong className="text-white">Instagram for Business</strong></p>
                                                            <p>2. En el campo <strong className="text-white">&quot;Account&quot;</strong> (accountId) → selecciona tu cuenta <strong className="text-slate-300">Instagram Business</strong> del dropdown</p>
                                                            <p className="text-amber-400">⚠️ Si ves <code className="bg-[#1a1a1a] px-1 rounded">BundleValidationError: Missing accountId</code> → es porque olvidaste este paso</p>
                                                        </>
                                                    )}
                                                    {ch === 'facebook' && (
                                                        <>
                                                            <p>1. Módulo <strong className="text-cyan-400">HTTP Get File</strong> → no requiere conexión, solo descarga la imagen</p>
                                                            <p>2. Módulo <strong className="text-blue-400">Facebook Pages → Upload a Photo</strong> → campo <strong className="text-white">&quot;Connection&quot;</strong> → <strong className="text-indigo-400">Add</strong> → autoriza tu página</p>
                                                            <p>3. El campo <strong className="text-white">&quot;Page&quot;</strong> viene del webhook (<code className="bg-[#1a1a1a] px-1 rounded">page_id</code>)</p>
                                                            <p className="text-emerald-400">✓ NO hay campo &quot;Link&quot; → Facebook NO genera vista previa de tu web</p>
                                                        </>
                                                    )}
                                                    {ch === 'linkedin' && (
                                                        <>
                                                            <p>1. Campo <strong className="text-white">&quot;Connection&quot;</strong> → <strong className="text-indigo-400">Add</strong> → Autoriza con tu cuenta de LinkedIn</p>
                                                            <p>2. El post se publicará en tu perfil/página de LinkedIn automáticamente</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Step 5 - Payload */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">5</div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-100 mb-2">Mapear campos en Make.com</h3>
                                    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-sm text-slate-400 space-y-2">
                                        <p>Arq-Medios envía este payload — úsalos en los campos de Make.com:</p>
                                        <div className="bg-[#0d0d0d] rounded-lg p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                                            <pre>{`{
  "page_id":    "TU_PAGE_ID_NUMERICO",
  "instagram_id": "TU_INSTAGRAM_BUSINESS_ID",
  "caption":    "Texto del post (sin URLs)",
  "title":      "Título del contenido",
  "image_url":  "https://cdn.../imagen-principal.jpg",
  "link_url":   "https://arq-medios.com/content/xxx",
  "images": [
    { "image_url": "https://cdn.../foto1.jpg" },
    { "image_url": "https://cdn.../foto2.jpg" }
  ]
}`}</pre>
                                        </div>
                                        <div className="space-y-1.5 text-xs mt-2">
                                            <p><strong className="text-slate-200">Texto del post:</strong> <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-emerald-400">{'{{1.caption}}'}</code> <span className="text-emerald-500">✓ URLs auto-eliminadas</span></p>
                                            <p><strong className="text-slate-200">Imagen principal:</strong> <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-emerald-400">{'{{1.image_url}}'}</code> ← Photo URL / HTTP download / Instagram</p>
                                            <p><strong className="text-slate-200">Carrusel de imágenes:</strong> <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-emerald-400">{'{{1.images[]}}'}</code> ← array para Instagram carousel / LinkedIn</p>
                                            <p><strong className="text-slate-200">Page ID (Facebook):</strong> <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-emerald-400">{'{{1.page_id}}'}</code></p>
                                            <p><strong className="text-slate-200">Instagram Business ID:</strong> <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-emerald-400">{'{{1.instagram_id}}'}</code></p>
                                            <p><strong className="text-slate-200">Link de referencia:</strong> <code className="bg-[#1a1a1a] px-1.5 py-0.5 rounded text-emerald-400">{'{{1.link_url}}'}</code> ← URL de la página (NO la imagen)</p>
                                        </div>
                                        <div className="mt-3 p-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg text-[11px] text-emerald-400">
                                            ✓ <strong>Auto-limpieza activada:</strong> Arq-Medios elimina automáticamente cualquier URL del caption antes de enviarlo. Facebook y Instagram reciben texto limpio sin links, por lo que <strong>no se genera la tarjeta de vista previa de tu web</strong>.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 6 - Activate */}
                            <div className="flex gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold">6</div>
                                <div className="flex-1">
                                    <h3 className="text-base font-bold text-slate-100 mb-2">Activar escenario y disparar desde Arq-Medios</h3>
                                    <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-sm text-slate-400 space-y-2">
                                        <p>1. En Make.com activa el escenario con el toggle <strong className="text-white">ON</strong></p>
                                        <p>2. En Arq-Medios ve a un <strong className="text-white">contenido listo</strong> (con imágenes generadas)</p>
                                        <p>3. En el header del editor, selecciona <strong className="text-white">&quot;{guideScenario.name}&quot;</strong> en el dropdown de Fábrica</p>
                                        <p>4. Click en <strong className="text-emerald-400">🚀 Enviar a Fábrica</strong></p>
                                        <p>5. En Make.com verás los módulos encenderse en <strong className="text-emerald-400">verde</strong> — eso significa que el contenido fue publicado</p>
                                    </div>
                                </div>
                            </div>

                            {/* Troubleshooting */}
                            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">Errores comunes y soluciones:</p>
                                <ul className="text-xs text-slate-400 space-y-2">
                                    <li className="p-2 bg-red-500/5 border border-red-500/15 rounded-lg">
                                        <strong className="text-red-400 block mb-0.5">❗ BundleValidationError: Missing value of required parameter &apos;accountId&apos;</strong>
                                        Abre el módulo de Instagram Business → campo <strong className="text-slate-300">&quot;Account&quot;</strong> → selecciona tu cuenta Instagram Business del dropdown. Debes conectar primero en &quot;Connection&quot;.
                                    </li>
                                    <li className="p-2 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                                        <strong className="text-amber-400 block mb-0.5">⚠️ Facebook muestra tarjeta de vista previa de tu web</strong>
                                        El caption llega con un URL dentro del texto. Arq-Medios ya elimina URLs automáticamente del campo <code className="bg-[#1a1a1a] px-1 rounded">caption</code>. Si persiste, verifica que el módulo de Facebook sea <strong className="text-slate-300">createPhoto</strong> (no createPost) y que no hayas añadido un campo <code className="bg-[#1a1a1a] px-1 rounded">link</code> al mapper.
                                    </li>
                                    <li>• Verifica que la cuenta conectada en Make.com sea <strong className="text-slate-300">Business/Creator</strong>, no personal</li>
                                    <li>• Verifica que el toggle del escenario esté en <strong className="text-slate-300">ON</strong> (no solo &quot;Run Once&quot;)</li>
                                    <li>• Revisa el historial en Make.com: <strong className="text-slate-300">History</strong> → ver si hay errores de conexión</li>
                                    <li>• Si usa &quot;Run Once&quot;, haz click primero en Make.com y luego en Arq-Medios dentro de 5 segundos</li>
                                </ul>
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
