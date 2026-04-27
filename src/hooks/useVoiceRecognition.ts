'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

const WAKE_PATTERNS = /\b(hey jarvis|ok jarvis|jarvis)\b/i

export function useVoiceRecognition() {
  const [isSupported, setIsSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isWakeMode, setIsWakeMode] = useState(false)
  const [wakeDetected, setWakeDetected] = useState(false)
  const [transcript, setTranscript] = useState('')

  const commandRef = useRef<SpeechRecognition | null>(null)
  const wakeRef = useRef<SpeechRecognition | null>(null)
  const wakeModeRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!SR) return
    setIsSupported(true)

    // ── Command recognition (one-shot, captures user's actual request) ──
    const cmd = new SR()
    cmd.continuous = false
    cmd.interimResults = false
    cmd.lang = 'en-US'
    cmd.onresult = (e: SpeechRecognitionEvent) => {
      if (mountedRef.current) setTranscript(e.results[0][0].transcript)
    }
    cmd.onend = () => { if (mountedRef.current) setIsListening(false) }
    cmd.onerror = () => { if (mountedRef.current) setIsListening(false) }
    commandRef.current = cmd

    // ── Wake word recognition (auto-restart loop) ──
    const wake = new SR()
    wake.continuous = false
    wake.interimResults = false
    wake.lang = 'en-US'
    wake.onresult = (e: SpeechRecognitionEvent) => {
      if (!mountedRef.current) return
      const text = e.results[0][0].transcript
      if (WAKE_PATTERNS.test(text)) {
        // Pause wake loop — JarvisCore will call startListening()
        wakeModeRef.current = false
        setIsWakeMode(false)
        setWakeDetected(true)
      }
    }
    wake.onend = () => {
      if (!mountedRef.current || !wakeModeRef.current) return
      setTimeout(() => {
        if (mountedRef.current && wakeModeRef.current) {
          try { wake.start() } catch {}
        }
      }, 300)
    }
    wake.onerror = () => {
      if (!mountedRef.current || !wakeModeRef.current) return
      setTimeout(() => {
        if (mountedRef.current && wakeModeRef.current) {
          try { wake.start() } catch {}
        }
      }, 1000)
    }
    wakeRef.current = wake

    return () => {
      mountedRef.current = false
      cmd.abort()
      wake.abort()
    }
  }, [])

  const startListening = useCallback(() => {
    if (!commandRef.current || isListening) return
    setTranscript('')
    setIsListening(true)
    // Delay ensures wake recognition has fully ended before command starts
    setTimeout(() => {
      if (mountedRef.current) {
        try { commandRef.current?.start() } catch {}
      }
    }, 300)
  }, [isListening])

  const stopListening = useCallback(() => {
    if (!commandRef.current || !isListening) return
    commandRef.current.stop()
  }, [isListening])

  const resetTranscript = useCallback(() => setTranscript(''), [])
  const resetWakeDetected = useCallback(() => setWakeDetected(false), [])

  const enableWakeWord = useCallback(() => {
    if (!wakeRef.current) return
    setWakeDetected(false)
    wakeModeRef.current = true
    setIsWakeMode(true)
    setTimeout(() => {
      if (mountedRef.current && wakeModeRef.current) {
        try { wakeRef.current?.start() } catch {}
      }
    }, 300)
  }, [])

  const disableWakeWord = useCallback(() => {
    wakeModeRef.current = false
    setIsWakeMode(false)
    try { wakeRef.current?.abort() } catch {}
  }, [])

  return {
    isSupported,
    isListening,
    isWakeMode,
    wakeDetected,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    resetWakeDetected,
    enableWakeWord,
    disableWakeWord,
  }
}
