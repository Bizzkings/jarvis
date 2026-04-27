import type { Agent, AgentContext, AgentResponse, TimeAgentData } from '../types'

const timeAgent: Agent = {
  name: 'Time',

  canHandle(transcript: string): boolean {
    return /what.*time|current time|time is it|what'?s the time/.test(transcript)
  },

  async handle(_ctx: AgentContext): Promise<AgentResponse> {
    const now = new Date()
    const time = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    const date = now.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })

    const data: TimeAgentData = { time, date }

    return {
      text: `It is currently ${time} on ${date}.`,
      data,
    }
  },
}

export default timeAgent
