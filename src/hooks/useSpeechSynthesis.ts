'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { UseSpeechSynthesisReturn } from '@/lib/assistant/types'

// Preferred voice names in priority order — targets deep British/US male voices
const VOICE_PREFS = [
  'Google UK English Male',
  'Arthur',           // macOS Ventura+ British male
  'Daniel',           // macOS British male
  'Google US English',
  'Aaron',            // macOS US male
  'Fred',             // macOS older US male (noticeably low)
  'Alex',             // macOS US male
]

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  // Exact name match first
  for (const name of VOICE_PREFS) {
    const v = voices.find(v => v.name === name)
    if (v) return v
  }
  // Partial match fallback
  for (const name of VOICE_PREFS) {
    const v = voices.find(v => v.name.includes(name))
    if (v) return v
  }
  // Any en-GB voice
  const gb = voices.find(v => v.lang === 'en-GB')
  if (gb) return gb
  // Any English male-sounding voice
  const male = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'))
  if (male) return male
  // Any English voice at all
  return voices.find(v => v.lang.startsWith('en'))
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const voicesRef    = useRef<SpeechSynthesisVoice[]>([])

  // Voices load asynchronously in Chrome — cache them when ready
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices() }
    load()
    window.speechSynthesis.addEventListener('voiceschanged', load)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load)
  }, [])

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    if (typeof window === 'undefined') return
    window.speechSynthesis.cancel()
    clearKeepAlive()
    setIsSpeaking(false)
  }, [clearKeepAlive])

  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

      cancel()

      const utterance   = new SpeechSynthesisUtterance(text)
      utterance.rate    = 0.90   // deliberate, unhurried
      utterance.pitch   = 0.80   // deeper, authoritative
      utterance.volume  = 1.0

      const voice = pickVoice(voicesRef.current)
      if (voice) utterance.voice = voice

      utterance.onend = () => {
        clearKeepAlive()
        setIsSpeaking(false)
        onEnd?.()
      }

      utterance.onerror = () => {
        clearKeepAlive()
        setIsSpeaking(false)
      }

      setIsSpeaking(true)

      // Chrome pauses TTS after ~15s — keep it alive
      keepAliveRef.current = setInterval(() => {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }, 10_000)

      window.speechSynthesis.speak(utterance)
    },
    [cancel, clearKeepAlive]
  )

  useEffect(() => { return () => { cancel() } }, [cancel])

  return { isSpeaking, speak, cancel }
}
