import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// ── In-memory response cache ──────────────────────────────────────────────
// Same question in the same server instance = free. TTL 20 min.
const responseCache = new Map<string, { text: string; ts: number }>()
const CACHE_TTL  = 20 * 60 * 1000
const CACHE_MAX  = 300

function cacheKey(q: string): string {
  return q.toLowerCase().replace(/[^\w ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 100)
}

function pruneCache() {
  if (responseCache.size < CACHE_MAX) return
  const now = Date.now()
  for (const [k, v] of responseCache) {
    if (now - v.ts > CACHE_TTL) responseCache.delete(k)
    if (responseCache.size < Math.floor(CACHE_MAX * 0.75)) break
  }
}

// ── Free web sources ──────────────────────────────────────────────────────

// DuckDuckGo Instant Answer API — free, no key required
async function fetchDdg(query: string): Promise<{ answer: string; abstract: string }> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    const res  = await fetch(url, { next: { revalidate: 300 } })
    if (!res.ok) return { answer: '', abstract: '' }
    const d = await res.json() as {
      Answer?:        string
      AbstractText?:  string
      RelatedTopics?: { Text?: string }[]
    }
    return {
      answer:   d.Answer?.trim() ?? '',
      abstract: d.AbstractText?.trim()
             ?? d.RelatedTopics?.[0]?.Text?.trim()
             ?? '',
    }
  } catch {
    return { answer: '', abstract: '' }
  }
}

// Wikipedia search — richer content for knowledge questions
async function fetchWikipedia(query: string): Promise<string> {
  try {
    const search = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`
    const sRes   = await fetch(search, { next: { revalidate: 300 } })
    if (!sRes.ok) return ''
    const sData  = await sRes.json() as { query?: { search?: { title: string }[] } }
    const title  = sData.query?.search?.[0]?.title
    if (!title) return ''

    const summary = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    const pRes    = await fetch(summary, { next: { revalidate: 300 } })
    if (!pRes.ok) return ''
    const pData   = await pRes.json() as { extract?: string }
    return pData.extract?.trim() ?? ''
  } catch {
    return ''
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function firstSentences(text: string, n: number): string {
  const matches = text.match(/[^.!?]+[.!?](?:\s|$)/g) ?? []
  const result  = matches.slice(0, n).join('').trim()
  return result.length > 20 ? result : text.slice(0, 240).trim()
}

// Questions that need Claude's reasoning — not just raw facts.
// Everything else can be answered free from DuckDuckGo/Wikipedia.
function needsClaude(q: string): boolean {
  return /\b(how|why|explain|help|should|would|could|recommend|suggest|opinion|difference between|compare|create|write|make|tell me about|what if|pros and cons|is it worth|step[s]? to|guide|tutorial)\b/i.test(q)
}

const JARVIS_SYSTEM = `You are JARVIS — a highly intelligent, eloquent AI assistant with a confident British manner.
Answer in 1-3 spoken sentences. Be informative and precise.
Never use markdown, bullet points, or lists — this response will be read aloud.
If web context is provided, use it to ensure accuracy.`

// Lazily initialised so missing API key doesn't crash on startup
let anthropic: Anthropic | null = null
function getClient(): Anthropic {
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return anthropic
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let question: string
  try {
    const body = await req.json() as { question?: string }
    question   = body.question?.trim() ?? ''
    if (!question) return NextResponse.json({ text: 'No question received.' }, { status: 400 })
  } catch {
    return NextResponse.json({ text: 'Invalid request.' }, { status: 400 })
  }

  const key = cacheKey(question)

  // ── 1. Cache hit — completely free ────────────────────────────────────
  const cached = responseCache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json({ text: cached.text })
  }

  // ── 2. Fetch free web data in parallel ───────────────────────────────
  const useWiki = /who (is|was|are|were)|what is|where is|when (did|was|is)|history of|born|died|founder|inventor|capital of/i.test(question)
  const [ddg, wiki] = await Promise.all([
    fetchDdg(question),
    useWiki ? fetchWikipedia(question) : Promise.resolve(''),
  ])

  const freeText = ddg.answer || wiki || ddg.abstract

  // ── 3. Free answer path — no Claude cost ─────────────────────────────
  // Use if: there's good free content AND the question is factual (not reasoning)
  if (freeText.length > 80 && !needsClaude(question)) {
    const text = firstSentences(freeText, 2)
    responseCache.set(key, { text, ts: Date.now() }); pruneCache()
    return NextResponse.json({ text })
  }

  // ── 4. Claude path — only for reasoning/conversational questions ──────
  if (!process.env.ANTHROPIC_API_KEY) {
    // No key: return best free answer we have, or a useful message
    if (freeText.length > 40) {
      const text = firstSentences(freeText, 2)
      responseCache.set(key, { text, ts: Date.now() }); pruneCache()
      return NextResponse.json({ text })
    }
    return NextResponse.json({
      text: 'I need an Anthropic API key to answer that. Please add ANTHROPIC_API_KEY to your environment variables.',
    })
  }

  try {
    const context    = (wiki || ddg.abstract || ddg.answer).slice(0, 600)
    const userContent = context
      ? `Question: ${question}\n\nWeb context: ${context}`
      : question

    const message = await getClient().messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system:     JARVIS_SYSTEM,
      messages:   [{ role: 'user', content: userContent }],
    })

    const text = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : 'I was unable to process that request.'

    responseCache.set(key, { text, ts: Date.now() }); pruneCache()
    return NextResponse.json({ text })
  } catch (err) {
    console.error('[ask]', err)
    // Degrade gracefully to free content if Claude errors
    if (freeText.length > 40) {
      return NextResponse.json({ text: firstSentences(freeText, 2) })
    }
    return NextResponse.json(
      { text: 'My intelligence core encountered an error. Please try again.' },
      { status: 500 }
    )
  }
}
