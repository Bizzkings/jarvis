export type AssistantState = 'idle' | 'wake' | 'listening' | 'processing' | 'speaking' | 'error'

export interface AgentContext {
  transcript: string
}

export interface AgentResponse {
  text: string
  data?: unknown
}

export interface Agent {
  name: string
  canHandle(transcript: string): boolean
  handle(ctx: AgentContext): Promise<AgentResponse>
}

export interface TranscriptEntry {
  id: string
  role: 'user' | 'assistant'
  text: string
  timestamp: Date
  agentName?: string
}

export interface UseVoiceRecognitionReturn {
  isSupported: boolean
  isListening: boolean
  isWakeMode: boolean
  wakeDetected: boolean
  transcript: string
  startListening(): void
  stopListening(): void
  resetTranscript(): void
  resetWakeDetected(): void
  enableWakeWord(): void
  disableWakeWord(): void
}

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean
  speak(text: string, onEnd?: () => void): void
  cancel(): void
}

export interface JarvisTask {
  id: string
  title: string
  status: 'pending' | 'done' | 'cancelled'
  priority: 'low' | 'normal' | 'high'
  created_at: string
}

export interface JarvisMetric {
  id: string
  date: string
  label: string
  value: number
  unit?: string
}

// Typed data payloads per agent — used by DataPanel
export interface TimeAgentData {
  time: string
  date: string
}

export interface WeatherAgentData {
  temp: number
  condition: string
  windspeed: number
  weathercode: number
}

export interface ReportAgentData {
  metrics: JarvisMetric[]
}

export interface TaskAgentData {
  tasks: JarvisTask[]
  total: number
  action: 'read' | 'add'
  added?: string
}
