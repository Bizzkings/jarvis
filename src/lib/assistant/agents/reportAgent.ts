import type { Agent, AgentContext, AgentResponse, JarvisMetric, ReportAgentData } from '../types'

const reportAgent: Agent = {
  name: 'Report',

  canHandle(transcript: string): boolean {
    return /report|metrics|how.*we.*doing|today.*numbers|stats/.test(transcript)
  },

  async handle(_ctx: AgentContext): Promise<AgentResponse> {
    let res: Response
    try {
      res = await fetch('/api/jarvis/metrics')
    } catch {
      return { text: "I couldn't reach the metrics service right now." }
    }

    if (!res.ok) {
      return { text: "I couldn't pull today's metrics." }
    }

    const { metrics }: { metrics: JarvisMetric[] } = await res.json()

    const data: ReportAgentData = { metrics }

    if (!metrics.length) {
      return {
        text: "No metrics logged for today yet. You can add some via the Supabase dashboard.",
        data,
      }
    }

    const parts = metrics.map((m) => {
      const val =
        m.unit === 'USD'
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(m.value)
          : `${m.value}${m.unit ? ' ' + m.unit : ''}`
      return `${m.label} ${val}`
    })

    return {
      text: `Today's report: ${parts.join(', ')}.`,
      data,
    }
  },
}

export default reportAgent
