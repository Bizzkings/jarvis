import type { Agent, AgentContext, AgentResponse } from '../types'

// Catch-all agent — handles any question not matched by specialist agents.
// Calls /api/jarvis/ask which uses Claude + optional DuckDuckGo web search.
const generalAgent: Agent = {
  name: 'Jarvis',

  canHandle(_transcript: string): boolean {
    return true
  },

  async handle(ctx: AgentContext): Promise<AgentResponse> {
    try {
      const res = await fetch('/api/jarvis/ask', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question: ctx.transcript }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { text?: string }
        return { text: err.text ?? 'I encountered an error processing your request.' }
      }

      const data = await res.json() as { text: string }
      return { text: data.text }
    } catch {
      return { text: "I'm unable to reach my intelligence core right now. Please check your connection and try again." }
    }
  },
}

export default generalAgent
