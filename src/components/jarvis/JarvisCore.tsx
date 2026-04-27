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
  idle:       '— STANDBY —',
  wake:       'SAY "HEY JARVIS"',
  listening:  'VOICE INPUT ACTIVE',
  processing: 'PROCESSING QUERY',
  speaking:   'TRANSMITTING',
  error:      'SYSTEM ERROR',
}

export default function JarvisCore() {
  const [assistantState, setAssistantState] = useState<AssistantState>('idle')
  const [entries, setEntries] = useState<TranscriptEntry[]>([])
  const [lastAgentName, setLastAgentName] = useState<string | null>(null)
  const [lastAgentData, setLastAgentData] = useState<unknown>(null)
  const [dataPanelVisible, setDataPanelVisible] = useState(false)
  const [alwaysListen, setAlwaysListen] = useState(false)

  const {
    isSupported, isListening, wakeDetected,
    transcript, startListening, stopListening,
    resetTranscript, resetWakeDetected, enableWakeWord, disableWakeWord,
  } = useVoiceRecognition()
  const { speak, cancel } = useSpeechSynthesis()

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)
  const alwaysListenRef = useRef(false)

  // Keep ref in sync for use inside callbacks
  useEffect(() => { alwaysListenRef.current = alwaysListen }, [alwaysListen])

  // ── Wake word detected → start command listening ──
  useEffect(() => {
    if (!wakeDetected) return
    resetWakeDetected()
    setAssistantState('listening')
    startListening()
  }, [wakeDetected, resetWakeDetected, startListening])

  // ── Sync isListening state ──
  useEffect(() => {
    if (isListening) setAssistantState('listening')
  }, [isListening])

  // ── 10-second listening timeout guard ──
  useEffect(() => {
    if (isListening) {
      timeoutRef.current = setTimeout(() => stopListening(), 10_000)
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [isListening, stopListening])

  // ── Dispatch when transcript arrives ──
  useEffect(() => {
    if (!transcript || isListening || processingRef.current) return
    processingRef.current = true

    const run = async () => {
      appendEntry({ role: 'user', text: transcript, timestamp: new Date() })
      setAssistantState('processing')

      const agent = routeCommand(transcript)

      if (!agent) {
        const fallback = "I didn't understand that. Try asking about the time, weather, today's report, or pending tasks."
        appendEntry({ role: 'assistant', text: fallback, agentName: 'Jarvis', timestamp: new Date() })
        setAssistantState('speaking')
        speak(fallback, () => {
          processingRef.current = false
          returnToReady()
        })
        resetTranscript()
        return
      }

      let response
      try {
        response = await agent.handle({ transcript })
      } catch {
        response = { text: 'Something went wrong. Please try again.' }
      }

      appendEntry({ role: 'assistant', text: response.text, agentName: agent.name, timestamp: new Date() })

      if (response.data) {
        setLastAgentName(agent.name)
        setLastAgentData(response.data)
        if (panelTimeoutRef.current) clearTimeout(panelTimeoutRef.current)
        setDataPanelVisible(true)
      }

      setAssistantState('speaking')
      speak(response.text, () => {
        processingRef.current = false
        panelTimeoutRef.current = setTimeout(() => setDataPanelVisible(false), 3_000)
        returnToReady()
      })

      resetTranscript()
    }

    run()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening])

  const appendEntry = useCallback((entry: Omit<TranscriptEntry, 'id'>) => {
    setEntries((prev) => [...prev, { ...entry, id: crypto.randomUUID() }])
  }, [])

  const returnToReady = useCallback(() => {
    if (alwaysListenRef.current) {
      setAssistantState('wake')
      enableWakeWord()
    } else {
      setAssistantState('idle')
    }
  }, [enableWakeWord])

  const handleOrbClick = useCallback(() => {
    if (assistantState === 'idle' || assistantState === 'wake') {
      disableWakeWord()
      startListening()
      setAssistantState('listening')
    } else if (assistantState === 'listening') {
      stopListening()
    } else if (assistantState === 'speaking') {
      cancel()
      processingRef.current = false
      returnToReady()
    }
  }, [assistantState, disableWakeWord, startListening, stopListening, cancel, returnToReady])

  const toggleAlwaysListen = useCallback(() => {
    if (alwaysListen) {
      setAlwaysListen(false)
      disableWakeWord()
      if (assistantState === 'wake') setAssistantState('idle')
    } else {
      setAlwaysListen(true)
      setAssistantState('wake')
      enableWakeWord()
    }
  }, [alwaysListen, assistantState, enableWakeWord, disableWakeWord])

  const statusColor =
    assistantState === 'listening'  ? '#ff2d9c' :
    assistantState === 'processing' ? '#00d4ff' :
    assistantState === 'speaking'   ? '#c77dff' :
    assistantState === 'wake'       ? '#00d4ff' :
    assistantState === 'error'      ? '#ff4444' :
    'rgba(0,180,255,0.4)'

  return (
    <div className="flex flex-col items-center gap-6 w-full z-10">

      {/* Always-listen toggle */}
      {isSupported && (
        <button
          onClick={toggleAlwaysListen}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs tracking-widest uppercase transition-all duration-300"
          style={{
            background: alwaysListen ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${alwaysListen ? 'rgba(0,212,255,0.38)' : 'rgba(0,180,255,0.1)'}`,
            color: alwaysListen ? '#00d4ff' : 'rgba(0,160,220,0.45)',
            boxShadow: alwaysListen ? '0 0 15px rgba(0,212,255,0.15)' : 'none',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: alwaysListen ? '#00d4ff' : 'rgba(0,180,255,0.25)',
              boxShadow: alwaysListen ? '0 0 6px #00d4ff' : 'none',
              animation: alwaysListen ? 'pulse-cyan 1.5s ease-in-out infinite' : 'none',
            }}
          />
          {alwaysListen ? 'HEY JARVIS ON' : 'ENABLE HEY JARVIS'}
        </button>
      )}

      {/* Orb */}
      <JarvisOrb state={assistantState} onClick={handleOrbClick} isSupported={isSupported} />

      {/* Status */}
      <p
        className="text-xs tracking-[0.3em] uppercase transition-colors duration-300"
        style={{ color: statusColor }}
      >
        {STATUS_TEXT[assistantState]}
      </p>

      {/* Waveform */}
      <WaveformBars active={assistantState === 'speaking'} />

      {/* Data Panel */}
      <DataPanel agentName={lastAgentName} data={lastAgentData} visible={dataPanelVisible} />

      {/* Transcript */}
      <TranscriptDisplay entries={entries} />
    </div>
  )
}
