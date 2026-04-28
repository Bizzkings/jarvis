'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useVoiceRecognition } from '@/hooks/useVoiceRecognition'
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis'
import { routeCommand } from '@/lib/assistant/commandRouter'
import type { AssistantState, TranscriptEntry } from '@/lib/assistant/types'
import JarvisOrb from './JarvisOrb'
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
  const [orbBottom, setOrbBottom]           = useState(0)

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

  const appendEntry = useCallback((entry: Omit<TranscriptEntry, 'id'>) => {
    setEntries(prev => [...prev, { ...entry, id: crypto.randomUUID() }])
  }, [])

  const returnToReady = useCallback(() => {
    if (alwaysListenRef.current) { setAssistantState('wake'); enableWakeWord() }
    else setAssistantState('idle')
  }, [enableWakeWord])

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

  const handleGeometry = useCallback((_cx: number, cy: number, r: number) => {
    setOrbBottom(cy + r + 18)
  }, [])

  const isBusy = assistantState === 'listening' || assistantState === 'processing' || assistantState === 'speaking'

  return (
    <>
      {/* Full-viewport canvas (z-0) */}
      <JarvisOrb
        state={assistantState}
        onClick={handleOrbClick}
        isSupported={isSupported}
        onGeometry={handleGeometry}
      />

      {/* HTML overlay (z-10) */}
      <div className="absolute inset-0 pointer-events-none z-10">

        {/* Always-listen toggle — top center, below title */}
        {isSupported && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-auto">
            <button
              onClick={toggleAlwaysListen}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs tracking-widest uppercase transition-all duration-300"
              style={{
                fontFamily: 'var(--font-orbitron)',
                background: alwaysListen ? 'rgba(0,80,140,0.35)' : 'rgba(0,20,40,0.4)',
                border: `1px solid ${alwaysListen ? 'rgba(0,200,255,0.55)' : 'rgba(0,120,180,0.3)'}`,
                color: alwaysListen ? '#c0eeff' : 'rgba(0,160,200,0.55)',
                boxShadow: alwaysListen ? '0 0 15px rgba(0,160,255,0.3)' : 'none',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{
                background: alwaysListen ? 'rgba(0,200,255,0.9)' : 'rgba(0,120,180,0.4)',
                boxShadow: alwaysListen ? '0 0 6px rgba(0,200,255,0.8)' : 'none',
                animation: alwaysListen ? 'sdot 1.5s ease-in-out infinite' : 'none',
              }} />
              {alwaysListen ? 'HEY JARVIS ON' : 'ENABLE HEY JARVIS'}
            </button>
          </div>
        )}

        {/* Status label — positioned below orb */}
        {orbBottom > 0 && (
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: orbBottom }}>
            <StatusBar state={assistantState} agentName={lastAgentName} />
          </div>
        )}

        {/* Data panel */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-44 pointer-events-none">
          <DataPanel agentName={lastAgentName} data={lastAgentData} visible={dataPanelVisible} />
        </div>

        {/* Transcript */}
        <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-xl bottom-40 pointer-events-auto px-4"
             style={{ maxHeight: 160, overflowY: 'auto' }}>
          <TranscriptDisplay entries={entries} />
        </div>

      </div>

      {/* Command panel — bottom (z-10, pointer-events:auto) */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex justify-center pointer-events-auto">
        <CommandPanel
          onCommand={cmd => runCommand(cmd).then(resetTranscript)}
          onStateChange={handleStateChange}
          currentState={assistantState}
          disabled={isBusy}
        />
      </div>
    </>
  )
}
