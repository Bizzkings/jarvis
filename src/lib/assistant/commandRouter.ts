import type { Agent } from './types'
import timeAgent from './agents/timeAgent'
import weatherAgent from './agents/weatherAgent'
import reportAgent from './agents/reportAgent'
import taskAgent from './agents/taskAgent'

// Order matters — first match wins.
// To add a new agent (mapAgent, emailAgent, etc.), append it here.
const AGENTS: Agent[] = [timeAgent, weatherAgent, reportAgent, taskAgent]

export function routeCommand(transcript: string): Agent | null {
  const normalised = transcript.toLowerCase().trim()
  for (const agent of AGENTS) {
    if (agent.canHandle(normalised)) return agent
  }
  return null
}
