'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { routeCommand } from '@/lib/assistant/commandRouter'
import type { AssistantState, TranscriptEntry } from '@/lib/assistant/types'
import JarvisOrb from './JarvisOrb'
import WaveformBars from './WaveformBars'
import DataPanel from './DataPanel'
import TranscriptDisplay from './TranscriptDisplay'

const STATUS_TEXT: Record<AssistantState, string> = {
  idle: 'Say a command...',
  listening: 'Listening...',
  processing: 'Processing...',
  speaking: 'Speaking...',
  error: 'Something went wrong',
}

export default function JarvisCore() {
  const [assistantState, setAssistantState] = useState<AssistantState>('idle')
  const [entries, setEntries] = useState<TranscriptEntry[]>([])
  const [lastAgentName, setLastAgentName] = useState<string | null>(null)
  const [lastAgentData, setLastAgentData] = useState<unknown>(null)
  const [dataPanelVisible, setDataPanelVisible] = useState(false)

  const { isSupported, isListening, transcript, startListening, stopListening, resetTranscript } =
    useVoiceRecognition()
  const { speak, cancel } = useSpeechSynthesis()

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)

  const appendEntry = useCallback((entry: Omit<TranscriptEntry, 'id'>) => {
    setEntries((prev) => [
      ...prev,
      { ...entry, id: crypto.randomUUID() },
    ])
  }, [])

  // 10-second listening timeout guard
  useEffect(() => {
    if (isListening) {
      timeoutRef.current = setTimeout(() => {
        stopListening()
      }, 10_000)
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isListening, stopListening])

  // Dispatch when transcript arrives after listening ends
  useEffect(() => {
    if (!transcript || isListening || processingRef.current) return
    processingRef.current = true

    const run = async () => {
      appendEntry({ role: 'user', text: transcript, timestamp: new Date() })
      setAssistantState('processing')

      const agent = routeCommand(transcript)

      if (!agent) {
        const fallback =
          "I didn't understand that. Try asking about the time, weather, today's report, or pending tasks."
        appendEntry({ role: 'assistant', text: fallback, agentName: 'Jarvis', timestamp: new Date() })
        setAssistantState('speaking')
        speak(fallback, () => setAssistantState('idle'))
        resetTranscript()
        processingRef.current = false
        return
      }

      let response
      try {
        response = await agent.handle({ transcript })
      } catch {
        response = { text: 'Something went wrong. Please try again.' }
      }

      appendEntry({
        role: 'assistant',
        text: response.text,
        agentName: agent.name,
        timestamp: new Date(),
      })

      if (response.data) {
        setLastAgentName(agent.name)
        setLastAgentData(response.data)
        if (panelTimeoutRef.current) clearTimeout(panelTimeoutRef.current)
        setDataPanelVisible(true)
      }

      setAssistantState('speaking')
      speak(response.text, () => {
        setAssistantState('idle')
        panelTimeoutRef.current = setTimeout(() => setDataPanelVisible(false), 3_000)
      })

      resetTranscript()
      processingRef.current = false
    }

    run()
  }, [transcript, isListening, appendEntry, speak, resetTranscript])

  // Sync listening state → assistant state
  useEffect(() => {
    if (isListening) setAssistantState('listening')
  }, [isListening])

  const handleOrbClick = useCallback(() => {
    if (assistantState === 'idle') {
      startListening()
    } else if (assistantState === 'listening') {
      stopListening()
    } else if (assistantState === 'speaking') {
      cancel()
      setAssistantState('idle')
    }
  }, [assistantState, startListening, stopListening, cancel])

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Orb */}
      <JarvisOrb
        state={assistantState}
        onClick={handleOrbClick}
        isSupported={isSupported}
      />

      {/* Status */}
      <p
        className={`text-sm tracking-widest uppercase transition-colors duration-300 ${
          assistantState === 'listening'
            ? 'text-amber-400'
            : assistantState === 'processing'
            ? 'text-cyan-400'
            : assistantState === 'speaking'
            ? 'text-[#00d4ff]'
            : assistantState === 'error'
            ? 'text-red-400'
            : 'text-[#6b9dc2]'
        }`}
      >
        {STATUS_TEXT[assistantState]}
      </p>

      {/* Waveform */}
      <WaveformBars active={assistantState === 'speaking'} />

      {/* Data Panel */}
      <DataPanel
        agentName={lastAgentName}
        data={lastAgentData}
        visible={dataPanelVisible}
      />

      {/* Transcript */}
      <TranscriptDisplay entries={entries} />
    </div>
  )
}
