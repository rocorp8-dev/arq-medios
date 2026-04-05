'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Newspaper, RefreshCw, ExternalLink, Sparkles, X, Plus, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TopicSeed { id: string; title: string; category: string | null }
interface NewsArticle { title: string; description: string; url: string; source: string; publishedAt: string }
interface TopicSuggestion { title: string; description: string; category: string }
interface Props { initialTopics: TopicSeed[]; campaignKeywords: string[]; userId: string }

export default function TrendsClient({ initialTopics, campaignKeywords, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [newsError, setNewsError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeKeyword, setActiveKeyword] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [generateModal, setGenerateModal] = useState<NewsArticle | null>(null)
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [addedTopics, setAddedTopics] = useState<Set<number>>(new Set())
  const [addingTopic, setAddingTopic] = useState<number | null>(null)

  // Keywords de topics (categorías + títulos)
  const topicKeywords = Array.from(new Set([
    ...initialTopics.map(t => t.category).filter(Boolean) as string[],
    ...initialTopics.map(t => t.title).slice(0, 5),
  ])).slice(0, 10)

  // Keywords únicas de campañas (sin duplicar con topics)
  const uniqueCampaignKeywords = Array.from(new Set(campaignKeywords))
    .filter(kw => !topicKeywords.includes(kw))
    .slice(0, 8)

  const keywords = topicKeywords

  async function fetchNews(keyword: string) {
    setActiveKeyword(keyword)
    setLoading(true)
    setArticles([])
    setNewsError(null)
    setSuggestions([])
    setAddedTopics(new Set())

    try {
      const res = await fetch(`/api/news?q=${encodeURIComponent(keyword)}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setArticles(data)
        // Auto-generate topic suggestions from articles
        fetchSuggestions(keyword, data.map((a: NewsArticle) => a.title))
      } else if (data.error) {
        setNewsError(data.error)
      }
    } catch (err: any) {
      setNewsError(err.message || 'Error de conexión')
    }
    setLoading(false)
  }

  async function fetchSuggestions(keyword: string, articleTitles: string[]) {
    setLoadingSuggestions(true)
    try {
      const res = await fetch('/api/topics/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword, articleTitles }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setSuggestions(data)
      }
    } catch { /* silencioso */ }
    setLoadingSuggestions(false)
  }

  async function handleAddTopic(suggestion: TopicSuggestion, idx: number) {
    setAddingTopic(idx)
    try {
      await supabase.from('topics').insert({
        user_id: userId,
        title: suggestion.title,
        description: suggestion.description,
        category: suggestion.category,
        status: 'pending',
      })
      setAddedTopics(prev => new Set([...prev, idx]))
    } catch { /* silencioso */ }
    setAddingTopic(null)
  }

  async function handleCreatePost(article: NewsArticle, type: 'carousel' | 'reel') {
    setGenerating(article.url)
    try {
      // Use the first topic as context, or create a minimal one
      const topic = initialTopics[0]
      if (!topic) { alert('Crea al menos un Topic primero.'); setGenerating(null); return }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: topic.id,
          topicTitle: activeKeyword || topic.title,
          topicDescription: topic.title,
          type,
          newsContext: { title: article.title, description: article.description },
        }),
      })
      const data = await res.json()
      if (data.id) {
        // If it's a carousel, trigger Banana Extension
        if (type === 'carousel' && Array.isArray(data.content?.body)) {
          const BANANA_ID = 'ahmgloadmhbhejpghjfcfdiblemhclld'
          const prompts = data.content.body
            .map((slide: any) => slide.image_prompt)
            .filter(Boolean)

          if (prompts.length > 0 && typeof window !== 'undefined' && (window as any).chrome?.runtime) {
            console.log('Sending trends prompts to Banana Extension:', prompts)
            try {
              (window as any).chrome.runtime.sendMessage(BANANA_ID, {
                action: 'RUN_BATCH',
                prompts,
                options: { 
                  delay: 4000,
                  prefix: article.title // Nuevo: prefijo basado en la noticia
                }
              }, (response: any) => {
                console.log('Banana Response:', response)
              })
            } catch (e) {
              console.error('Error contacting Banana extension:', e)
            }
          }
        }
        setGenerateModal(null)
        router.push(`/content/${data.id}`)
      } else {
        alert('Error generando contenido con Cerebras.')
      }
    } catch {
      alert('Error de conexión.')
    }
    setGenerating(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp size={24} className="text-amber-400" />
            <h1 className="text-2xl font-bold text-slate-100">Tendencias del Nicho</h1>
          </div>
          <p className="text-slate-500 text-sm">Noticias del día de tu sector — convierte una tendencia en un post viral con 1 clic</p>
        </div>
      </div>

      {/* Keyword pills */}
      {keywords.length > 0 || uniqueCampaignKeywords.length > 0 ? (
        <div className="space-y-4">
          {keywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tus keywords (de tus topics)</p>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => fetchNews(kw)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      activeKeyword === kw
                        ? 'bg-amber-500 text-black'
                        : 'bg-[#1a1a1a] text-slate-400 border border-[#2a2a2a] hover:border-amber-500/40 hover:text-amber-400'
                    }`}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
          {uniqueCampaignKeywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">De tus campañas</p>
              <div className="flex flex-wrap gap-2">
                {uniqueCampaignKeywords.map((kw, i) => (
                  <button
                    key={i}
                    onClick={() => fetchNews(kw)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                      activeKeyword === kw
                        ? 'bg-indigo-500 text-white'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/20'
                    }`}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <Newspaper size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium mb-1">Crea Topics primero</p>
          <p className="text-slate-500 text-sm">Las keywords se extraen de tus Topics y categorías. Ve a Topics → Nuevo Topic para comenzar.</p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={28} className="text-amber-400 animate-spin" />
            <p className="text-slate-400 text-sm">Buscando noticias de "{activeKeyword}"...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && newsError && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400 text-sm font-medium">Error al obtener noticias</p>
          <p className="text-red-400/70 text-xs mt-1">{newsError}</p>
          {(newsError.includes('429') || newsError.includes('rate') || newsError.includes('exceed')) && (
            <p className="text-slate-500 text-xs mt-2">Límite diario del plan gratuito de GNews alcanzado (10 req/día). Intenta mañana.</p>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !newsError && activeKeyword && articles.length === 0 && (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <p className="text-slate-400">No se encontraron noticias recientes para <strong className="text-slate-200">"{activeKeyword}"</strong>.</p>
          <p className="text-slate-500 text-sm mt-1">Intenta con otra keyword o vuelve más tarde.</p>
        </div>
      )}

      {/* News grid */}
      {!loading && articles.length > 0 && (
        <>
          <p className="text-xs text-slate-500">{articles.length} noticias encontradas para <span className="text-amber-400 font-medium">"{activeKeyword}"</span></p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {articles.map((article, i) => {
              const hoursAgo = Math.round((Date.now() - new Date(article.publishedAt).getTime()) / 3600000)
              const isTrending = hoursAgo <= 12
              return (
                <div key={i} className="bg-[#111]/80 backdrop-blur-md border border-[#2a2a2a] rounded-2xl p-5 flex flex-col gap-3 hover:border-amber-500/20 transition group">
                  {/* Meta */}
                  <div className="flex items-center gap-2">
                    {isTrending && (
                      <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full">🔥 Tendencia</span>
                    )}
                    <span className="text-[11px] text-slate-500">{article.source}</span>
                    <span className="text-[11px] text-slate-600 ml-auto">{hoursAgo < 24 ? `${hoursAgo}h` : `${Math.floor(hoursAgo / 24)}d`}</span>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm font-bold text-slate-100 leading-snug line-clamp-3">{article.title}</h3>

                  {/* Description */}
                  {article.description && (
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{article.description}</p>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-2 border-t border-[#1a1a1a]">
                    {article.url && (
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-300 transition"
                      >
                        <ExternalLink size={11} /> Ver noticia
                      </a>
                    )}
                    <button
                      onClick={() => setGenerateModal(article)}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition text-xs font-bold"
                    >
                      <Sparkles size={12} /> Crear Post
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Topic suggestions */}
      {(loadingSuggestions || suggestions.length > 0) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-400" />
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">2 Topics sugeridos para tu publicidad</p>
          </div>
          {loadingSuggestions ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[0, 1].map(i => (
                <div key={i} className="h-24 rounded-xl bg-[#111] border border-[#2a2a2a] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestions.map((s, idx) => (
                <div key={idx} className="flex flex-col gap-2 p-4 rounded-xl bg-[#0d0d1a] border border-indigo-500/20 hover:border-indigo-500/40 transition">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {s.category && (
                        <span className="inline-block text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full mb-1.5">
                          {s.category}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-slate-200 leading-snug">{s.title}</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{s.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddTopic(s, idx)}
                    disabled={addingTopic === idx || addedTopics.has(idx)}
                    className={`flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-medium transition ${
                      addedTopics.has(idx)
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                    }`}
                  >
                    {addedTopics.has(idx) ? (
                      <><CheckCircle2 size={12} /> Agregado a Topics</>
                    ) : addingTopic === idx ? (
                      <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Agregando...</>
                    ) : (
                      <><Plus size={12} /> Agregar a Topics</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* No keyword selected yet */}
      {!loading && !activeKeyword && keywords.length > 0 && (
        <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-10 text-center">
          <TrendingUp size={36} className="text-amber-500/30 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Selecciona una keyword arriba</p>
          <p className="text-slate-600 text-sm mt-1">Se buscarán las noticias más recientes de ese nicho</p>
        </div>
      )}

      {/* Generate modal */}
      {generateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">¿Qué tipo de post?</h3>
              <button onClick={() => setGenerateModal(null)} className="text-slate-500 hover:text-slate-300"><X size={18} /></button>
            </div>
            <div className="bg-[#0a0a0a] rounded-lg p-3 mb-4 border border-[#222]">
              <p className="text-xs text-slate-400 line-clamp-2">{generateModal.title}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleCreatePost(generateModal, 'carousel')}
                disabled={!!generating}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[#2a2a2a] hover:border-purple-500/30 hover:bg-purple-500/5 transition disabled:opacity-50"
              >
                <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">📱</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-200">Carrusel Viral</p>
                  <p className="text-xs text-slate-500">10 slides basados en la noticia</p>
                </div>
              </button>
              <button
                onClick={() => handleCreatePost(generateModal, 'reel')}
                disabled={!!generating}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-[#2a2a2a] hover:border-pink-500/30 hover:bg-pink-500/5 transition disabled:opacity-50"
              >
                <div className="w-9 h-9 bg-pink-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🎬</span>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-slate-200">Guion de Reel</p>
                  <p className="text-xs text-slate-500">Estructura "El Problema Invisible"</p>
                </div>
              </button>
            </div>
            {generating && (
              <p className="text-center text-sm text-amber-400 mt-4 animate-pulse flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin" /> Generando contenido desde la noticia...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
