import type { Agent } from './types'
import timeAgent from './agents/timeAgent'
import weatherAgent from './agents/weatherAgent'
import reportAgent from './agents/reportAgent'
import taskAgent from './agents/taskAgent'
import generalAgent from './agents/generalAgent'

// Order matters — first match wins. generalAgent is last (catch-all).
const AGENTS: Agent[] = [timeAgent, weatherAgent, reportAgent, taskAgent, generalAgent]

export function routeCommand(transcript: string): Agent {
  const normalised = transcript.toLowerCase().trim()
  for (const agent of AGENTS) {
    if (agent.canHandle(normalised)) return agent
  }
  return generalAgent
}
