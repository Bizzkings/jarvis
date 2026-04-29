import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Free DuckDuckGo Instant Answer API — no key required.
// Returns Wikipedia abstracts + direct answers for factual queries.
async function searchWeb(query: string): Promise<string> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    const res  = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return ''
    const data = await res.json() as {
      AbstractText?: string
      Answer?: string
      RelatedTopics?: { Text?: string }[]
    }

    if (data.Answer)       return data.Answer
    if (data.AbstractText) return data.AbstractText.slice(0, 800)

    // Fall back to first two related-topic snippets
    const snippets = (data.RelatedTopics ?? [])
      .map(t => t.Text)
      .filter(Boolean)
      .slice(0, 2)
      .join(' ')
    return snippets
  } catch {
    return ''
  }
}

const SYSTEM_PROMPT = `You are JARVIS — a highly intelligent, eloquent AI assistant with a confident British manner.
Answer in 1-3 spoken sentences. Be informative and precise.
Never use markdown, bullet points, or lists — this response will be read aloud.
If the user's question is conversational or creative, engage with wit and charm.
If web context is provided, use it to give accurate, up-to-date information.`

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { text: 'ANTHROPIC_API_KEY is not configured. Please add it to your environment variables.' },
      { status: 500 }
    )
  }

  let question: string
  try {
    const body = await req.json() as { question?: string }
    question = body.question?.trim() ?? ''
    if (!question) throw new Error('empty')
  } catch {
    return NextResponse.json({ text: 'No question received.' }, { status: 400 })
  }

  // Enrich with live web data for queries likely needing current information
  const needsLiveData = /news|latest|current|today|now|price|stock|score|weather|who is|what is happening/i.test(question)
  const webContext = needsLiveData ? await searchWeb(question) : ''

  const userMessage = webContext
    ? `Question: ${question}\n\nWeb search context: ${webContext}`
    : question

  try {
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const text = message.content[0].type === 'text'
      ? message.content[0].text.trim()
      : "I was unable to process that request."

    return NextResponse.json({ text })
  } catch (err) {
    console.error('[ask]', err)
    return NextResponse.json(
      { text: 'My intelligence core encountered an error. Please try again.' },
      { status: 500 }
    )
  }
}
