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
import StatusBar from './StatusBar'
import CommandPanel from './CommandPanel'

export default function JarvisCore() {
  const [assistantState, setAssistantState] = useState<AssistantState>('idle')
  const [entries, setEntries]               = useState<TranscriptEntry[]>([])
  const [lastAgentName, setLastAgentName]   = useState<string | null>(null)
  const [lastAgentData, setLastAgentData]   = useState<unknown>(null)
  const [dataPanelVisible, setDataPanelVisible] = useState(false)
  const [alwaysListen, setAlwaysListen]     = useState(false)

  const {
    isSupported, isListening, wakeDetected,
    transcript, startListening, stopListening,
    resetTranscript, resetWakeDetected, enableWakeWord, disableWakeWord,
  } = useVoiceRecognition()
  const { speak, cancel } = useSpeechSynthesis()

  const timeoutRef      = useRef<ReturnType<typeof setTimeout> | null>(null)
  const panelTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef   = useRef(false)
  const alwaysListenRef = useRef(false)

  useEffect(() => { alwaysListenRef.current = alwaysListen }, [alwaysListen])

  useEffect(() => {
    if (!wakeDetected) return
    resetWakeDetected(); setAssistantState('listening'); startListening()
  }, [wakeDetected, resetWakeDetected, startListening])

  useEffect(() => {
    if (isListening) setAssistantState('listening')
  }, [isListening])

  useEffect(() => {
    if (isListening) timeoutRef.current = setTimeout(() => stopListening(), 10_000)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [isListening, stopListening])

  // ── Core dispatch ────────────────────────────────────────────────────────────
  const runCommand = useCallback(async (text: string) => {
    if (processingRef.current) return
    processingRef.current = true
    appendEntry({ role: 'user', text, timestamp: new Date() })
    setAssistantState('processing')

    const agent = routeCommand(text)
    if (!agent) {
      const fallback = "I didn't understand that. Try asking about the time, weather, today's report, or pending tasks."
      appendEntry({ role: 'assistant', text: fallback, agentName: 'Jarvis', timestamp: new Date() })
      setAssistantState('speaking')
      speak(fallback, () => { processingRef.current = false; returnToReady() })
      return
    }

    let response
    try { response = await agent.handle({ transcript: text }) }
    catch { response = { text: 'Something went wrong. Please try again.' } }

    appendEntry({ role: 'assistant', text: response.text, agentName: agent.name, timestamp: new Date() })

    if (response.data) {
      setLastAgentName(agent.name); setLastAgentData(response.data)
      if (panelTimeoutRef.current) clearTimeout(panelTimeoutRef.current)
      setDataPanelVisible(true)
    }

    setAssistantState('speaking')
    speak(response.text, () => {
      processingRef.current = false
      panelTimeoutRef.current = setTimeout(() => setDataPanelVisible(false), 3_000)
      returnToReady()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speak])

  useEffect(() => {
    if (!transcript || isListening || processingRef.current) return
    runCommand(transcript).then(resetTranscript)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, isListening])

  const appendEntry = useCallback((entry: Omit<TranscriptEntry, 'id'>) => {
    setEntries(prev => [...prev, { ...entry, id: crypto.randomUUID() }])
  }, [])

  const returnToReady = useCallback(() => {
    if (alwaysListenRef.current) { setAssistantState('wake'); enableWakeWord() }
    else setAssistantState('idle')
  }, [enableWakeWord])

  const handleOrbClick = useCallback(() => {
    if (assistantState === 'idle' || assistantState === 'wake') {
      disableWakeWord(); startListening(); setAssistantState('listening')
    } else if (assistantState === 'listening') {
      stopListening()
    } else if (assistantState === 'speaking') {
      cancel(); processingRef.current = false; returnToReady()
    }
  }, [assistantState, disableWakeWord, startListening, stopListening, cancel, returnToReady])

  const toggleAlwaysListen = useCallback(() => {
    if (alwaysListen) {
      setAlwaysListen(false); disableWakeWord()
      if (assistantState === 'wake') setAssistantState('idle')
    } else {
      setAlwaysListen(true); setAssistantState('wake'); enableWakeWord()
    }
  }, [alwaysListen, assistantState, enableWakeWord, disableWakeWord])

  // ── State override from CommandPanel ─────────────────────────────────────────
  const handleStateChange = useCallback((s: AssistantState) => {
    if (processingRef.current) return
    cancel()
    if (s === 'listening') {
      disableWakeWord(); startListening()
    } else {
      stopListening()
      if (alwaysListenRef.current && s === 'idle') { disableWakeWord(); setAlwaysListen(false) }
    }
    setAssistantState(s)
  }, [cancel, disableWakeWord, startListening, stopListening])

  const isBusy = assistantState === 'listening' || assistantState === 'processing' || assistantState === 'speaking'

  return (
    <div className="flex flex-col items-center gap-5 w-full z-10">

      {/* Always-listen toggle */}
      {isSupported && (
        <button
          onClick={toggleAlwaysListen}
          className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs tracking-widest uppercase transition-all duration-300 font-mono"
          style={{
            background: alwaysListen ? 'rgba(130,60,255,0.12)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${alwaysListen ? 'rgba(140,70,255,0.40)' : 'rgba(120,60,220,0.12)'}`,
            color: alwaysListen ? '#b57bff' : 'rgba(140,90,220,0.48)',
            boxShadow: alwaysListen ? '0 0 15px rgba(130,60,255,0.18)' : 'none',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{
            background: alwaysListen ? '#9d4edd' : 'rgba(120,60,200,0.28)',
            boxShadow: alwaysListen ? '0 0 6px #9d4edd' : 'none',
            animation: alwaysListen ? 'pulse-purple 1.5s ease-in-out infinite' : 'none',
          }} />
          {alwaysListen ? 'HEY JARVIS ON' : 'ENABLE HEY JARVIS'}
        </button>
      )}

      {/* Orb */}
      <JarvisOrb state={assistantState} onClick={handleOrbClick} isSupported={isSupported} />

      {/* Status bar */}
      <StatusBar state={assistantState} agentName={lastAgentName} />

      {/* Waveform */}
      <WaveformBars active={assistantState === 'speaking'} />

      {/* Data Panel */}
      <DataPanel agentName={lastAgentName} data={lastAgentData} visible={dataPanelVisible} />

      {/* Transcript */}
      <TranscriptDisplay entries={entries} />

      {/* Command panel */}
      <CommandPanel
        onCommand={cmd => runCommand(cmd).then(resetTranscript)}
        onStateChange={handleStateChange}
        currentState={assistantState}
        disabled={isBusy}
      />

    </div>
  )
}
