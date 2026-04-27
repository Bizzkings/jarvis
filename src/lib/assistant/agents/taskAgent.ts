import type { Agent, AgentContext, AgentResponse, JarvisTask, TaskAgentData } from '../types'

const ADD_PATTERN = /add.*task|new task|create.*task/

function extractTitle(transcript: string): string {
  return transcript
    .replace(/^(add\s+a?\s*task:?|new task:?|create\s+a?\s*task:?)\s*/i, '')
    .trim()
}

const taskAgent: Agent = {
  name: 'Tasks',

  canHandle(transcript: string): boolean {
    return /pending|task|waiting|add.*task|create.*task|new task|what.*need.*done|outstanding/.test(
      transcript
    )
  },

  async handle(ctx: AgentContext): Promise<AgentResponse> {
    if (ADD_PATTERN.test(ctx.transcript)) {
      return handleAddTask(ctx.transcript)
    }
    return handleReadTasks()
  },
}

async function handleAddTask(transcript: string): Promise<AgentResponse> {
  const title = extractTitle(transcript)

  if (!title) {
    return { text: "I didn't catch a task title. Try saying: add a task, then the task name." }
  }

  let res: Response
  try {
    res = await fetch('/api/jarvis/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  } catch {
    return { text: "I couldn't save the task right now. Please try again." }
  }

  if (!res.ok) {
    return { text: "Failed to add the task. Please try again." }
  }

  const { task }: { task: JarvisTask } = await res.json()

  const data: TaskAgentData = {
    tasks: [task],
    total: 1,
    action: 'add',
    added: task.title,
  }

  return {
    text: `Task added: ${task.title}.`,
    data,
  }
}

async function handleReadTasks(): Promise<AgentResponse> {
  let res: Response
  try {
    res = await fetch('/api/jarvis/tasks')
  } catch {
    return { text: "I couldn't fetch your tasks right now." }
  }

  if (!res.ok) {
    return { text: "I couldn't fetch your tasks right now." }
  }

  const { tasks, total }: { tasks: JarvisTask[]; total: number } = await res.json()

  const data: TaskAgentData = { tasks, total, action: 'read' }

  if (total === 0) {
    return { text: "All clear — no pending tasks!", data }
  }

  const names = tasks
    .slice(0, 3)
    .map((t) => t.title)
    .join(', ')

  const more = total > 3 ? ` and ${total - 3} more` : ''

  return {
    text: `You have ${total} pending task${total !== 1 ? 's' : ''}: ${names}${more}.`,
    data,
  }
}

export default taskAgent
